from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import hashlib
import logging
from typing import Optional

from app.models.schemas import AnalyzeRequest, ModelAnalysis, HardwareProfile, MemoryEstimate, SpeedEstimate, TaskSpeedBreakdown, CanRunStatus, CapabilityScores
from app.models.db_models import CachedAnalysis
from app.services.gguf_analyzer import analyze_model
from app.utils.gguf_header_parser import GGUFHeaderParser, extract_model_info
from app.utils.memory_estimator import estimate_memory, quant_from_filename, bpw_from_quant, can_run_status, GGUF_FILE_TYPE_MAP
from app.utils.speed_estimator import estimate_speed, speed_score_0_100, task_speed_breakdown
from app.core.database import get_db
from app.core.config import settings
from app.core.validation import validate_repo_id

router = APIRouter()
logger = logging.getLogger(__name__)

LOCAL_HEADER_BYTES = 2 * 1024 * 1024  # 2 MB — enough for any GGUF header


@router.post("", response_model=ModelAnalysis)
async def analyze_endpoint(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """
    Analyze a single HuggingFace model repo.
    Accepts GGUF repos (e.g. bartowski/Llama-3.2-3B-Instruct-GGUF) and
    transformer repos (e.g. meta-llama/Meta-Llama-3-8B).
    """
    req.repo_id = validate_repo_id(req.repo_id)
    cache_key = _cache_key(req)

    # Check cache
    cached = await db.get(CachedAnalysis, cache_key)
    if cached:
        logger.info("Cache hit for %s", req.repo_id)
        return ModelAnalysis(**cached.data)

    # Run analysis
    try:
        result = await analyze_model(
            repo_id=req.repo_id,
            hardware=req.hardware_profile,
            context_length=req.context_length,
            framework=req.framework,
            use_wolfram=req.use_wolfram,
        )
    except Exception as exc:
        logger.exception("Analysis failed for %s", req.repo_id)
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}")

    # Store in cache
    try:
        db.add(CachedAnalysis(repo_id=cache_key, data=result.model_dump()))
        await db.commit()
    except Exception as exc:
        logger.warning("Cache write failed: %s", exc)
        await db.rollback()

    return result


@router.get("/{repo_owner}/{repo_name}", response_model=ModelAnalysis)
async def get_cached_analysis(
    repo_owner: str, repo_name: str, db: AsyncSession = Depends(get_db)
):
    """Return cached analysis for a repo (GET convenience endpoint)."""
    repo_id = f"{repo_owner}/{repo_name}"
    result = await db.execute(
        select(CachedAnalysis).where(CachedAnalysis.repo_id.like(f"%{repo_id}%"))
    )
    cached = result.scalar_one_or_none()
    if not cached:
        raise HTTPException(status_code=404, detail="No cached analysis found. POST /api/v1/analyze first.")
    return ModelAnalysis(**cached.data)


@router.post("/local", response_model=ModelAnalysis)
async def analyze_local(
    file: UploadFile = File(..., description="Local GGUF file (first 2 MB is enough)"),
    hardware_json: Optional[str] = Form(None, description="JSON-encoded HardwareProfile"),
    context_length: int = Form(8192),
    framework: str = Form("llama.cpp"),
):
    """
    Analyze a local GGUF model file without any Hugging Face or Ollama dependency.
    The client must send only the first ~2 MB of the file (GGUF header region).
    Full model upload is NOT required.
    """
    header_bytes = await file.read(LOCAL_HEADER_BYTES)
    if len(header_bytes) < 24:
        raise HTTPException(400, "File too small to be a valid GGUF file")
    filename = file.filename or "local_model.gguf"

    if not header_bytes[:4] == b"GGUF":
        raise HTTPException(400, "File does not appear to be a valid GGUF file (bad magic bytes)")

    hw = HardwareProfile()
    if hardware_json:
        try:
            hw = HardwareProfile.model_validate_json(hardware_json)
        except Exception:
            pass

    try:
        parser = GGUFHeaderParser(header_bytes)
        parsed = parser.parse()
        info = extract_model_info(parsed["metadata"])
    except Exception as exc:
        raise HTTPException(422, f"Could not parse GGUF header: {exc}")

    arch        = info.get("architecture", "unknown")
    param_count = info.get("parameter_count", 0)
    ctx_len     = info.get("context_length", context_length)
    n_layers    = info.get("n_layers", 32)
    n_heads     = info.get("n_heads", 32)
    n_kv        = info.get("n_kv_heads", n_heads)
    head_dim    = info.get("head_dim", 128)
    vocab_size  = info.get("vocab_size", 32000)
    quant_id    = info.get("quantization_id", -1)
    quant       = GGUF_FILE_TYPE_MAP.get(quant_id) or quant_from_filename(filename)
    bpw         = bpw_from_quant(quant)
    size_gb     = len(header_bytes) / (1024 ** 3) if param_count == 0 else param_count * bpw / 8 / 1024**3

    mem_dict = estimate_memory(
        num_params=param_count,
        quant=quant,
        context_length=ctx_len,
        n_layers=n_layers,
        n_kv_heads=n_kv,
        head_dim=head_dim,
        framework=framework,
    )
    mem = MemoryEstimate(**mem_dict)
    avail = hw.vram_gb or hw.ram_gb
    can_run = CanRunStatus(can_run_status(mem.total_gb, avail))

    speed_dict = estimate_speed(model_size_gb=mem.weights_gb, hardware_profile=hw.model_dump())
    cpu_mid = (speed_dict.get("cpu_tps_min", 0) + speed_dict.get("cpu_tps_max", 0)) / 2
    cpu_tasks = TaskSpeedBreakdown(**task_speed_breakdown(cpu_mid))
    gpu_tasks = None
    if speed_dict.get("gpu_tps_max"):
        gpu_mid = (speed_dict.get("gpu_tps_min", 0) + speed_dict.get("gpu_tps_max", 0)) / 2
        gpu_tasks = TaskSpeedBreakdown(**task_speed_breakdown(gpu_mid))

    speed = SpeedEstimate(
        cpu_tps_min=speed_dict.get("cpu_tps_min", 0),
        cpu_tps_max=speed_dict.get("cpu_tps_max", 0),
        gpu_tps_min=speed_dict.get("gpu_tps_min"),
        gpu_tps_max=speed_dict.get("gpu_tps_max"),
        bottleneck=speed_dict.get("bottleneck", "memory_bandwidth"),
        cpu_tasks=cpu_tasks,
        gpu_tasks=gpu_tasks,
    )

    cap = CapabilityScores(speed=speed_score_0_100(cpu_mid))
    display_name = filename.replace(".gguf", "").replace("-", " ").replace("_", " ").strip()

    return ModelAnalysis(
        repo_id=f"local/{filename}",
        name=display_name,
        architecture=arch,
        parameter_count=param_count,
        context_length=ctx_len,
        quantization=quant,
        bits_per_weight=bpw,
        file_size_gb=round(size_gb, 2),
        n_layers=n_layers,
        n_heads=n_heads,
        n_kv_heads=n_kv,
        head_dim=head_dim,
        vocab_size=vocab_size,
        license="local",
        tags=["local", "dev"],
        gguf_variants=[],
        memory_estimate=mem,
        speed_estimate=speed,
        benchmarks=None,
        capability_scores=cap,
        can_run=can_run,
    )


def _cache_key(req: AnalyzeRequest) -> str:
    hw_str = req.hardware_profile.model_dump_json() if req.hardware_profile else "default"
    raw = f"{req.repo_id}:{req.context_length}:{req.framework}:{hw_str}"
    return hashlib.md5(raw.encode()).hexdigest()
