"""
Model discovery endpoints.

GET /api/v1/models/{owner}/{repo}/variants
    List all GGUF variants with quant metadata, size, and RAM compatibility.
    Designed for the instant model picker UI — no header parsing, near-zero latency.
"""

import re
import logging
from fastapi import APIRouter, HTTPException, Query

from app.services.hf_client import list_gguf_files
from app.models.schemas import ModelVariantsResponse, GGUFVariantInfo, CanRunStatus

router = APIRouter()
logger = logging.getLogger(__name__)

# Bits-per-weight table for known quantization types
QUANT_BPW: dict[str, float] = {
    "F32": 32.0, "F16": 16.0, "BF16": 16.0,
    "Q8_0": 8.5, "Q6_K": 6.6,
    "Q5_K_M": 5.7, "Q5_K_S": 5.5, "Q5_0": 5.5,
    "Q4_K_M": 4.8, "Q4_K_S": 4.6, "Q4_0": 4.5,
    "Q3_K_L": 3.9, "Q3_K_M": 3.7, "Q3_K_S": 3.5,
    "Q2_K": 3.4, "Q2_K_S": 3.2,
    "IQ4_NL": 4.5, "IQ4_XS": 4.3,
    "IQ3_M": 3.7, "IQ3_S": 3.5, "IQ3_XXS": 3.1,
    "IQ2_M": 2.7, "IQ2_S": 2.5, "IQ2_XS": 2.3, "IQ2_XXS": 2.1,
    "IQ1_M": 1.7, "IQ1_S": 1.6,
}

QUALITY_TIERS: dict[str, list[str]] = {
    "extreme": ["F32", "F16", "BF16"],
    "high":    ["Q8_0", "Q6_K", "Q5_K_M", "Q5_K_S", "Q5_0"],
    "medium":  ["Q4_K_M", "Q4_K_S", "Q4_0", "IQ4_NL", "IQ4_XS"],
    "low":     [
        "Q3_K_L", "Q3_K_M", "Q3_K_S", "Q2_K",
        "IQ3_M", "IQ3_S", "IQ3_XXS",
        "IQ2_M", "IQ2_S", "IQ2_XS", "IQ2_XXS",
        "IQ1_M", "IQ1_S",
    ],
}

QUALITY_DESCRIPTIONS: dict[str, str] = {
    "extreme": "Full precision — maximum quality, very high RAM",
    "high":    "Near-lossless — excellent for production use",
    "medium":  "Balanced — best quality/size tradeoff (recommended)",
    "low":     "Compressed — minimal RAM, some quality loss",
}

# Best quants in preference order (balanced quality+efficiency)
RECOMMENDED_ORDER = [
    "Q4_K_M", "Q5_K_M", "Q3_K_M", "IQ4_NL", "IQ4_XS",
    "Q4_K_S", "Q6_K", "Q8_0", "Q4_0", "Q3_K_S",
]


def extract_quant(filename: str) -> str:
    """Extract quantization type from GGUF filename."""
    base = filename.rsplit("/", 1)[-1].replace(".gguf", "")
    patterns = [
        r"[-_](IQ\d+_[A-Z]+)",
        r"[-_](Q\d+_K_[LMS])",
        r"[-_](Q\d+_[0-9])",
        r"[-_](Q\d+_K)",
        r"[-_](F(?:16|32))",
        r"[-_](BF16)",
    ]
    for pat in patterns:
        m = re.search(pat, base, re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return "UNKNOWN"


def get_quality_tier(quant: str) -> str:
    for tier, quants in QUALITY_TIERS.items():
        if quant in quants:
            return tier
    return "medium"


def determine_can_run(size_gb: float, ram_gb: float) -> CanRunStatus:
    available = ram_gb * 0.75  # 25% reserved for OS
    if size_gb <= available * 0.85:
        return CanRunStatus.COMFORTABLE
    if size_gb <= available:
        return CanRunStatus.MARGINAL
    return CanRunStatus.CANNOT_RUN


def pick_recommended(variants_raw: list[dict], ram_gb: float) -> str | None:
    """Choose the best variant for the given RAM budget."""
    runnable = [v for v in variants_raw if v["can_run"] != CanRunStatus.CANNOT_RUN]
    if not runnable:
        return None

    tier_score = {"extreme": 4, "high": 3, "medium": 2, "low": 1}

    def score(v: dict) -> float:
        ts = tier_score.get(v["quality_tier"], 1)
        rec_idx = RECOMMENDED_ORDER.index(v["quantization"]) if v["quantization"] in RECOMMENDED_ORDER else 99
        return ts * 10 + (20 - min(rec_idx, 20))

    return max(runnable, key=score)["filename"]


@router.get("/{owner}/{repo}/variants", response_model=ModelVariantsResponse)
async def get_model_variants(
    owner: str,
    repo: str,
    ram_gb: float = Query(16.0, description="Available RAM/VRAM in GB for compatibility check"),
):
    """
    List all GGUF variants for a model with quantization metadata and RAM compatibility.
    Instant results — no header parsing required.
    """
    repo_id = f"{owner}/{repo}"
    try:
        gguf_files = await list_gguf_files(repo_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch variants from HF: {exc}")

    if not gguf_files:
        raise HTTPException(status_code=404, detail=f"No GGUF files found in {repo_id}")

    variants_raw: list[dict] = []
    for f in gguf_files:
        filename = f["filename"]
        size_gb  = round((f.get("size_bytes") or 0) / 1e9, 2)
        quant    = extract_quant(filename)
        bpw      = QUANT_BPW.get(quant, 4.0)
        can_run  = determine_can_run(size_gb, ram_gb)
        tier     = get_quality_tier(quant)

        variants_raw.append({
            "filename":     filename,
            "quantization": quant,
            "size_gb":      size_gb,
            "bpw":          bpw,
            "can_run":      can_run,
            "quality_tier": tier,
        })

    variants_raw.sort(key=lambda x: -x["bpw"])
    recommended_file = pick_recommended(variants_raw, ram_gb)

    variants = [
        GGUFVariantInfo(
            recommended=(v["filename"] == recommended_file),
            quality_description=QUALITY_DESCRIPTIONS.get(v["quality_tier"], ""),
            **v,
        )
        for v in variants_raw
    ]

    return ModelVariantsResponse(
        repo_id=repo_id,
        total_variants=len(variants),
        variants=variants,
        recommended_filename=recommended_file,
    )
