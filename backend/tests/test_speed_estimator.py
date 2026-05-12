"""
Deterministic unit tests for speed estimation formulas.
"""

import pytest
from app.utils.speed_estimator import (
    estimate_speed,
    lookup_gpu_bandwidth,
    classify_speed,
    task_speed_breakdown,
    speed_score_0_100,
    GPU_EFFICIENCY,
    CPU_EFFICIENCY,
)


class TestLookupGPUBandwidth:
    def test_known_gpu(self):
        bw = lookup_gpu_bandwidth("RTX 4090")
        assert bw == 1008.0

    def test_known_gpu_case_insensitive(self):
        bw = lookup_gpu_bandwidth("RTX 3060 12GB")
        assert bw == 360.0

    def test_unknown_gpu(self):
        assert lookup_gpu_bandwidth("Some Unknown GPU") is None

    def test_none_gpu(self):
        assert lookup_gpu_bandwidth("") is None


class TestEstimateSpeed:
    def test_cpu_only(self):
        """CPU-only config should produce CPU tps but no GPU tps."""
        result = estimate_speed(
            model_size_gb=4.0,
            hardware_profile={
                "cpu_memory_bandwidth_gbps": 50.0,
                "gpu_name": None,
                "gpu_memory_bandwidth_gbps": None,
            },
        )
        assert result["cpu_tps_min"] > 0
        assert result["cpu_tps_max"] > result["cpu_tps_min"]
        assert "gpu_tps_min" not in result
        assert result["bottleneck"] == "memory_bandwidth"

    def test_gpu_config(self):
        """RTX 4090 should produce high GPU tps for a small model."""
        result = estimate_speed(
            model_size_gb=4.0,
            hardware_profile={
                "cpu_memory_bandwidth_gbps": 50.0,
                "gpu_name": "RTX 4090",
                "gpu_memory_bandwidth_gbps": 1008.0,
            },
        )
        assert result["gpu_tps_min"] > 50  # 4GB model on 1TB/s bandwidth
        assert result["gpu_tps_max"] > result["gpu_tps_min"]

    def test_large_model_slower(self):
        """A 40GB model should be slower than a 4GB model on same hardware."""
        hw = {
            "cpu_memory_bandwidth_gbps": 50.0,
            "gpu_name": "RTX 4090",
            "gpu_memory_bandwidth_gbps": 1008.0,
        }
        small = estimate_speed(4.0, hw)
        large = estimate_speed(40.0, hw)
        assert large["gpu_tps_max"] < small["gpu_tps_max"]

    def test_apple_silicon(self):
        """Apple M2 Pro should produce both CPU and GPU tps (unified memory)."""
        result = estimate_speed(
            model_size_gb=4.0,
            hardware_profile={
                "cpu_memory_bandwidth_gbps": 200.0,
                "gpu_name": "M2 Pro",
                "gpu_memory_bandwidth_gbps": 200.0,
            },
        )
        assert result["cpu_tps_max"] > 0
        assert result["gpu_tps_max"] > 0


class TestClassifySpeed:
    def test_excellent(self):
        assert classify_speed(50) == "excellent"

    def test_good(self):
        assert classify_speed(25) == "good"

    def test_acceptable(self):
        assert classify_speed(10) == "acceptable"

    def test_slow(self):
        assert classify_speed(3) == "slow"

    def test_unusable(self):
        assert classify_speed(1) == "unusable"


class TestSpeedScore:
    def test_zero(self):
        assert speed_score_0_100(0) == 0.0

    def test_positive(self):
        score = speed_score_0_100(20)
        assert 30 < score < 60

    def test_monotonic(self):
        """Higher tps should always produce higher score."""
        s1 = speed_score_0_100(5)
        s2 = speed_score_0_100(20)
        s3 = speed_score_0_100(100)
        assert s1 < s2 < s3
