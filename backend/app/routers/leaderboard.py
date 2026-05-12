from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
import logging

from app.models.schemas import (
    LeaderboardResponse,
    CommunityBenchmarkSubmit,
    HardwarePreset,
)
from app.models.db_models import CommunityBenchmark
from app.services.benchmark_service import get_leaderboard_page
from app.utils.speed_estimator import HARDWARE_PRESETS
from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    page:      int = Query(0, ge=0),
    per_page:  int = Query(20, ge=1, le=100),
    arch:      str | None = Query(None, description="Filter by architecture, e.g. llama"),
    sort_by:   str = Query("avg_score", description="Sort field"),
):
    """Fetch Open LLM Leaderboard data (live from HF, cached 1h)."""
    return await get_leaderboard_page(page=page, per_page=per_page, architecture_filter=arch, sort_by=sort_by)


@router.post("/community/submit")
async def submit_community_benchmark(
    payload: CommunityBenchmarkSubmit,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a real-world benchmark result.
    Community submissions build a crowd-sourced performance database.
    """
    entry = CommunityBenchmark(
        repo_id=payload.repo_id,
        hardware_profile=payload.hardware_profile.model_dump(),
        tokens_per_second=payload.tokens_per_second,
        context_length=payload.context_length,
        framework=payload.framework,
        notes=payload.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"success": True, "id": entry.id}


@router.get("/community/{repo_id:path}")
async def get_community_benchmarks(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return crowd-sourced benchmarks for a specific model."""
    result = await db.execute(
        select(CommunityBenchmark)
        .where(CommunityBenchmark.repo_id == repo_id)
        .order_by(desc(CommunityBenchmark.created_at))
        .limit(50)
    )
    rows = result.scalars().all()
    entries = []
    for r in rows:
        hw = r.hardware_profile or {}
        entries.append({
            "id":               r.id,
            "hardware":         hw.get("gpu_name") or hw.get("cpu_name", "Unknown"),
            "tokens_per_second": r.tokens_per_second,
            "context_length":   r.context_length,
            "framework":        r.framework,
            "notes":            r.notes,
        })

    # Aggregate stats
    tps_values = [e["tokens_per_second"] for e in entries]
    stats = {}
    if tps_values:
        stats = {
            "count":   len(tps_values),
            "avg_tps": round(sum(tps_values) / len(tps_values), 1),
            "max_tps": round(max(tps_values), 1),
            "min_tps": round(min(tps_values), 1),
        }

    return {"repo_id": repo_id, "entries": entries, "stats": stats}


@router.get("/hardware/presets", response_model=list[HardwarePreset])
async def hardware_presets():
    """Return the built-in hardware preset library."""
    return [HardwarePreset(**p) for p in HARDWARE_PRESETS]
