"""
Memory estimation for transformer LLMs.
Formulas based on llama.cpp memory profiling and published research.
"""

from typing import Optional


# Bits per weight for common quantization formats
QUANT_BPW: dict[str, float] = {
    "F32":       32.0,
    "F16":       16.0,
    "BF16":      16.0,
    "Q8_0":       8.5,
    "Q6_K":       6.6,
    "Q5_K_M":     5.7,
    "Q5_K_S":     5.5,
    "Q5_0":       5.5,
    "Q5_1":       5.5,
    "Q4_K_M":     4.8,
    "Q4_K_S":     4.5,
    "Q4_0":       4.5,
    "Q4_1":       4.5,
    "Q3_K_L":     4.3,
    "Q3_K_M":     3.9,
    "Q3_K_S":     3.4,
    "Q2_K":       2.6,
    "IQ4_XS":     4.3,
    "IQ3_M":      3.7,
    "IQ2_XS":     2.3,
    "IQ2_XXS":    2.1,
    "IQ1_S":      1.6,
    "IQ1_M":      1.8,
}

# GGUF file_type enum to quantization name
GGUF_FILE_TYPE_MAP: dict[int, str] = {
    0:  "F32",
    1:  "F16",
    2:  "Q4_0",
    3:  "Q4_1",
    6:  "Q5_0",
    7:  "Q5_1",
    8:  "Q8_0",
    10: "Q2_K",
    11: "Q3_K_S",
    12: "Q3_K_M",
    13: "Q3_K_L",
    14: "Q4_K_S",
    15: "Q4_K_M",
    16: "Q5_K_S",
    17: "Q5_K_M",
    18: "Q6_K",
    19: "Q8_0",   # duplicate, same as 8
    28: "BF16",
}

# Framework-specific overhead (GB)
FRAMEWORK_OVERHEAD_GB: dict[str, float] = {
    "llama.cpp":    0.5,
    "ollama":       1.0,
    "lmstudio":     1.0,
    "transformers": 2.0,
    "vllm":         4.0,
    "mlx":          0.3,
    "exllamav2":    0.5,
}


def quant_from_filename(filename: str) -> str:
    """Infer quantization from GGUF filename convention."""
    name = filename.upper()
    for key in sorted(QUANT_BPW.keys(), key=len, reverse=True):
        if key in name:
            return key
    return "Q4_K_M"  # sensible default


def bpw_from_quant(quant: str) -> float:
    """Bits per weight for a given quantization string."""
    return QUANT_BPW.get(quant.upper(), 8.0)


def estimate_memory(
    num_params: int,
    quant: str,
    context_length: int = 8192,
    n_layers: int = 32,
    n_kv_heads: int = 8,
    head_dim: int = 128,
    batch_size: int = 1,
    framework: str = "llama.cpp",
    kv_cache_quant: str = "F16",
) -> dict:
    """
    Estimate VRAM/RAM required for inference.

    Weights:
        bytes = num_params × bpw / 8
    KV-cache:
        bytes = 2 × n_layers × n_kv_heads × head_dim × ctx × batch × kv_dtype_bytes
    Overhead:
        Framework-specific constant (activation buffers, scratch space, etc.)
    """
    bpw = bpw_from_quant(quant)
    weights_bytes = num_params * bpw / 8.0
    weights_gb = weights_bytes / (1024 ** 3)

    kv_bpw = bpw_from_quant(kv_cache_quant)
    kv_dtype_bytes = kv_bpw / 8.0
    kv_cache_bytes = (
        2 * n_layers * n_kv_heads * head_dim * context_length * batch_size * kv_dtype_bytes
    )
    kv_cache_gb = kv_cache_bytes / (1024 ** 3)

    overhead_gb = FRAMEWORK_OVERHEAD_GB.get(framework, 1.0)
    total_gb = weights_gb + kv_cache_gb + overhead_gb

    return {
        "weights_gb": round(weights_gb, 2),
        "kv_cache_gb": round(kv_cache_gb, 3),
        "overhead_gb": round(overhead_gb, 2),
        "total_gb": round(total_gb, 2),
        "context_length": context_length,
        "framework": framework,
    }


def estimate_memory_all_quants(
    num_params: int,
    context_length: int = 8192,
    n_layers: int = 32,
    n_kv_heads: int = 8,
    head_dim: int = 128,
    framework: str = "llama.cpp",
) -> list[dict]:
    """Return memory estimates for every standard quantization level."""
    results = []
    for quant, bpw in QUANT_BPW.items():
        est = estimate_memory(
            num_params=num_params,
            quant=quant,
            context_length=context_length,
            n_layers=n_layers,
            n_kv_heads=n_kv_heads,
            head_dim=head_dim,
            framework=framework,
        )
        results.append({"quant": quant, "bpw": bpw, **est})
    results.sort(key=lambda x: x["bits_per_weight"] if "bits_per_weight" in x else x["bpw"], reverse=True)
    return results


def can_run_status(total_gb_needed: float, available_gb: float) -> str:
    """
    Ratio-based 4-tier fit classification mirroring real llama.cpp behaviour.

    ratio = required / available

    <= 0.82  comfortable  — generous headroom, stable at any context
    <= 0.97  tight_fit    — likely works with flash-attn / mmap / reduced ctx
    <= 1.25  marginal     — partial GPU offload; degraded tok/s
    >  1.25  cannot_run   — OOM likely even with offloading
    """
    if available_gb <= 0:
        return "unknown"
    ratio = total_gb_needed / available_gb
    if ratio <= 0.82:
        return "comfortable"
    elif ratio <= 0.97:
        return "tight_fit"
    elif ratio <= 1.25:
        return "marginal"
    return "cannot_run"


def wolfram_formula_text(
    num_params: int,
    quant: str,
    context_length: int,
    n_layers: int,
    n_kv_heads: int,
    head_dim: int,
) -> str:
    """
    Generate a symbolic formula string suitable for Wolfram Alpha input.
    Example: "(7B * 4.8) / 8 / 1024^3 + 2*32*8*128*8192*2 / 1024^3 + 0.5"
    """
    bpw = bpw_from_quant(quant)
    return (
        f"(({num_params} * {bpw}) / 8 / 1024^3) + "
        f"(2 * {n_layers} * {n_kv_heads} * {head_dim} * {context_length} * 2 / 1024^3) + 0.5"
    )
