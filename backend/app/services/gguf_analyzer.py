"""
GGUF model analyzer — orchestrates HF client + header parser + estimators.

Flow:
  1. Fetch repo metadata from HF Hub API
  2. List GGUF files in the repo
  3. For the primary GGUF file: fetch first 15MB header, parse architecture/params
  4. For all GGUF variants: estimate memory from filename quant hint + param count
  5. Fetch real benchmark scores (or estimate from scaling laws)
  6. Assemble ModelAnalysis
"""

import logging
import re
from typing import Optional

from app.services import hf_client, benchmark_service
from app.utils.gguf_header_parser import GGUFHeaderParser, extract_model_info
from app.utils.memory_estimator import (
    estimate_memory,
    quant_from_filename,
    bpw_from_quant,
    can_run_status,
    GGUF_FILE_TYPE_MAP,
)
from app.utils.speed_estimator import estimate_speed, speed_score_0_100, task_speed_breakdown
from app.models.schemas import (
    ModelAnalysis,
    GGUFVariant,
    MemoryEstimate,
    SpeedEstimate,
    TaskSpeedBreakdown,
    BenchmarkScores,
    CapabilityScores,
    HardwareProfile,
    CanRunStatus,
)

logger = logging.getLogger(__name__)

DEFAULT_HARDWARE = HardwareProfile()


async def analyze_model(
    repo_id: str,
    hardware: Optional[HardwareProfile] = None,
    context_length: int = 8192,
    framework: str = "llama.cpp",
    use_wolfram: bool = False,
) -> ModelAnalysis:
    """
    Full model analysis pipeline.
    Returns ModelAnalysis with all fields populated.
    """
    hw = hardware or DEFAULT_HARDWARE

    # ── Step 1: HF repo metadata ───────────────────────────────────────────
    try:
        hf_info = await hf_client.get_model_info(repo_id)
    except Exception as exc:
        logger.warning("HF API failed for %s: %s", repo_id, exc)
        hf_info = {}

    card_data = hf_info.get("cardData") or {}
    card_parsed = hf_client.parse_card_data(card_data)
    tags = hf_info.get("tags", [])
    tag_info = hf_client.parse_hf_model_tags(tags)

    # ── Step 2: List GGUF files ────────────────────────────────────────────
    try:
        gguf_files = await hf_client.list_gguf_files(repo_id)
    except Exception as exc:
        logger.warning("Could not list GGUF files for %s: %s", repo_id, exc)
        gguf_files = []

    # ── Step 3: Parse GGUF header from primary file ────────────────────────
    model_info_from_gguf = {}
    primary_file = _pick_primary_gguf(gguf_files)

    if primary_file:
        header_bytes = await hf_client.fetch_gguf_header(repo_id, primary_file["filename"])
        if header_bytes:
            try:
                parser = GGUFHeaderParser(header_bytes)
                parsed = parser.parse()
                model_info_from_gguf = extract_model_info(parsed["metadata"])
                logger.info(
                    "GGUF header parsed for %s: arch=%s params=%s",
                    repo_id,
                    model_info_from_gguf.get("architecture"),
                    model_info_from_gguf.get("parameter_count"),
                )
            except Exception as exc:
                logger.warning("GGUF header parse failed: %s", exc)

    # ── Step 4: Merge metadata sources (GGUF > config.json > tags > defaults)
    config_json = hf_info.get("_config", {}) or {}
    arch        = _coalesce(model_info_from_gguf.get("architecture"), tag_info.get("architecture"), "unknown")
    param_count = _coalesce(
        model_info_from_gguf.get("parameter_count"),
        tag_info.get("parameter_count_from_tag"),
        _params_from_config(config_json),
        0,
    )
    ctx_len  = _coalesce(model_info_from_gguf.get("context_length"), _ctx_from_config(config_json), context_length)
    n_layers = _coalesce(model_info_from_gguf.get("n_layers"), config_json.get("num_hidden_layers"), 32)
    n_heads  = _coalesce(model_info_from_gguf.get("n_heads"),  config_json.get("num_attention_heads"), 32)
    n_kv     = _coalesce(model_info_from_gguf.get("n_kv_heads"), config_json.get("num_key_value_heads"), n_heads)
    head_dim = _coalesce(
        model_info_from_gguf.get("head_dim"),
        _head_dim_from_config(config_json, n_heads),
        128,
    )
    vocab_size = _coalesce(model_info_from_gguf.get("vocab_size"), config_json.get("vocab_size"), 32000)

    # Primary quant comes from GGUF metadata or filename
    quant_id   = model_info_from_gguf.get("quantization_id", -1)
    primary_quant = GGUF_FILE_TYPE_MAP.get(quant_id) or (
        quant_from_filename(primary_file["filename"]) if primary_file else "Q4_K_M"
    )

    # ── Step 5: Build GGUF variant list ───────────────────────────────────
    variants: list[GGUFVariant] = []
    for gf in gguf_files:
        fname = gf["filename"]
        quant = quant_from_filename(fname)
        bpw   = bpw_from_quant(quant)
        size_gb = gf["size_bytes"] / (1024 ** 3) if gf["size_bytes"] else (param_count * bpw / 8 / 1024**3)

        mem = estimate_memory(
            num_params=param_count or int(size_gb * 1024**3 * 8 / bpw),
            quant=quant,
            context_length=ctx_len,
            n_layers=n_layers,
            n_kv_heads=n_kv,
            head_dim=head_dim,
            framework=framework,
        )
        avail = hw.vram_gb or hw.ram_gb
        status = can_run_status(mem["total_gb"], avail)

        variants.append(
            GGUFVariant(
                filename=fname,
                quantization=quant,
                bits_per_weight=bpw,
                file_size_gb=round(size_gb, 2),
                memory_estimate=MemoryEstimate(**mem),
                can_run=CanRunStatus(status),
            )
        )

    variants.sort(key=lambda v: v.bits_per_weight, reverse=True)

    # ── Step 6: Memory + speed for primary quant ───────────────────────────
    primary_mem = estimate_memory(
        num_params=param_count,
        quant=primary_quant,
        context_length=ctx_len,
        n_layers=n_layers,
        n_kv_heads=n_kv,
        head_dim=head_dim,
        framework=framework,
    )
    primary_size_gb = (
        primary_file["size_bytes"] / (1024**3)
        if primary_file and primary_file["size_bytes"]
        else primary_mem["weights_gb"]
    )

    speed_dict = estimate_speed(
        model_size_gb=primary_mem["weights_gb"],
        hardware_profile=hw.model_dump(),
    )
    cpu_tps_mid = (speed_dict.get("cpu_tps_min", 0) + speed_dict.get("cpu_tps_max", 0)) / 2
    cpu_tasks = TaskSpeedBreakdown(**task_speed_breakdown(cpu_tps_mid))
    gpu_tasks = None
    if speed_dict.get("gpu_tps_max"):
        gpu_tps_mid = (speed_dict.get("gpu_tps_min", 0) + speed_dict.get("gpu_tps_max", 0)) / 2
        gpu_tasks = TaskSpeedBreakdown(**task_speed_breakdown(gpu_tps_mid))

    avail_ram = hw.vram_gb or hw.ram_gb
    run_status = can_run_status(primary_mem["total_gb"], avail_ram)

    # ── Step 7: Benchmarks ─────────────────────────────────────────────────
    bench_raw = await benchmark_service.fetch_benchmarks_for_model(repo_id)
    if not bench_raw:
        bench_raw = benchmark_service.estimate_benchmarks_from_size(param_count, arch)

    bench = BenchmarkScores(**{k: bench_raw.get(k) for k in BenchmarkScores.model_fields})

    # ── Step 8: Capability scores ──────────────────────────────────────────
    caps = _derive_capability_scores(bench, speed_dict, ctx_len, arch)

    # ── Step 9: Wolfram derivation (optional) ─────────────────────────────
    wolfram_text = None
    if use_wolfram:
        from app.services.wolfram_service import derive_memory_formula
        try:
            w = await derive_memory_formula(
                num_params=param_count,
                quant=primary_quant,
                context_length=ctx_len,
                n_layers=n_layers,
                n_kv_heads=n_kv,
                head_dim=head_dim,
                framework=framework,
            )
            wolfram_text = "\n".join(w["step_by_step"])
        except Exception as exc:
            logger.warning("Wolfram derivation failed: %s", exc)

    # ── Assemble ───────────────────────────────────────────────────────────
    model_name = (
        model_info_from_gguf.get("name")
        or hf_info.get("modelId", repo_id).split("/")[-1]
    )

    return ModelAnalysis(
        repo_id=repo_id,
        name=model_name or repo_id.split("/")[-1],
        architecture=arch,
        parameter_count=param_count,
        context_length=ctx_len,
        quantization=primary_quant,
        bits_per_weight=bpw_from_quant(primary_quant),
        file_size_gb=round(primary_size_gb, 2),
        n_layers=n_layers,
        n_heads=n_heads,
        n_kv_heads=n_kv,
        head_dim=head_dim,
        vocab_size=vocab_size,
        license=card_parsed.get("license", "unknown"),
        tags=tags[:20],
        gguf_variants=variants,
        memory_estimate=MemoryEstimate(**primary_mem),
        speed_estimate=SpeedEstimate(**speed_dict, cpu_tasks=cpu_tasks, gpu_tasks=gpu_tasks),
        benchmarks=bench,
        capability_scores=caps,
        can_run=CanRunStatus(run_status),
        wolfram_derivation=wolfram_text,
    )


# ── Helpers ────────────────────────────────────────────────────────────────

def _pick_primary_gguf(gguf_files: list[dict]) -> Optional[dict]:
    """
    Pick the most representative GGUF file for header parsing.
    Prefer Q4_K_M > Q5_K_M > Q8_0 > first file.
    """
    preferred = ["Q4_K_M", "Q5_K_M", "Q4_K_S", "Q8_0", "Q4_0"]
    for quant in preferred:
        for f in gguf_files:
            if quant.lower() in f["filename"].lower():
                return f
    return gguf_files[0] if gguf_files else None


def _coalesce(*values):
    for v in values:
        if v is not None and v != 0 and v != "unknown":
            return v
    return values[-1]


def _params_from_config(config: dict) -> int:
    for key in ("num_parameters", "n_params", "total_params"):
        if config.get(key):
            return int(config[key])
    hidden = config.get("hidden_size", 0)
    layers = config.get("num_hidden_layers", 0)
    if hidden and layers:
        return int(12 * layers * hidden ** 2)
    return 0


def _ctx_from_config(config: dict) -> int:
    for key in ("max_position_embeddings", "max_seq_len", "n_positions", "seq_length"):
        if config.get(key):
            return int(config[key])
    return 0


def _head_dim_from_config(config: dict, n_heads: int) -> int:
    hidden = config.get("hidden_size", 0)
    if hidden and n_heads:
        return hidden // n_heads
    return 128


def _derive_capability_scores(
    bench: BenchmarkScores,
    speed: dict,
    ctx_len: int,
    arch: str,
) -> CapabilityScores:
    def safe(v, default=50.0):
        return float(v) if v is not None else default

    coding   = safe(bench.humaneval, 50.0)
    math_s   = safe(bench.gsm8k, 45.0)
    reasoning= safe(bench.arc_challenge, 50.0)
    know     = safe(bench.mmlu, 55.0)

    creative = min((know + reasoning) / 2 * 0.9, 90.0)
    multilingual = min(know * 0.85, 85.0)

    long_ctx_score = min((ctx_len / 8192) * 50 + 30, 95.0)

    speed_s = speed_score_0_100(speed.get("cpu_tps_max", 5.0))

    instruction = min((know + coding) / 2, 90.0)

    return CapabilityScores(
        coding=round(coding, 1),
        math=round(math_s, 1),
        reasoning=round(reasoning, 1),
        creative=round(creative, 1),
        multilingual=round(multilingual, 1),
        long_context=round(long_ctx_score, 1),
        speed=round(speed_s, 1),
        instruction_following=round(instruction, 1),
    )
