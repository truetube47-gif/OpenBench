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
_CATALOG: List[ModelCatalogEntry] = [
    ModelCatalogEntry(name="Phi-3.5 Mini 3.8B",    repo_id="bartowski/Phi-3.5-mini-instruct-GGUF",           param_count=3_821_079_552,   architecture="phi3",    n_layers=32, n_kv_heads=32, head_dim=96,  context_length=131072, tags=["fast","edge","microsoft"]),
    ModelCatalogEntry(name="Llama 3.2 3B",          repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",          param_count=3_212_749_824,   architecture="llama",   n_layers=28, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["fast","general","meta"]),
    ModelCatalogEntry(name="Gemma 3 4B",            repo_id="bartowski/gemma-3-4b-it-GGUF",                  param_count=4_300_000_000,   architecture="gemma3",  n_layers=34, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["general","google"]),
    ModelCatalogEntry(name="Mistral 7B v0.3",       repo_id="bartowski/Mistral-7B-Instruct-v0.3-GGUF",       param_count=7_241_748_480,   architecture="mistral", n_layers=32, n_kv_heads=8,  head_dim=128, context_length=32768,  tags=["fast","general"]),
    ModelCatalogEntry(name="Llama 3.1 8B",          repo_id="bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",     param_count=8_030_261_248,   architecture="llama",   n_layers=32, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["general","coding","meta"]),
    ModelCatalogEntry(name="Qwen2.5 7B",            repo_id="bartowski/Qwen2.5-7B-Instruct-GGUF",            param_count=7_615_616_000,   architecture="qwen2",   n_layers=28, n_kv_heads=4,  head_dim=128, context_length=131072, tags=["general","multilingual"]),
    ModelCatalogEntry(name="DeepSeek-R1 8B",        repo_id="bartowski/DeepSeek-R1-Distill-Llama-8B-GGUF",   param_count=8_030_261_248,   architecture="llama",   n_layers=32, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","math"]),
    ModelCatalogEntry(name="Qwen3 8B",              repo_id="bartowski/Qwen3-8B-GGUF",                       param_count=8_200_000_000,   architecture="qwen3",   n_layers=36, n_kv_heads=8,  head_dim=128, context_length=40960,  tags=["reasoning","coding"]),
    ModelCatalogEntry(name="Gemma 3 9B",            repo_id="bartowski/gemma-3-9b-it-GGUF",                  param_count=9_242_598_400,   architecture="gemma3",  n_layers=42, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["general","google"]),
    ModelCatalogEntry(name="Qwen2.5 14B",           repo_id="bartowski/Qwen2.5-14B-Instruct-GGUF",           param_count=14_770_033_664,  architecture="qwen2",   n_layers=48, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["general","multilingual"]),
    ModelCatalogEntry(name="DeepSeek-R1 14B",       repo_id="bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF",   param_count=14_770_033_664,  architecture="qwen2",   n_layers=48, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","math"]),
    ModelCatalogEntry(name="Qwen3 14B",             repo_id="bartowski/Qwen3-14B-GGUF",                      param_count=14_700_000_000,  architecture="qwen3",   n_layers=40, n_kv_heads=8,  head_dim=128, context_length=40960,  tags=["reasoning","coding"]),
    ModelCatalogEntry(name="Phi-4 14B",             repo_id="bartowski/phi-4-GGUF",                          param_count=14_659_507_200,  architecture="phi3",    n_layers=40, n_kv_heads=10, head_dim=128, context_length=16384,  tags=["coding","general","microsoft"]),
    ModelCatalogEntry(name="Gemma 3 12B",           repo_id="bartowski/gemma-3-12b-it-GGUF",                 param_count=12_000_000_000,  architecture="gemma3",  n_layers=46, n_kv_heads=4,  head_dim=256, context_length=131072, tags=["general","google"]),
    ModelCatalogEntry(name="Llama 3.3 70B",         repo_id="bartowski/Meta-Llama-3.3-70B-Instruct-GGUF",    param_count=70_553_706_496,  architecture="llama",   n_layers=80, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","coding","meta"]),
    ModelCatalogEntry(name="Qwen2.5 32B",           repo_id="bartowski/Qwen2.5-32B-Instruct-GGUF",           param_count=32_512_000_000,  architecture="qwen2",   n_layers=64, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","multilingual"]),
    ModelCatalogEntry(name="DeepSeek-R1 32B",       repo_id="bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF",   param_count=32_512_000_000,  architecture="qwen2",   n_layers=64, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","math"]),
    ModelCatalogEntry(name="Qwen3 32B",             repo_id="bartowski/Qwen3-32B-GGUF",                      param_count=32_000_000_000,  architecture="qwen3",   n_layers=64, n_kv_heads=8,  head_dim=128, context_length=40960,  tags=["reasoning"]),
    ModelCatalogEntry(name="Qwen2.5 72B",           repo_id="bartowski/Qwen2.5-72B-Instruct-GGUF",           param_count=72_706_560_000,  architecture="qwen2",   n_layers=80, n_kv_heads=8,  head_dim=128, context_length=131072, tags=["reasoning","multilingual"]),
    ModelCatalogEntry(name="Llama 3.1 405B",        repo_id="bartowski/Meta-Llama-3.1-405B-Instruct-GGUF",   param_count=405_000_000_000, architecture="llama",   n_layers=126,n_kv_heads=8,  head_dim=128, context_length=131072, tags=["frontier","meta"]),
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
# Core compatibility computation (pure, no I/O)
# ---------------------------------------------------------------------------
def compute_model_compat(model: ModelCatalogEntry, hw: HardwareProfile) -> ModelCompatibilityResult:
    vram = hw.vram_gb or 0.0
    ram  = hw.ram_gb
    warnings: list[str] = []
    cpu_only = vram == 0.0

    best_quant    = "Q4_K_M"
    best_status   = CanRunStatus.CANNOT_RUN
    best_required = 0.0
    best_tps: Optional[float] = None
    best_backend  = "llama.cpp"
    best_ctx      = 4096

    for quant, bpw in _QUANT_TIERS:
        mem = estimate_memory(
            num_params=model.param_count,
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
            if total_gb <= vram * 0.93:
                # Full GPU — comfortable
                best_quant    = quant
                best_status   = CanRunStatus.COMFORTABLE
                best_required = round(total_gb, 1)
                spd = estimate_speed(weights_gb, hw.model_dump())
                gpu_min = spd.get("gpu_tps_min", 0) or 0
                gpu_max = spd.get("gpu_tps_max", 0) or 0
                best_tps = round((gpu_min + gpu_max) / 2, 1) if gpu_max else None
                best_backend = "llama.cpp"
                best_ctx = _max_context(model.context_length, vram - weights_gb,
                                        model.n_layers, model.n_kv_heads, model.head_dim)
                break

            if weights_gb <= vram * 1.25 and best_status == CanRunStatus.CANNOT_RUN:
                # Partial GPU offload — marginal
                best_quant    = quant
                best_status   = CanRunStatus.MARGINAL
                best_required = round(total_gb, 1)
                spd = estimate_speed(weights_gb, hw.model_dump())
                gpu_min = spd.get("gpu_tps_min", 0) or 0
                gpu_max = spd.get("gpu_tps_max", 0) or 0
                # Partial offload = roughly half GPU speed
                best_tps = round((gpu_min + gpu_max) / 4, 1) if gpu_max else None
                best_backend = "llama.cpp"
                best_ctx = min(model.context_length, 16384)

        # CPU fallback (also applies when no GPU)
        if total_gb <= ram * 0.88 and best_status in (CanRunStatus.CANNOT_RUN, CanRunStatus.MARGINAL):
            cpu_status = CanRunStatus.COMFORTABLE if cpu_only else CanRunStatus.MARGINAL
            if cpu_status.value <= best_status.value or best_status == CanRunStatus.CANNOT_RUN:
                best_quant    = quant
                best_status   = cpu_status
                best_required = round(total_gb, 1)
                spd = estimate_speed(weights_gb, hw.model_dump())
                cpu_min = spd.get("cpu_tps_min", 0) or 0
                cpu_max = spd.get("cpu_tps_max", 0) or 0
                best_tps = round((cpu_min + cpu_max) / 2, 1) if cpu_max else None
                best_backend = "llama.cpp"
                best_ctx = _max_context(model.context_length, ram - weights_gb,
                                        model.n_layers, model.n_kv_heads, model.head_dim)
            break

    # Warnings
    if best_status == CanRunStatus.MARGINAL and not cpu_only:
        warnings.append("Partial GPU offload — expect ~50% of full-VRAM speed")
    if best_status == CanRunStatus.MARGINAL and cpu_only:
        warnings.append("Near RAM limit — close other applications before loading")
    if best_tps is not None and best_tps < 3:
        warnings.append("Under 3 t/s — conversation will feel very slow")
    elif best_tps is not None and best_tps < 8:
        warnings.append("Under 8 t/s — noticeable latency for real-time chat")
    if hw.cpu_name and "ryzen" in hw.cpu_name.lower() and cpu_only:
        warnings.append("CPU bottleneck: memory bandwidth limits throughput on this config")
    if best_ctx < 8192 and best_status != CanRunStatus.CANNOT_RUN:
        warnings.append(f"Context capped at {best_ctx:,} tokens due to memory constraints")

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
        expected_tps=best_tps,
        max_safe_context=best_ctx,
        recommended_backend=best_backend,
        warnings=warnings,
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
    # Sort: comfortable first, then marginal, then cannot_run; within same status sort by param_count
    _order = {CanRunStatus.COMFORTABLE: 0, CanRunStatus.MARGINAL: 1, CanRunStatus.CANNOT_RUN: 2, CanRunStatus.UNKNOWN: 3}
    results.sort(key=lambda r: (_order[r.status], r.param_count))

    comfortable = sum(1 for r in results if r.status == CanRunStatus.COMFORTABLE)
    marginal    = sum(1 for r in results if r.status == CanRunStatus.MARGINAL)
    cannot      = sum(1 for r in results if r.status == CanRunStatus.CANNOT_RUN)

    response = HardwareCheckResponse(
        hardware=hw,
        models=results,
        total=len(results),
        comfortable_count=comfortable,
        marginal_count=marginal,
        cannot_run_count=cannot,
    )
    await set_cache(cache_key, response.model_dump(), ttl=1800)
    return response
