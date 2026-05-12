"""
Input validation utilities — especially for untrusted repo IDs.
"""

import re
from fastapi import HTTPException

# HuggingFace repo IDs: owner/repo, each segment [a-zA-Z0-9._-]+
_REPO_ID_RE = re.compile(r"^[a-zA-Z0-9._-]{1,96}/[a-zA-Z0-9._-]{1,128}$")

# Maximum lengths
MAX_REPO_ID_LEN = 225
MAX_SEARCH_LEN = 200


def validate_repo_id(repo_id: str) -> str:
    """
    Validate and sanitize a HuggingFace-style repo ID.
    Raises HTTPException(400) on invalid input.
    """
    repo_id = repo_id.strip()
    if not repo_id:
        raise HTTPException(400, "repo_id must not be empty")
    if len(repo_id) > MAX_REPO_ID_LEN:
        raise HTTPException(400, f"repo_id too long (max {MAX_REPO_ID_LEN} chars)")
    if ".." in repo_id or "/" in repo_id.split("/", 1)[0] and repo_id.count("/") > 1:
        raise HTTPException(400, "Invalid repo_id — path traversal detected")
    if not _REPO_ID_RE.match(repo_id):
        raise HTTPException(
            400,
            "Invalid repo_id format — expected 'owner/repo' with alphanumeric, '.', '_', '-' characters",
        )
    return repo_id


def validate_search_query(q: str) -> str:
    """Sanitize freetext search input."""
    q = q.strip()[:MAX_SEARCH_LEN]
    # Strip anything that could be SQL injection or XSS
    q = re.sub(r"[<>\"';\\]", "", q)
    return q
