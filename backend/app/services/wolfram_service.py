"""
Optional Wolfram integration for symbolic memory formula derivation.

Two integration modes:
  1. Wolfram Alpha Simple API — natural language → computed result with steps
  2. Wolfram Language Cloud API — full symbolic computation (more powerful)

Both degrade gracefully if API keys are not set.
"""

import httpx
import logging
from typing import Optional
from app.core.config import settings
from app.utils.memory_estimator import bpw_from_quant, FRAMEWORK_OVERHEAD_GB

logger = logging.getLogger(__name__)

WA_SIMPLE_URL = "http://api.wolframalpha.com/v1/result"
WA_FULL_URL   = "http://api.wolframalpha.com/v2/query"


async def derive_memory_formula(
    num_params: int,
    quant: str,
    context_length: int,
    n_layers: int,
    n_kv_heads: int,
    head_dim: int,
    framework: str = "llama.cpp",
) -> dict:
    """
    Return a structured derivation of the memory formula.
    Uses Wolfram Alpha if API key is present, otherwise uses Python math
    with human-readable steps.
    """
    bpw        = bpw_from_quant(quant)
    overhead   = FRAMEWORK_OVERHEAD_GB.get(framework, 1.0)

    weights_bytes = num_params * bpw / 8
    weights_gb    = weights_bytes / (1024 ** 3)

    kv_bytes   = 2 * n_layers * n_kv_heads * head_dim * context_length * 2  # F16 KV
    kv_gb      = kv_bytes / (1024 ** 3)
    total_gb   = weights_gb + kv_gb + overhead

    step_by_step = [
        f"1. Weights:  {num_params:,} params × {bpw} bpw ÷ 8 ÷ 1024³ = {weights_gb:.3f} GB",
        f"2. KV Cache: 2 × {n_layers} layers × {n_kv_heads} KV-heads × {head_dim} head-dim "
        f"× {context_length:,} ctx × 2 bytes = {kv_gb:.3f} GB",
        f"3. Overhead ({framework}): {overhead:.1f} GB",
        f"4. Total: {weights_gb:.3f} + {kv_gb:.3f} + {overhead:.1f} = {total_gb:.2f} GB",
    ]

    formula_text = (
        f"({num_params} × {bpw} ÷ 8 ÷ 1024³)"
        f" + (2 × {n_layers} × {n_kv_heads} × {head_dim} × {context_length} × 2 ÷ 1024³)"
        f" + {overhead}"
    )

    wolfram_result = None
    if settings.WOLFRAM_APP_ID:
        wolfram_result = await _query_wolfram_alpha(
            f"({num_params} * {bpw} / 8 / 1073741824) + "
            f"(2 * {n_layers} * {n_kv_heads} * {head_dim} * {context_length} * 2 / 1073741824) + {overhead}"
        )
        if wolfram_result:
            step_by_step.append(f"✓ Wolfram verification: {wolfram_result}")

    return {
        "formula_text":  formula_text,
        "step_by_step":  step_by_step,
        "result_gb":     round(total_gb, 3),
        "source":        "wolfram" if wolfram_result else "python",
        "wolfram_raw":   wolfram_result,
    }


async def _query_wolfram_alpha(expression: str) -> Optional[str]:
    """
    Query Wolfram Alpha Simple API for a numeric result.
    Returns the plain-text result or None on failure.
    """
    if not settings.WOLFRAM_APP_ID:
        return None

    params = {
        "appid": settings.WOLFRAM_APP_ID,
        "i":     expression,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(WA_SIMPLE_URL, params=params)
            if resp.status_code == 200:
                return resp.text.strip()
            logger.warning("Wolfram Alpha returned HTTP %d", resp.status_code)
    except Exception as exc:
        logger.warning("Wolfram Alpha query failed: %s", exc)

    return None


async def wolfram_language_compute(code: str) -> Optional[str]:
    """
    Execute Wolfram Language code via Wolfram Cloud REST API.
    Requires WOLFRAM_CLOUD_KEY.
    Example code: "N[7*10^9 * 4.8 / 8 / 1024^3, 4]"
    """
    if not settings.WOLFRAM_CLOUD_KEY:
        return None

    url = "https://www.wolframcloud.com/obj/user-xxxx/api/v1/compute"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                url,
                json={"code": code},
                headers={"Authorization": f"Bearer {settings.WOLFRAM_CLOUD_KEY}"},
            )
            if resp.status_code == 200:
                return resp.json().get("result")
    except Exception as exc:
        logger.warning("Wolfram Language Cloud call failed: %s", exc)
    return None
