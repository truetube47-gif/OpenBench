"""
POST /api/v1/hardware-check
GET  /api/v1/hardware-check/catalog

Batch hardware-compatibility check against a curated catalog of popular models.
No HuggingFace API calls — all computation is local and instant.
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter

from app.models.schemas import (
    HardwareProfile,
    CanRunStatus,
    ModelCompatibilityResult,
    HardwareCheckRequest,
    HardwareCheckResponse,
    ModelCatalogEntry,
)
from app.utils.memory_estimator import (
    estimate_memory,
    QUANT_BPW,
    can_run_status,
)
from app.utils.speed_estimator import estimate_speed
from app.core.cache import get_cache, set_cache

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Curated catalog of popular models (no HF API needed)
# ---------------------------------------------------------------------------
# moe=True  → model uses Mixture-of-Experts; active_params is used for
#              memory estimation instead of total param_count.
# ---------------------------------------------------------------------------
_CATALOG: List[ModelCatalogEntry] = [
    # ── Sub-4B / Edge ──────────────────────────────────────────────────────
    ModelCatalogEntry(name="Gemma 4 E2B",           repo_id="bartowski/gemma-4-e2b-it-GGUF",                 param_count=2_000_000_000,   architecture="gemma4",  n_layers=26, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["fast","edge","google","multimodal"]),
    ModelCatalogEntry(name="Phi-3.5 Mini 3.8B",     repo_id="bartowski/Phi-3.5-mini-instruct-GGUF",          param_count=3_821_079_552,   architecture="phi3",    n_layers=32, n_kv_heads=32, head_dim=96,  context_length=131072, tags=["fast","edge","microsoft"]),
    ModelCatalogEntry(name="Llama 3.2 3B",           repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",         param_count=3_212_749_824,   architecture="llama",   n_layers=28, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["fast","general","meta"]),
    ModelCatalogEntry(name="Gemma 3 4B",             repo_id="bartowski/gemma-3-4b-it-GGUF",                 param_count=4_300_000_000,   architecture="gemma3",  n_layers=34, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["general","google"]),
    # ── 7–9B ───────────────────────────────────────────────────────────────
    ModelCatalogEntry(name="Mistral 7B v0.3",        repo_id="bartowski/Mistral-7B-Instruct-v0.3-GGUF",      param_count=7_241_748_480,   architecture="mistral", n_layers=32, n_kv_heads=8,  head_dim=128, context_length=32768,  tags=["fast","general"]),
    ModelCatalogEntry(name="Llama 3.1 8B",           repo_id="bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",    param_count=8_030_261_248,   architecture="llama",   n_layers=32, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["general","coding","meta"]),
    ModelCatalogEntry(name="Qwen2.5 7B",             repo_id="bartowski/Qwen2.5-7B-Instruct-GGUF",           param_count=7_615_616_000,   architecture="qwen2",   n_layers=28, n_kv_heads=4,  head_dim=128, context_length=131072, tags=["general","multilingual"]),
    ModelCatalogEntry(name="DeepSeek-R1 8B",         repo_id="bartowski/DeepSeek-R1-Distill-Llama-8B-GGUF",  param_count=8_030_261_248,   architecture="llama",   n_layers=32, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","math"]),
    ModelCatalogEntry(name="Qwen3 8B",               repo_id="bartowski/Qwen3-8B-GGUF",                      param_count=8_200_000_000,   architecture="qwen3",   n_layers=36, n_kv_heads=8,  head_dim=128, context_length=40960,  tags=["reasoning","coding"]),
    ModelCatalogEntry(name="Gemma 3 9B",             repo_id="bartowski/gemma-3-9b-it-GGUF",                 param_count=9_242_598_400,   architecture="gemma3",  n_layers=42, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["general","google"]),
    # ── 12–14B ─────────────────────────────────────────────────────────────
    ModelCatalogEntry(name="Gemma 3 12B",            repo_id="bartowski/gemma-3-12b-it-GGUF",                param_count=12_000_000_000,  architecture="gemma3",  n_layers=46, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["general","google"]),
    ModelCatalogEntry(name="Qwen2.5 14B",            repo_id="bartowski/Qwen2.5-14B-Instruct-GGUF",          param_count=14_770_033_664,  architecture="qwen2",   n_layers=48, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["general","multilingual"]),
    ModelCatalogEntry(name="DeepSeek-R1 14B",        repo_id="bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF",  param_count=14_770_033_664,  architecture="qwen2",   n_layers=48, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","math"]),
    ModelCatalogEntry(name="Qwen3 14B",              repo_id="bartowski/Qwen3-14B-GGUF",                     param_count=14_700_000_000,  architecture="qwen3",   n_layers=40, n_kv_heads=8,  head_dim=128, context_length=40960,  tags=["reasoning","coding"]),
    ModelCatalogEntry(name="Phi-4 14B",              repo_id="bartowski/phi-4-GGUF",                         param_count=14_659_507_200,  architecture="phi3",    n_layers=40, n_kv_heads=10, head_dim=128, context_length=16384,  tags=["coding","general","microsoft"]),
    # ── 20–27B ─────────────────────────────────────────────────────────────
    ModelCatalogEntry(name="GPT-OSS 20B",            repo_id="bartowski/GPT-OSS-20B-GGUF",                   param_count=20_000_000_000,  architecture="llama",   n_layers=48, n_kv_heads=8,  head_dim=128, context_length=32768,  tags=["general","coding","openai"]),
    ModelCatalogEntry(name="Gemma 3 27B",            repo_id="bartowski/gemma-3-27b-it-GGUF",                param_count=27_227_128_320,  architecture="gemma3",  n_layers=62, n_kv_heads=16, head_dim=128, context_length=131072, tags=["reasoning","general","google"]),
    ModelCatalogEntry(name="Gemma 4 27B",            repo_id="bartowski/gemma-4-27b-it-GGUF",                param_count=27_000_000_000,  architecture="gemma4",  n_layers=62, n_kv_heads=16, head_dim=128, context_length=131072, tags=["reasoning","general","google","multimodal"]),
    # ── 32–35B ─────────────────────────────────────────────────────────────
    ModelCatalogEntry(name="Qwen2.5 32B",            repo_id="bartowski/Qwen2.5-32B-Instruct-GGUF",          param_count=32_512_000_000,  architecture="qwen2",   n_layers=64, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","multilingual"]),
    ModelCatalogEntry(name="DeepSeek-R1 32B",        repo_id="bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF",  param_count=32_512_000_000,  architecture="qwen2",   n_layers=64, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","math"]),
    ModelCatalogEntry(name="Qwen3 32B",              repo_id="bartowski/Qwen3-32B-GGUF",                     param_count=32_000_000_000,  architecture="qwen3",   n_layers=64, n_kv_heads=8,  head_dim=128, context_length=40960,  tags=["reasoning"]),
    # ── 70–72B ─────────────────────────────────────────────────────────────
    ModelCatalogEntry(name="Llama 3.3 70B",          repo_id="bartowski/Meta-Llama-3.3-70B-Instruct-GGUF",   param_count=70_553_706_496,  architecture="llama",   n_layers=80, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","coding","meta"]),
    ModelCatalogEntry(name="Qwen2.5 72B",            repo_id="bartowski/Qwen2.5-72B-Instruct-GGUF",          param_count=72_706_560_000,  architecture="qwen2",   n_layers=80, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","multilingual"]),
    # ── MoE (active-param aware) ────────────────────────────────────────────
    ModelCatalogEntry(name="DeepSeek-R1 671B (MoE)", repo_id="bartowski/DeepSeek-R1-GGUF",                   param_count=671_000_000_000, architecture="deepseek_moe", n_layers=61, n_kv_heads=128, head_dim=128, context_length=163840, tags=["reasoning","math","moe","frontier"]),
    ModelCatalogEntry(name="Mixtral 8x7B (MoE)",     repo_id="bartowski/Mixtral-8x7B-Instruct-v0.1-GGUF",   param_count=46_702_792_704,  architecture="mixtral_moe",   n_layers=32, n_kv_heads=8,  head_dim=128, context_length=32768,  tags=["fast","general","moe","mistral"]),
    ModelCatalogEntry(name="Qwen3 235B A22B (MoE)",  repo_id="bartowski/Qwen3-235B-A22B-GGUF",              param_count=235_000_000_000, architecture="qwen3_moe",    n_layers=94, n_kv_heads=4,  head_dim=128, context_length=131072, tags=["reasoning","moe","frontier"]),
    # ── Frontier ───────────────────────────────────────────────────────────
    ModelCatalogEntry(name="Llama 3.1 405B",         repo_id="bartowski/Meta-Llama-3.1-405B-Instruct-GGUF",  param_count=405_000_000_000, architecture="llama",   n_layers=126,n_kv_heads=8,  head_dim=128, context_length=131072, tags=["frontier","meta"]),
]

# Quant tiers ordered best→worst quality
_QUANT_TIERS = [
    ("Q8_0",    8.5),
    ("Q6_K",    6.6),
    ("Q5_K_M",  5.7),
    ("Q4_K_M",  4.8),
    ("Q4_K_S",  4.5),
    ("Q3_K_M",  3.9),
    ("Q2_K",    2.6),
    ("IQ2_XS",  2.3),
    ("IQ1_S",   1.6),
]


# ---------------------------------------------------------------------------
# Tier thresholds  (ratio = required_gb / available_gb)
# ---------------------------------------------------------------------------
_COMFORTABLE_RATIO = 0.82   # generous headroom
_TIGHT_FIT_RATIO   = 0.97   # works with flash-attn / mmap / reduced ctx
_MARGINAL_RATIO    = 1.25   # partial offload; degraded speed
# > 1.25 → CANNOT_RUN

# Status sort order (lower = better) for comparisons
_STATUS_ORDER = {
    CanRunStatus.COMFORTABLE: 0,
    CanRunStatus.TIGHT_FIT:   1,
    CanRunStatus.MARGINAL:    2,
    CanRunStatus.CANNOT_RUN:  3,
    CanRunStatus.UNKNOWN:     4,
}


def _ratio_to_status(ratio: float) -> CanRunStatus:
    if ratio <= _COMFORTABLE_RATIO:
        return CanRunStatus.COMFORTABLE
    if ratio <= _TIGHT_FIT_RATIO:
        return CanRunStatus.TIGHT_FIT
    if ratio <= _MARGINAL_RATIO:
        return CanRunStatus.MARGINAL
    return CanRunStatus.CANNOT_RUN


def _moe_active_params(model: ModelCatalogEntry) -> int:
    """For MoE architectures return estimated active-parameter count."""
    arch = model.architecture.lower()
    if "moe" not in arch:
        return model.param_count
    if "deepseek_moe" in arch:
        # DeepSeek-R1: ~37B active out of 671B
        return int(model.param_count * 0.055)
    if "mixtral_moe" in arch:
        # Mixtral 8x7B: 2 of 8 experts active ≈ 12.9B
        return int(model.param_count * 0.28)
    if "qwen3_moe" in arch:
        # Qwen3-235B-A22B: 22B active
        return int(model.param_count * 0.094)
    return int(model.param_count * 0.25)  # conservative default


def _optimization_hints(
    status: CanRunStatus,
    model: ModelCatalogEntry,
    quant: str,
    vram: float,
    required_gb: float,
    best_ctx: int,
) -> list[str]:
    """Generate actionable optimization hints for tight-fit and marginal cases."""
    hints: list[str] = []
    if status not in (CanRunStatus.TIGHT_FIT, CanRunStatus.MARGINAL):
        return hints

    if status == CanRunStatus.TIGHT_FIT:
        hints.append("Enable Flash Attention 2 (--flash-attn) to reduce KV-cache VRAM")
        hints.append("Use mmap loading to avoid peak-allocation spikes")
        if best_ctx > 8192:
            hints.append(f"Reduce context to 8k (currently capped at {best_ctx:,}) for safer loading")
        if quant in ("Q8_0", "Q6_K"):
            hints.append(f"Try Q5_K_M instead of {quant} to free ~1–2 GB with minimal quality loss")
        if "moe" in model.architecture.lower():
            hints.append("MoE model: only active experts load to GPU — actual VRAM may be lower")
        if "gemma" in model.architecture.lower():
            hints.append("Gemma uses large head_dim=256 — KV cache is heavier than Llama equivalents")

    if status == CanRunStatus.MARGINAL:
        hints.append("Partial GPU offload via --n-gpu-layers; start with 50% of layers")
        hints.append("Limit context to 4k–8k to avoid RAM spilling")
        if vram > 0:
            offload_layers = int(model.n_layers * (vram / required_gb) * 0.85)
            hints.append(f"Suggested --n-gpu-layers {offload_layers} for your {vram:.0f} GB VRAM")
        hints.append("Use Ollama or llama.cpp — they handle mixed CPU/GPU offload best")

    return hints


# ---------------------------------------------------------------------------
# Core compatibility computation (pure, no I/O)
# ---------------------------------------------------------------------------
def compute_model_compat(model: ModelCatalogEntry, hw: HardwareProfile) -> ModelCompatibilityResult:
    vram     = hw.vram_gb or 0.0
    ram      = hw.ram_gb
    warnings: list[str] = []
    cpu_only = vram == 0.0
    is_moe   = "moe" in model.architecture.lower()

    # MoE models: use active-parameter count for memory estimation
    eff_params = _moe_active_params(model)

    best_quant    = "Q4_K_M"
    best_status   = CanRunStatus.CANNOT_RUN
    best_required = 0.0
    best_ratio    = 99.0
    best_tps: Optional[float] = None
    best_backend  = "llama.cpp"
    best_ctx      = 4096

    for quant, bpw in _QUANT_TIERS:
        mem = estimate_memory(
            num_params=eff_params,
            quant=quant,
            context_length=min(model.context_length, 8192),
            n_layers=model.n_layers,
            n_kv_heads=model.n_kv_heads,
            head_dim=model.head_dim,
            framework="llama.cpp",
        )
        weights_gb = mem["weights_gb"]
        total_gb   = mem["total_gb"]

        if not cpu_only:
            ratio = total_gb / vram if vram > 0 else 99.0
            gpu_status = _ratio_to_status(ratio)

            if _STATUS_ORDER[gpu_status] < _STATUS_ORDER[best_status]:
                best_quant    = quant
                best_status   = gpu_status
                best_required = round(total_gb, 1)
                best_ratio    = round(ratio, 3)
                spd = estimate_speed(weights_gb, hw.model_dump())
                gpu_min = spd.get("gpu_tps_min", 0) or 0
                gpu_max = spd.get("gpu_tps_max", 0) or 0
                if gpu_status == CanRunStatus.MARGINAL:
                    best_tps = round((gpu_min + gpu_max) / 4, 1) if gpu_max else None
                else:
                    best_tps = round((gpu_min + gpu_max) / 2, 1) if gpu_max else None
                best_backend = "llama.cpp"
                free_gb = max(vram - weights_gb, 0)
                best_ctx = _max_context(model.context_length, free_gb,
                                        model.n_layers, model.n_kv_heads, model.head_dim)

            if best_status == CanRunStatus.COMFORTABLE:
                break  # can't do better than comfortable

        # CPU path (also used when no GPU or GPU can't fit)
        if best_status in (CanRunStatus.CANNOT_RUN,):
            cpu_ratio  = total_gb / ram if ram > 0 else 99.0
            cpu_status = _ratio_to_status(cpu_ratio)
            # CPU is inherently at most TIGHT_FIT (no unified-memory exception)
            if cpu_only:
                effective_cpu_status = cpu_status
            else:
                # Mixed: cap at MARGINAL — CPU fallback when GPU can't fit
                effective_cpu_status = CanRunStatus.MARGINAL if cpu_status != CanRunStatus.CANNOT_RUN else CanRunStatus.CANNOT_RUN

            if _STATUS_ORDER[effective_cpu_status] < _STATUS_ORDER[best_status]:
                best_quant    = quant
                best_status   = effective_cpu_status
                best_required = round(total_gb, 1)
                best_ratio    = round(cpu_ratio, 3)
                spd = estimate_speed(weights_gb, hw.model_dump())
                cpu_min = spd.get("cpu_tps_min", 0) or 0
                cpu_max = spd.get("cpu_tps_max", 0) or 0
                best_tps = round((cpu_min + cpu_max) / 2, 1) if cpu_max else None
                best_backend = "llama.cpp"
                best_ctx = _max_context(model.context_length, ram - weights_gb,
                                        model.n_layers, model.n_kv_heads, model.head_dim)
            if effective_cpu_status != CanRunStatus.CANNOT_RUN:
                break

    # ── Warnings ────────────────────────────────────────────────────────────
    if best_status == CanRunStatus.TIGHT_FIT:
        warnings.append("Tight fit — stable with Flash Attention + reduced context")
    if best_status == CanRunStatus.MARGINAL and not cpu_only:
        warnings.append("Partial GPU offload — expect ~40–60% of full-VRAM speed")
    if best_status == CanRunStatus.MARGINAL and cpu_only:
        warnings.append("Near RAM limit — close all other applications before loading")
    if best_tps is not None and best_tps < 3:
        warnings.append("Under 3 t/s — conversation will feel very slow")
    elif best_tps is not None and best_tps < 8:
        warnings.append("Under 8 t/s — noticeable latency for real-time chat")
    if hw.cpu_name and "ryzen" in hw.cpu_name.lower() and cpu_only:
        warnings.append("CPU bottleneck: memory bandwidth limits throughput on this config")
    if best_ctx < 8192 and best_status != CanRunStatus.CANNOT_RUN:
        warnings.append(f"Context capped at {best_ctx:,} tokens due to memory constraints")
    if is_moe:
        warnings.append("MoE model: memory estimate uses active-parameter count only")
    # Context sensitivity tiers
    if best_status not in (CanRunStatus.CANNOT_RUN, CanRunStatus.UNKNOWN) and model.context_length > 32768:
        ctx_mem_32k  = estimate_memory(eff_params, best_quant, 32768,  model.n_layers, model.n_kv_heads, model.head_dim)["total_gb"]
        ctx_mem_128k = estimate_memory(eff_params, best_quant, 131072, model.n_layers, model.n_kv_heads, model.head_dim)["total_gb"]
        avail = vram if not cpu_only else ram
        if ctx_mem_128k / avail > _MARGINAL_RATIO:
            warnings.append("128k context: OOM likely — cap at 8k–32k for this hardware")
        elif ctx_mem_128k / avail > _TIGHT_FIT_RATIO:
            warnings.append("128k context: tight fit — Flash Attention strongly recommended")
        if ctx_mem_32k / avail > _TIGHT_FIT_RATIO:
            warnings.append("32k context: marginal — 8k context is the safe default")

    # ── Optimization hints ──────────────────────────────────────────────────
    hints = _optimization_hints(best_status, model, best_quant, vram, best_required, best_ctx)

    return ModelCompatibilityResult(
        name=model.name,
        repo_id=model.repo_id,
        param_count=model.param_count,
        architecture=model.architecture,
        tags=model.tags,
        recommended_quant=best_quant,
        status=best_status,
        required_gb=best_required,
        available_gb=round(max(vram, ram), 1),
        fit_ratio=best_ratio,
        expected_tps=best_tps,
        max_safe_context=best_ctx,
        recommended_backend=best_backend,
        warnings=warnings,
        optimization_hints=hints,
    )


def _max_context(model_ctx: int, free_gb: float,
                 n_layers: int, n_kv_heads: int, head_dim: int) -> int:
    """Estimate the maximum context that fits in the remaining free memory."""
    if free_gb <= 0:
        return 4096
    # KV cache bytes per token ≈ 2 * n_layers * n_kv_heads * head_dim * 2 (fp16)
    kv_bytes_per_token = 2 * n_layers * n_kv_heads * head_dim * 2
    max_tokens = int((free_gb * 1024 ** 3) / kv_bytes_per_token)
    # Round down to nearest power of 2 in the 4096–131072 range
    for ctx in [131072, 65536, 32768, 16384, 8192, 4096]:
        if max_tokens >= ctx:
            return min(ctx, model_ctx)
    return 4096


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/catalog", response_model=list[ModelCatalogEntry])
async def get_catalog():
    """Return the full model catalog (names, params, architectures, tags)."""
    return _CATALOG


@router.post("", response_model=HardwareCheckResponse)
async def hardware_check(req: HardwareCheckRequest):
    """
    Instant batch hardware-compatibility check against the built-in model catalog.
    No HuggingFace API calls — all computation is local.
    """
    hw = req.hardware_profile
    cache_key = f"hwcheck:{hw.model_dump_json()}"

    cached = await get_cache(cache_key)
    if cached:
        return HardwareCheckResponse(**cached)

    results = [compute_model_compat(m, hw) for m in _CATALOG]
    # Sort by tier (comfortable → tight_fit → marginal → cannot_run), then param_count
    results.sort(key=lambda r: (_STATUS_ORDER.get(r.status, 9), r.param_count))

    comfortable = sum(1 for r in results if r.status == CanRunStatus.COMFORTABLE)
    tight_fit   = sum(1 for r in results if r.status == CanRunStatus.TIGHT_FIT)
    marginal    = sum(1 for r in results if r.status == CanRunStatus.MARGINAL)
    cannot      = sum(1 for r in results if r.status == CanRunStatus.CANNOT_RUN)

    response = HardwareCheckResponse(
        hardware=hw,
        models=results,
        total=len(results),
        comfortable_count=comfortable,
        tight_fit_count=tight_fit,
        marginal_count=marginal,
        cannot_run_count=cannot,
    )
    await set_cache(cache_key, response.model_dump(), ttl=1800)
    return response
