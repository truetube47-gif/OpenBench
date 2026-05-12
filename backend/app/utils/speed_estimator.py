"""
Token-per-second estimation for LLM inference.

Core insight: LLM inference (single token, single batch) is memory-bandwidth bound,
not compute bound. Speed ≈ memory_bandwidth / bytes_read_per_token.

For each new token, ALL model weights must be read once from VRAM/RAM.
tokens/sec ≈ memory_bandwidth_GBps / model_size_GB

GPU utilization factor: ~0.85 (framework + overhead inefficiency)
CPU utilization factor: ~0.55 (OS, cache misses, NUMA effects)
"""

from typing import Optional


# Known GPU memory bandwidths in GB/s
GPU_BANDWIDTH_GBPS: dict[str, float] = {
    # NVIDIA Ada Lovelace
    "rtx 4090":         1008.0,
    "rtx 4080 super":    736.0,
    "rtx 4080":          717.0,
    "rtx 4070 ti super": 672.0,
    "rtx 4070 ti":       504.0,
    "rtx 4070 super":    504.0,
    "rtx 4070":          504.0,
    "rtx 4060 ti":       288.0,
    "rtx 4060":          272.0,
    # NVIDIA Ampere
    "rtx 3090 ti":      1008.0,
    "rtx 3090":          936.0,
    "rtx 3080 ti":       912.0,
    "rtx 3080":          760.0,
    "rtx 3070 ti":       608.0,
    "rtx 3070":          448.0,
    "rtx 3060 ti":       448.0,
    "rtx 3060":          360.0,
    # NVIDIA Data Center
    "a100 80gb":        2000.0,
    "a100 40gb":        1555.0,
    "h100 sxm":         3350.0,
    "h100 pcie":        2000.0,
    "l40s":              864.0,
    "a6000":             768.0,
    # Apple Silicon
    "m1 pro":            200.0,
    "m1 max":            400.0,
    "m1 ultra":          800.0,
    "m2 pro":            200.0,
    "m2 max":            400.0,
    "m2 ultra":          800.0,
    "m3 pro":            150.0,
    "m3 max":            300.0,
    "m3 ultra":          576.0,
    "m4 pro":            273.0,
    "m4 max":            546.0,
    # AMD
    "rx 7900 xtx":       960.0,
    "rx 7900 xt":        800.0,
    "rx 7800 xt":        624.0,
    "rx 7700 xt":        432.0,
    "rx 6900 xt":        512.0,
    "rx 6800 xt":        512.0,
}

# Typical CPU memory bandwidth by memory type (GB/s)
CPU_BANDWIDTH_GBPS: dict[str, float] = {
    "ddr4_2133": 34.0,
    "ddr4_2400": 38.0,
    "ddr4_3200": 51.0,
    "ddr4_3600": 57.0,
    "ddr5_4800": 76.0,
    "ddr5_5600": 89.0,
    "ddr5_6400": 102.0,
    "ddr5_7200": 115.0,
    "lpddr5":    68.0,
    "default":   50.0,
}

GPU_EFFICIENCY = 0.85
CPU_EFFICIENCY = 0.55


def lookup_gpu_bandwidth(gpu_name: str) -> Optional[float]:
    if not gpu_name:
        return None
    name_lower = gpu_name.lower()
    for key, bw in GPU_BANDWIDTH_GBPS.items():
        if key in name_lower or name_lower in key:
            return bw
    return None


def estimate_speed(
    model_size_gb: float,
    hardware_profile: dict,
    quant_factor: float = 1.0,  # multiplier for mixed-quant layers
) -> dict:
    """
    Returns tokens-per-second ranges for CPU and GPU inference.

    model_size_gb: size of GGUF file in GB (already accounts for quantization)
    hardware_profile: dict with keys matching HardwareProfile schema
    """
    results = {}

    cpu_bw = hardware_profile.get("cpu_memory_bandwidth_gbps", 50.0)
    # CPU: must read all weights from RAM each token
    cpu_raw_tps = (cpu_bw * CPU_EFFICIENCY) / max(model_size_gb, 0.1)
    results["cpu_tps_min"] = round(cpu_raw_tps * 0.70, 1)
    results["cpu_tps_max"] = round(cpu_raw_tps * 1.15, 1)

    gpu_bw = hardware_profile.get("gpu_memory_bandwidth_gbps")
    gpu_name = hardware_profile.get("gpu_name", "")

    if not gpu_bw and gpu_name:
        gpu_bw = lookup_gpu_bandwidth(gpu_name)

    if gpu_bw:
        gpu_raw_tps = (gpu_bw * GPU_EFFICIENCY) / max(model_size_gb, 0.1)
        results["gpu_tps_min"] = round(gpu_raw_tps * 0.70, 1)
        results["gpu_tps_max"] = round(gpu_raw_tps * 1.10, 1)

    results["bottleneck"] = "memory_bandwidth"
    return results


def speed_score_0_100(cpu_tps_max: float) -> float:
    """Map tokens/sec to a 0–100 capability score (log scale)."""
    import math
    if cpu_tps_max <= 0:
        return 0.0
    # 1 t/s → 5, 5 t/s → 40, 20 t/s → 70, 100 t/s → 95
    score = 30 * math.log10(max(cpu_tps_max, 0.1) + 1)
    return round(min(score, 100.0), 1)


HARDWARE_PRESETS: list[dict] = [
    {
        "id": "rtx4090_i9",
        "name": "RTX 4090 + Core i9",
        "category": "High-End Desktop",
        "cpu_name": "Intel Core i9-13900K",
        "cpu_threads": 32,
        "ram_gb": 64.0,
        "gpu_name": "RTX 4090",
        "vram_gb": 24.0,
        "cpu_memory_bandwidth_gbps": 76.0,
        "gpu_memory_bandwidth_gbps": 1008.0,
    },
    {
        "id": "rtx4070_r7",
        "name": "RTX 4070 + Ryzen 7",
        "category": "Mid-Range Desktop",
        "cpu_name": "AMD Ryzen 7 7700X",
        "cpu_threads": 16,
        "ram_gb": 32.0,
        "gpu_name": "RTX 4070",
        "vram_gb": 12.0,
        "cpu_memory_bandwidth_gbps": 76.0,
        "gpu_memory_bandwidth_gbps": 504.0,
    },
    {
        "id": "rtx3080_r9",
        "name": "RTX 3080 + Ryzen 9",
        "category": "Previous-Gen High-End",
        "cpu_name": "AMD Ryzen 9 5900X",
        "cpu_threads": 24,
        "ram_gb": 32.0,
        "gpu_name": "RTX 3080",
        "vram_gb": 10.0,
        "cpu_memory_bandwidth_gbps": 51.0,
        "gpu_memory_bandwidth_gbps": 760.0,
    },
    {
        "id": "m3_max",
        "name": "Apple M3 Max (36GB)",
        "category": "Apple Silicon",
        "cpu_name": "Apple M3 Max",
        "cpu_threads": 16,
        "ram_gb": 36.0,
        "gpu_name": "M3 Max",
        "vram_gb": 36.0,  # unified memory
        "cpu_memory_bandwidth_gbps": 300.0,
        "gpu_memory_bandwidth_gbps": 300.0,
    },
    {
        "id": "m2_pro",
        "name": "Apple M2 Pro (16GB)",
        "category": "Apple Silicon",
        "cpu_name": "Apple M2 Pro",
        "cpu_threads": 12,
        "ram_gb": 16.0,
        "gpu_name": "M2 Pro",
        "vram_gb": 16.0,
        "cpu_memory_bandwidth_gbps": 200.0,
        "gpu_memory_bandwidth_gbps": 200.0,
    },
    {
        "id": "gaming_laptop",
        "name": "Mid Gaming Laptop (RTX 4060)",
        "category": "Laptop",
        "cpu_name": "Intel Core i7-13700H",
        "cpu_threads": 20,
        "ram_gb": 16.0,
        "gpu_name": "RTX 4060",
        "vram_gb": 8.0,
        "cpu_memory_bandwidth_gbps": 51.0,
        "gpu_memory_bandwidth_gbps": 272.0,
    },
    {
        "id": "budget_cpu",
        "name": "Budget CPU Only (16GB RAM)",
        "category": "CPU Only",
        "cpu_name": "Generic CPU",
        "cpu_threads": 8,
        "ram_gb": 16.0,
        "gpu_name": None,
        "vram_gb": None,
        "cpu_memory_bandwidth_gbps": 40.0,
        "gpu_memory_bandwidth_gbps": None,
    },
    {
        "id": "rtx3060_i7",
        "name": "RTX 3060 + Core i7",
        "category": "Mid-Range Desktop",
        "cpu_name": "Intel Core i7-12700",
        "cpu_threads": 20,
        "ram_gb": 32.0,
        "gpu_name": "RTX 3060",
        "vram_gb": 12.0,
        "cpu_memory_bandwidth_gbps": 51.0,
        "gpu_memory_bandwidth_gbps": 360.0,
    },
    {
        "id": "m4_pro",
        "name": "Apple M4 Pro (24GB)",
        "category": "Apple Silicon",
        "cpu_name": "Apple M4 Pro",
        "cpu_threads": 14,
        "ram_gb": 24.0,
        "gpu_name": "M4 Pro",
        "vram_gb": 24.0,
        "cpu_memory_bandwidth_gbps": 273.0,
        "gpu_memory_bandwidth_gbps": 273.0,
    },
    {
        "id": "a100_server",
        "name": "A100 80GB Server",
        "category": "Data Center",
        "cpu_name": "AMD EPYC 7763",
        "cpu_threads": 128,
        "ram_gb": 512.0,
        "gpu_name": "A100 80GB",
        "vram_gb": 80.0,
        "cpu_memory_bandwidth_gbps": 204.0,
        "gpu_memory_bandwidth_gbps": 2000.0,
    },
]


TASK_RATING_LABELS: dict[str, str] = {
    "excellent": "Blazing fast — instant responses",
    "good": "Smooth & responsive",
    "acceptable": "Workable — slight pauses on long outputs",
    "slow": "Slow — patience needed",
    "unusable": "Too slow for real-time use",
}


def classify_speed(tps: float) -> str:
    """Classify a tokens/sec rate into a qualitative bucket."""
    if tps >= 40: return "excellent"
    if tps >= 20: return "good"
    if tps >= 8:  return "acceptable"
    if tps >= 2:  return "slow"
    return "unusable"


def task_speed_breakdown(tps: float) -> dict:
    """
    Return per-task qualitative speed ratings for a given tokens/sec rate.
    Chat needs ~8+ t/s for comfortable real-time feel.
    Coding benefits from faster response (auto-complete feel).
    Creative writing is batch-style but has longer outputs (feels slower).
    """
    chat     = classify_speed(tps)
    coding   = classify_speed(tps * 0.9)   # slightly longer context
    creative = classify_speed(tps * 0.75)  # long-form outputs feel slower
    return {
        "chat":        chat,
        "coding":      coding,
        "creative":    creative,
        "tps":         round(tps, 1),
        "rating":      chat,
        "description": TASK_RATING_LABELS.get(chat, chat),
    }
