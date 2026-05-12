#!/usr/bin/env python3
"""
Realistic test for GPT-OSS 20B on VRAMfit
Compares GPT-OSS 20B against similar 14-20B models on various hardware configs
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.models.schemas import HardwareProfile, CompareRequest
from app.routers.hardware_check import compute_model_compat, _CATALOG
from app.services.gguf_analyzer import analyze_model
from app.services.comparator import compare


def get_gpt_oss_20b():
    """Get GPT-OSS 20B catalog entry."""
    for model in _CATALOG:
        if "gpt-oss-20b" in model.repo_id.lower():
            return model
    raise ValueError("GPT-OSS 20B not found in catalog")


def get_similar_models():
    """Get 14-20B parameter models for comparison."""
    models = []
    for model in _CATALOG:
        if 14_000_000_000 <= model.param_count <= 20_000_000_000:
            models.append(model)
    return sorted(models, key=lambda x: x.param_count)


# Hardware profiles to test
HARDWARE_PROFILES = {
    "RTX 3060 12GB": HardwareProfile(
        cpu_name="AMD Ryzen 5 5600X",
        cpu_threads=12,
        ram_gb=32.0,
        gpu_name="NVIDIA RTX 3060",
        vram_gb=12.0,
        cpu_memory_bandwidth_gbps=51.2,
        gpu_memory_bandwidth_gbps=360.0,
    ),
    "RTX 4060 Ti 16GB": HardwareProfile(
        cpu_name="Intel Core i5-13600K",
        cpu_threads=20,
        ram_gb=32.0,
        gpu_name="NVIDIA RTX 4060 Ti 16GB",
        vram_gb=16.0,
        cpu_memory_bandwidth_gbps=76.8,
        gpu_memory_bandwidth_gbps=288.0,
    ),
    "RTX 4090 24GB": HardwareProfile(
        cpu_name="AMD Ryzen 9 7950X",
        cpu_threads=32,
        ram_gb=64.0,
        gpu_name="NVIDIA RTX 4090",
        vram_gb=24.0,
        cpu_memory_bandwidth_gbps=83.2,
        gpu_memory_bandwidth_gbps=1008.0,
    ),
    "CPU Only 32GB": HardwareProfile(
        cpu_name="AMD Ryzen 7 7800X3D",
        cpu_threads=16,
        ram_gb=32.0,
        gpu_name=None,
        vram_gb=None,
        cpu_memory_bandwidth_gbps=83.2,
        gpu_memory_bandwidth_gbps=None,
    ),
    "MacBook Pro M3 Pro 18GB": HardwareProfile(
        cpu_name="Apple M3 Pro",
        cpu_threads=12,
        ram_gb=18.0,
        gpu_name="Apple M3 Pro GPU",
        vram_gb=18.0,  # Unified memory
        cpu_memory_bandwidth_gbps=150.0,
        gpu_memory_bandwidth_gbps=150.0,
    ),
}


def print_header(title):
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")


def print_model_compat(model, hw_name, hw_profile, result):
    status_emoji = {
        "comfortable": "✅",
        "marginal": "⚠️",
        "cannot_run": "❌",
        "unknown": "❓",
    }.get(result.status.value, "❓")
    
    print(f"\n  {status_emoji} {model.name} on {hw_name}")
    print(f"     Parameters: {model.param_count:,} ({model.param_count/1e9:.1f}B)")
    print(f"     Status: {result.status.value.upper()}")
    print(f"     Recommended Quant: {result.recommended_quant}")
    print(f"     Required VRAM: {result.required_gb:.1f} GB (available: {result.available_gb:.1f} GB)")
    if result.expected_tps:
        print(f"     Expected Speed: ~{result.expected_tps:.1f} tok/s")
    if result.warnings:
        for warning in result.warnings:
            print(f"     ⚠️  {warning}")


async def test_hardware_compatibility():
    """Test GPT-OSS 20B compatibility across different hardware."""
    print_header("GPT-OSS 20B Hardware Compatibility Test")
    
    gpt_oss = get_gpt_oss_20b()
    print(f"\nModel: {gpt_oss.name}")
    print(f"Repo: {gpt_oss.repo_id}")
    print(f"Parameters: {gpt_oss.param_count:,} ({gpt_oss.param_count/1e9:.1f}B)")
    print(f"Architecture: {gpt_oss.architecture}")
    print(f"Context Length: {gpt_oss.context_length:,}")
    
    print("\n" + "-" * 70)
    print("Hardware Compatibility Results:")
    print("-" * 70)
    
    for hw_name, hw_profile in HARDWARE_PROFILES.items():
        result = compute_model_compat(gpt_oss, hw_profile)
        print_model_compat(gpt_oss, hw_name, hw_profile, result)


async def test_comparison():
    """Compare GPT-OSS 20B with similar-sized models."""
    print_header("GPT-OSS 20B vs Similar Models Comparison")
    
    similar = get_similar_models()
    gpt_oss = get_gpt_oss_20b()
    
    print(f"\nModels in comparison ({len(similar)} total):")
    for m in similar:
        marker = "👉" if "gpt-oss" in m.repo_id.lower() else "  "
        print(f"  {marker} {m.name}: {m.param_count/1e9:.1f}B params, {m.architecture}")
    
    # Test on RTX 4090 (high-end) and RTX 3060 (mid-range)
    test_hardware = [
        ("RTX 4090 24GB", HARDWARE_PROFILES["RTX 4090 24GB"]),
        ("RTX 3060 12GB", HARDWARE_PROFILES["RTX 3060 12GB"]),
    ]
    
    for hw_name, hw in test_hardware:
        print(f"\n{'=' * 50}")
        print(f"  Hardware: {hw_name}")
        print(f"{'=' * 50}")
        
        # Compare GPT-OSS 20B vs each similar model
        for competitor in similar:
            if competitor.repo_id == gpt_oss.repo_id:
                continue
                
            print(f"\n  📊 {gpt_oss.name} vs {competitor.name}")
            
            # Get compatibility results
            gpt_result = compute_model_compat(gpt_oss, hw)
            comp_result = compute_model_compat(competitor, hw)
            
            print(f"     GPT-OSS 20B: {gpt_result.status.value}, {gpt_result.recommended_quant}, {gpt_result.required_gb:.1f}GB")
            print(f"     {competitor.name}: {comp_result.status.value}, {comp_result.recommended_quant}, {comp_result.required_gb:.1f}GB")
            
            # Determine winner for this hardware
            if gpt_result.status.value == "cannot_run" and comp_result.status.value != "cannot_run":
                print(f"     🏆 Winner: {competitor.name} (runs on this hardware)")
            elif comp_result.status.value == "cannot_run" and gpt_result.status.value != "cannot_run":
                print(f"     🏆 Winner: GPT-OSS 20B (runs on this hardware)")
            elif gpt_result.status.value == "comfortable" and comp_result.status.value != "comfortable":
                print(f"     🏆 Winner: GPT-OSS 20B (comfortable fit)")
            elif comp_result.status.value == "comfortable" and gpt_result.status.value != "comfortable":
                print(f"     🏆 Winner: {competitor.name} (comfortable fit)")
            else:
                # Both run, compare by parameter efficiency
                gpt_eff = gpt_oss.param_count / gpt_result.required_gb
                comp_eff = competitor.param_count / comp_result.required_gb
                if gpt_eff > comp_eff:
                    print(f"     🏆 Winner: GPT-OSS 20B (better param/VRAM ratio: {gpt_eff/1e9:.2f}B/GB)")
                else:
                    print(f"     🏆 Winner: {competitor.name} (better param/VRAM ratio: {comp_eff/1e9:.2f}B/GB)")


async def test_quantization_ladder():
    """Show quantization ladder for GPT-OSS 20B."""
    print_header("GPT-OSS 20B Quantization Ladder")
    
    gpt_oss = get_gpt_oss_20b()
    hw = HARDWARE_PROFILES["RTX 4090 24GB"]
    
    from app.utils.memory_estimator import estimate_memory, can_run_status, bpw_from_quant
    
    quants = ["Q8_0", "Q6_K", "Q5_K_M", "Q4_K_M", "Q4_K_S", "Q3_K_M", "Q2_K"]
    
    print(f"\n  Model: {gpt_oss.name} ({gpt_oss.param_count/1e9:.1f}B parameters)")
    print(f"  Hardware: RTX 4090 24GB")
    print(f"\n  {'Quant':<10} {'Bits':<6} {'Weights':<10} {'KV Cache':<10} {'Overhead':<10} {'Total VRAM':<12} {'Status':<15}")
    print(f"  {'-'*70}")
    
    for quant in quants:
        bpw = bpw_from_quant(quant)
        mem = estimate_memory(
            num_params=gpt_oss.param_count,
            quant=quant,
            context_length=8192,
            n_layers=gpt_oss.n_layers,
            n_kv_heads=gpt_oss.n_kv_heads,
            head_dim=gpt_oss.head_dim,
            framework="llama.cpp",
        )
        status = can_run_status(mem["total_gb"], hw.vram_gb)
        
        status_str = {
            "comfortable": "✅ Comfortable",
            "marginal": "⚠️ Marginal",
            "cannot_run": "❌ Won't fit",
        }.get(status, status)
        
        print(f"  {quant:<10} {bpw:<6.1f} {mem['weights_gb']:<10.2f} {mem['kv_cache_gb']:<10.2f} {mem['overhead_gb']:<10.2f} {mem['total_gb']:<12.2f} {status_str:<15}")


async def test_api_endpoints_simulation():
    """Simulate what the API endpoints would return."""
    print_header("API Endpoint Simulation")
    
    gpt_oss = get_gpt_oss_20b()
    hw = HARDWARE_PROFILES["RTX 4090 24GB"]
    
    print("\n  1. POST /api/v1/analyze")
    print(f"     Request: {{\"repo_id\": \"{gpt_oss.repo_id}\"}}")
    print(f"     Expected: ModelAnalysis with {gpt_oss.param_count/1e9:.1f}B params, GGUF variants")
    
    print("\n  2. POST /api/v1/compare")
    print(f"     Request: {{\"model_a\": \"{gpt_oss.repo_id}\", \"model_b\": \"bartowski/Qwen2.5-14B-Instruct-GGUF\"}}")
    print(f"     Expected: ComparisonResult with winner analysis")
    
    print("\n  3. POST /api/v1/hardware-check")
    print(f"     Request: HardwareProfile with {hw.vram_gb}GB VRAM")
    print(f"     Expected: HardwareCheckResponse with GPT-OSS 20B compatibility")
    
    # Simulate the hardware check
    result = compute_model_compat(gpt_oss, hw)
    print(f"\n     Simulated Result for GPT-OSS 20B on {hw.gpu_name}:")
    print(f"     - Can Run: {result.status.value}")
    print(f"     - Recommended Quant: {result.recommended_quant}")
    print(f"     - Required Memory: {result.required_gb} GB")
    print(f"     - Expected Speed: {result.expected_tps} tok/s" if result.expected_tps else "     - Expected Speed: N/A (CPU only)")


async def main():
    print(f"""
╔══════════════════════════════════════════════════════════════════════╗
║           VRAMfit Realistic Test: GPT-OSS 20B                        ║
║           Model from: https://ollama.com/library/gpt-oss             ║
╚══════════════════════════════════════════════════════════════════════╝
    """)
    
    await test_hardware_compatibility()
    await test_comparison()
    await test_quantization_ladder()
    await test_api_endpoints_simulation()
    
    print_header("Test Complete")
    print("\n  GPT-OSS 20B is now in the VRAMfit catalog!")
    print(f"  GitHub: https://github.com/truetube47-gif/VRAMfit")
    print()


if __name__ == "__main__":
    asyncio.run(main())
