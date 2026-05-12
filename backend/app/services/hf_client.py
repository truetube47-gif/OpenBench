"""
Hugging Face API client.

Key operations:
  - Fetch model metadata (config.json, model card, repo files)
  - List GGUF files in a repo
  - Fetch GGUF header via HTTP Range request (avoids full model download)
"""

import httpx
import json
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

HF_API_BASE = "https://huggingface.co/api"
HF_CDN_BASE = "https://huggingface.co"
GGUF_HEADER_BYTES = 15 * 1024 * 1024  # 15 MB — enough for metadata KV block


async def get_model_info(repo_id: str) -> dict:
    """
    Fetch model metadata from HF Hub API.
    Returns: dict with keys: id, sha, modelId, tags, cardData, siblings (file list), config
    """
    url = f"{HF_API_BASE}/models/{repo_id}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=settings.hf_headers)
        resp.raise_for_status()
        data = resp.json()

    # Also try to fetch config.json for transformer models
    config = await _try_fetch_json(repo_id, "config.json")
    if config:
        data["_config"] = config

    return data


async def _try_fetch_json(repo_id: str, filename: str) -> Optional[dict]:
    url = f"{HF_CDN_BASE}/{repo_id}/resolve/main/{filename}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=settings.hf_headers, follow_redirects=True)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


async def list_gguf_files(repo_id: str) -> list[dict]:
    """
    Return list of GGUF files in the repo.
    Each entry: { filename, size_bytes, rfilename }
    """
    url = f"{HF_API_BASE}/models/{repo_id}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=settings.hf_headers)
        resp.raise_for_status()
        data = resp.json()

    siblings = data.get("siblings", [])
    gguf_files = [
        {
            "filename": s.get("rfilename", ""),
            "size_bytes": s.get("size", 0) or 0,
        }
        for s in siblings
        if s.get("rfilename", "").endswith(".gguf")
    ]
    return gguf_files


async def fetch_gguf_header(repo_id: str, filename: str) -> Optional[bytes]:
    """
    Fetch only the header portion of a GGUF file using HTTP Range request.
    Returns the first GGUF_HEADER_BYTES bytes, or None if not available.

    Challenge: HF uses Cloudflare CDN which usually supports Range requests,
    but some repos may redirect to external storage that doesn't. We fall back
    to downloading without Range if the server ignores the Range header.
    """
    url = f"{HF_CDN_BASE}/{repo_id}/resolve/main/{filename}"
    headers = {
        **settings.hf_headers,
        "Range": f"bytes=0-{GGUF_HEADER_BYTES - 1}",
    }

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code in (200, 206):
                data = resp.content
                logger.info(
                    "Fetched %d bytes of GGUF header for %s/%s",
                    len(data), repo_id, filename,
                )
                return data
            logger.warning("GGUF header fetch: HTTP %d for %s", resp.status_code, filename)
        except httpx.TimeoutException:
            logger.warning("Timeout fetching GGUF header for %s/%s", repo_id, filename)
        except Exception as exc:
            logger.warning("Error fetching GGUF header: %s", exc)

    return None


def parse_card_data(card_data: dict) -> dict:
    """
    Extract structured fields from HF model card metadata (YAML front-matter).
    """
    result: dict = {}
    if not card_data:
        return result

    result["license"] = card_data.get("license", "unknown")
    result["tags"] = card_data.get("tags", [])
    result["language"] = card_data.get("language", [])
    result["datasets"] = card_data.get("datasets", [])

    # Benchmark results sometimes embedded in model card
    evals = card_data.get("model-index", [])
    if evals:
        result["model_index"] = evals

    return result


def parse_hf_model_tags(tags: list[str]) -> dict:
    """
    Infer architecture, param count, and capabilities from HF tags.
    e.g. ["llama", "7B", "gguf", "text-generation", "en"]
    """
    info = {"architecture": "unknown", "parameter_count_from_tag": 0}

    arch_keywords = [
        "llama", "mistral", "qwen", "phi", "gemma", "falcon",
        "mpt", "gpt2", "gptj", "bloom", "opt", "deepseek",
        "command-r", "stablelm", "vicuna", "wizard",
    ]
    for tag in tags:
        tag_lower = tag.lower()
        for arch in arch_keywords:
            if arch in tag_lower:
                info["architecture"] = arch
                break

        # Parameter count from tags like "7b", "13b", "70b"
        import re
        m = re.search(r"(\d+(?:\.\d+)?)\s*[bB]", tag)
        if m:
            val = float(m.group(1))
            info["parameter_count_from_tag"] = int(val * 1e9)

    return info
