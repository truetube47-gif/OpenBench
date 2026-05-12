from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import logging

from app.models.schemas import CompareRequest, ComparisonResult
from app.models.db_models import CachedComparison
from app.services.gguf_analyzer import analyze_model
from app.services.comparator import compare
from app.core.database import get_db
from app.core.validation import validate_repo_id

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=ComparisonResult)
async def compare_models(req: CompareRequest, db: AsyncSession = Depends(get_db)):
    """
    Compare two HuggingFace model repos side-by-side.
    Both models are analyzed in parallel then compared.
    """
    req.model_a = validate_repo_id(req.model_a)
    req.model_b = validate_repo_id(req.model_b)
    cache_key = _cache_key(req)

    cached = await db.get(CachedComparison, cache_key)
    if cached:
        logger.info("Comparison cache hit: %s vs %s", req.model_a, req.model_b)
        return ComparisonResult(**cached.data)

    # Analyze both models concurrently
    import asyncio
    try:
        model_a, model_b = await asyncio.gather(
            analyze_model(req.model_a, req.hardware_profile, req.context_length),
            analyze_model(req.model_b, req.hardware_profile, req.context_length),
        )
    except Exception as exc:
        logger.exception("Comparison analysis failed")
        raise HTTPException(status_code=502, detail=f"Model analysis failed: {exc}")

    result = compare(model_a, model_b, req.hardware_profile)

    try:
        db.add(CachedComparison(id=cache_key, data=result.model_dump()))
        await db.commit()
    except Exception as exc:
        logger.warning("Comparison cache write failed: %s", exc)
        await db.rollback()

    return result


def _cache_key(req: CompareRequest) -> str:
    hw_str = req.hardware_profile.model_dump_json() if req.hardware_profile else "default"
    raw = f"{req.model_a}:{req.model_b}:{req.context_length}:{hw_str}"
    return hashlib.md5(raw.encode()).hexdigest()
