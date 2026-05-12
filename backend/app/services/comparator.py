"""
Side-by-side model comparison engine.
Produces a structured ComparisonResult with winner analysis.
"""

from app.models.schemas import (
    ModelAnalysis,
    ComparisonResult,
    HardwareProfile,
    WinnerSummary,
    CanRunStatus,
)


def compare(
    model_a: ModelAnalysis,
    model_b: ModelAnalysis,
    hardware: HardwareProfile | None = None,
) -> ComparisonResult:
    winner = _determine_winner(model_a, model_b, hardware)
    return ComparisonResult(
        model_a=model_a,
        model_b=model_b,
        hardware_profile=hardware,
        winner=winner,
    )


def _determine_winner(
    a: ModelAnalysis,
    b: ModelAnalysis,
    hw: HardwareProfile | None,
) -> WinnerSummary:
    # ── Performance winner (benchmark avg) ────────────────────────────────
    a_bench = _bench_avg(a)
    b_bench = _bench_avg(b)
    perf_winner = a.repo_id if a_bench >= b_bench else b.repo_id

    # ── Efficiency winner (performance per GB of RAM) ──────────────────────
    a_eff = a_bench / max(a.memory_estimate.total_gb if a.memory_estimate else 8, 0.1)
    b_eff = b_bench / max(b.memory_estimate.total_gb if b.memory_estimate else 8, 0.1)
    eff_winner = a.repo_id if a_eff >= b_eff else b.repo_id

    # ── Overall winner (weighted: 60% performance, 40% efficiency) ─────────
    a_overall = a_bench * 0.6 + a_eff * 10 * 0.4
    b_overall = b_bench * 0.6 + b_eff * 10 * 0.4
    overall_winner = a.repo_id if a_overall >= b_overall else b.repo_id

    # ── Hardware-aware winner ──────────────────────────────────────────────
    hw_winner = None
    reasoning_parts = []

    if hw:
        avail = hw.vram_gb or hw.ram_gb
        a_runs = a.can_run if a.can_run else CanRunStatus.UNKNOWN
        b_runs = b.can_run if b.can_run else CanRunStatus.UNKNOWN

        a_score = _run_score(a_runs)
        b_score = _run_score(b_runs)

        if a_score != b_score:
            hw_winner = a.repo_id if a_score > b_score else b.repo_id
            reasoning_parts.append(
                f"{hw_winner.split('/')[-1]} is better suited for your {avail:.0f} GB hardware"
            )
        else:
            hw_winner = overall_winner
            reasoning_parts.append(
                "Both models run on your hardware — choosing by performance"
            )

    # ── Build reasoning string ─────────────────────────────────────────────
    a_name = a.name or a.repo_id.split("/")[-1]
    b_name = b.name or b.repo_id.split("/")[-1]

    if a_bench > b_bench + 2:
        reasoning_parts.append(
            f"{a_name} scores higher on benchmarks ({a_bench:.1f}% vs {b_bench:.1f}%)"
        )
    elif b_bench > a_bench + 2:
        reasoning_parts.append(
            f"{b_name} scores higher on benchmarks ({b_bench:.1f}% vs {a_bench:.1f}%)"
        )
    else:
        reasoning_parts.append("Benchmark scores are close — efficiency is the tiebreaker")

    if a.parameter_count > b.parameter_count * 1.5:
        reasoning_parts.append(
            f"{a_name} has more parameters ({_fmt_params(a.parameter_count)} vs {_fmt_params(b.parameter_count)})"
        )
    elif b.parameter_count > a.parameter_count * 1.5:
        reasoning_parts.append(
            f"{b_name} has more parameters ({_fmt_params(b.parameter_count)} vs {_fmt_params(a.parameter_count)})"
        )

    return WinnerSummary(
        overall=overall_winner,
        performance=perf_winner,
        efficiency=eff_winner,
        user_hardware=hw_winner,
        reasoning=" | ".join(reasoning_parts) if reasoning_parts else "Models are comparable.",
    )


def _bench_avg(model: ModelAnalysis) -> float:
    b = model.benchmarks
    if not b:
        return 50.0
    scores = [
        v for v in [b.mmlu, b.arc_challenge, b.gsm8k, b.humaneval, b.hellaswag]
        if v is not None
    ]
    return round(sum(scores) / len(scores), 2) if scores else 50.0


def _run_score(status: CanRunStatus) -> int:
    return {"comfortable": 3, "marginal": 2, "cannot_run": 0, "unknown": 1}.get(status, 1)


def _fmt_params(n: int) -> str:
    if n >= 1e9:
        return f"{n/1e9:.1f}B"
    if n >= 1e6:
        return f"{n/1e6:.0f}M"
    return str(n)
