"""
Shareable link endpoints.

POST /api/v1/share        → create a shareable link, returns short ID
GET  /api/v1/share/{id}  → retrieve link params + increment view count
"""

import secrets
import string
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import SharedLinkCreate, SharedLinkResponse
from app.models.db_models import SharedLink
from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

_ALPHABET = string.ascii_letters + string.digits


def _gen_id(length: int = 8) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


@router.post("", response_model=SharedLinkResponse, status_code=201)
async def create_share(payload: SharedLinkCreate, db: AsyncSession = Depends(get_db)):
    """Create a shareable link for a comparison or analysis session."""
    if payload.type not in ("compare", "analyze"):
        raise HTTPException(400, detail="type must be 'compare' or 'analyze'")

    for _ in range(5):
        link_id = _gen_id()
        existing = await db.get(SharedLink, link_id)
        if not existing:
            break
    else:
        raise HTTPException(500, detail="Could not generate unique ID — try again")

    link = SharedLink(id=link_id, type=payload.type, params=payload.params, views=0)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    logger.info("Created shared link %s (type=%s)", link_id, payload.type)

    return SharedLinkResponse(
        id=link.id,
        type=link.type,
        params=link.params,
        views=link.views or 0,
        url=f"/{link.type}?share={link.id}",
    )


@router.get("/{link_id}", response_model=SharedLinkResponse)
async def get_share(link_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a shared link's parameters. Increments view count on each call."""
    link = await db.get(SharedLink, link_id)
    if not link:
        raise HTTPException(404, detail="Shared link not found or expired")

    link.views = (link.views or 0) + 1
    await db.commit()

    return SharedLinkResponse(
        id=link.id,
        type=link.type,
        params=link.params,
        views=link.views,
        url=f"/{link.type}?share={link.id}",
    )
