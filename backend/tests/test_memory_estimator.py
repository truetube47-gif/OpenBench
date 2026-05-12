"""
Deterministic unit tests for memory estimation formulas.
These validate the core trust-sensitive calculations used throughout OpenBench.
"""

import pytest
from app.utils.memory_estimator import (
    estimate_memory,
    bpw_from_quant,
    quant_from_filename,
    can_run_status,
    QUANT_BPW,
)


class TestBPWFromQuant:
    def test_known_quants(self):
        assert bpw_from_quant("Q4_K_M") == 4.8
        assert bpw_from_quant("Q8_0") == 8.5
        assert bpw_from_quant("F16") == 16.0
        assert bpw_from_quant("IQ2_XS") == 2.3

    def test_case_insensitive(self):
        assert bpw_from_quant("q4_k_m") == 4.8

    def test_unknown_falls_back_to_8(self):
        assert bpw_from_quant("UNKNOWN") == 8.0


class TestQuantFromFilename:
    def test_standard_names(self):
        assert quant_from_filename("model-Q4_K_M.gguf") == "Q4_K_M"
        assert quant_from_filename("model-Q8_0.gguf") == "Q8_0"
        assert quant_from_filename("model-IQ2_XS.gguf") == "IQ2_XS"

    def test_fallback(self):
        assert quant_from_filename("model.gguf") == "Q4_K_M"


class TestEstimateMemory:
    """Test core formula: weights + KV cache + overhead."""

    def test_7b_q4(self):
        """7B model at Q4_K_M should need ~4-6 GB total."""
        result = estimate_memory(
            num_params=7_000_000_000,
            quant="Q4_K_M",
            context_length=8192,
            n_layers=32,
            n_kv_heads=8,
            head_dim=128,
        )
        assert 3.5 < result["weights_gb"] < 5.0
        assert result["kv_cache_gb"] > 0
        assert result["overhead_gb"] == 0.5  # llama.cpp default
        assert 4.0 < result["total_gb"] < 6.0

    def test_14b_q4(self):
        """14B model at Q4_K_M: ~8-10 GB."""
        result = estimate_memory(
            num_params=14_000_000_000,
            quant="Q4_K_M",
            context_length=8192,
            n_layers=40,
            n_kv_heads=8,
            head_dim=128,
        )
        assert 7.0 < result["total_gb"] < 11.0

    def test_32b_q4(self):
        """32B model at Q4_K_M: ~17-22 GB."""
        result = estimate_memory(
            num_params=32_000_000_000,
            quant="Q4_K_M",
            context_length=8192,
            n_layers=64,
            n_kv_heads=8,
            head_dim=128,
        )
        assert 15.0 < result["total_gb"] < 25.0

    def test_70b_q4(self):
        """70B model at Q4_K_M: ~35-45 GB."""
        result = estimate_memory(
            num_params=70_000_000_000,
            quant="Q4_K_M",
            context_length=8192,
            n_layers=80,
            n_kv_heads=8,
            head_dim=128,
        )
        assert 30.0 < result["total_gb"] < 50.0

    def test_context_scaling(self):
        """Doubling context should increase KV cache proportionally."""
        base = estimate_memory(7_000_000_000, "Q4_K_M", 4096, 32, 8, 128)
        double = estimate_memory(7_000_000_000, "Q4_K_M", 8192, 32, 8, 128)
        kv_ratio = double["kv_cache_gb"] / base["kv_cache_gb"]
        assert 1.9 < kv_ratio < 2.1  # should be ~2x

    def test_framework_overhead(self):
        """vLLM should have higher overhead than llama.cpp."""
        llama = estimate_memory(7_000_000_000, "Q4_K_M", 8192, 32, 8, 128, framework="llama.cpp")
        vllm = estimate_memory(7_000_000_000, "Q4_K_M", 8192, 32, 8, 128, framework="vllm")
        assert vllm["overhead_gb"] > llama["overhead_gb"]


class TestCanRunStatus:
    def test_comfortable(self):
        assert can_run_status(6.0, 12.0) == "comfortable"

    def test_marginal(self):
        assert can_run_status(10.0, 12.0) == "marginal"

    def test_cannot_run(self):
        assert can_run_status(14.0, 12.0) == "cannot_run"

    def test_zero_available(self):
        assert can_run_status(5.0, 0.0) == "unknown"

    def test_exact_boundary(self):
        # 80% usage = boundary of comfortable
        assert can_run_status(8.0, 10.0) == "comfortable"
        assert can_run_status(8.1, 10.0) == "marginal"
