"""
Community/Stack router.

GET  /api/v1/community/posts           — paginated feed
POST /api/v1/community/posts           — create post
GET  /api/v1/community/posts/{id}      — post detail + comments
POST /api/v1/community/posts/{id}/comment — add comment
POST /api/v1/community/posts/{id}/like    — toggle like
GET  /api/v1/community/tags            — popular tags
"""

import random
import string
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db_models import CommunityPost, PostComment, PostReaction
from app.models.schemas import (
    PostCreate,
    PostResponse,
    PostFeedResponse,
    CommentCreate,
    CommentResponse,
    ReactionRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _seed() -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def _row_to_post(row: CommunityPost, comment_count: int = 0, comments=None) -> PostResponse:
    return PostResponse(
        id=row.id,
        title=row.title,
        body=row.body,
        post_type=row.post_type,
        author_name=row.author_name,
        author_seed=row.author_seed,
        model_repo=row.model_repo,
        is_local=row.is_local,
        result_data=row.result_data,
        tags=row.tags or [],
        likes=row.likes,
        views=row.views,
        comment_count=comment_count,
        created_at=row.created_at.isoformat() if row.created_at else None,
        comments=comments or [],
    )


def _row_to_comment(row: PostComment, replies=None) -> CommentResponse:
    return CommentResponse(
        id=row.id,
        post_id=row.post_id,
        parent_id=row.parent_id,
        body=row.body,
        author_name=row.author_name,
        author_seed=row.author_seed,
        likes=row.likes,
        created_at=row.created_at.isoformat() if row.created_at else None,
        replies=replies or [],
    )


@router.get("/posts", response_model=PostFeedResponse)
async def get_feed(
    page: int = 1,
    per_page: int = 20,
    tag: Optional[str] = None,
    post_type: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    q = select(CommunityPost).order_by(desc(CommunityPost.created_at))

    rows = (await db.execute(q)).scalars().all()

    filtered = []
    for row in rows:
        if tag and tag not in (row.tags or []):
            continue
        if post_type and row.post_type != post_type:
            continue
        if search:
            needle = search.lower()
            if needle not in (row.title or "").lower() and needle not in (row.body or "").lower():
                continue
        filtered.append(row)

    total = len(filtered)
    page_rows = filtered[offset: offset + per_page]

    posts = []
    for row in page_rows:
        cc = (await db.execute(
            select(func.count(PostComment.id)).where(PostComment.post_id == row.id)
        )).scalar() or 0
        posts.append(_row_to_post(row, comment_count=cc))

    return PostFeedResponse(posts=posts, total=total, page=page, per_page=per_page)


@router.post("/posts", response_model=PostResponse, status_code=201)
async def create_post(payload: PostCreate, db: AsyncSession = Depends(get_db)):
    post = CommunityPost(
        title=payload.title[:200],
        body=payload.body,
        post_type=payload.post_type,
        author_name=payload.author_name or "Anonymous",
        author_seed=_seed(),
        model_repo=payload.model_repo,
        is_local=payload.is_local,
        result_data=payload.result_data,
        tags=payload.tags[:10],
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return _row_to_post(post)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    row = await db.get(CommunityPost, post_id)
    if not row:
        raise HTTPException(404, "Post not found")

    row.views = (row.views or 0) + 1
    await db.commit()

    all_comments = (await db.execute(
        select(PostComment)
        .where(PostComment.post_id == post_id)
        .order_by(PostComment.created_at)
    )).scalars().all()

    comment_map: dict[int, CommentResponse] = {}
    roots: list[CommentResponse] = []
    for c in all_comments:
        cr = _row_to_comment(c)
        comment_map[c.id] = cr
        if c.parent_id is None:
            roots.append(cr)
        else:
            parent = comment_map.get(c.parent_id)
            if parent:
                parent.replies.append(cr)

    cc = sum(1 for _ in all_comments)
    return _row_to_post(row, comment_count=cc, comments=roots)


@router.post("/posts/{post_id}/comment", response_model=CommentResponse, status_code=201)
async def add_comment(post_id: int, payload: CommentCreate, db: AsyncSession = Depends(get_db)):
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(404, "Post not found")

    comment = PostComment(
        post_id=post_id,
        parent_id=payload.parent_id,
        body=payload.body,
        author_name=payload.author_name or "Anonymous",
        author_seed=_seed(),
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return _row_to_comment(comment)


@router.post("/posts/{post_id}/like", status_code=200)
async def like_post(post_id: int, payload: ReactionRequest, db: AsyncSession = Depends(get_db)):
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(404, "Post not found")

    if payload.session_token:
        existing = (await db.execute(
            select(PostReaction).where(
                PostReaction.post_id == post_id,
                PostReaction.session_token == payload.session_token,
                PostReaction.reaction_type == payload.reaction_type,
            )
        )).scalar_one_or_none()

        if existing:
            await db.delete(existing)
            post.likes = max(0, (post.likes or 0) - 1)
            await db.commit()
            return {"liked": False, "likes": post.likes}

    reaction = PostReaction(
        post_id=post_id,
        reaction_type=payload.reaction_type,
        session_token=payload.session_token,
    )
    db.add(reaction)
    post.likes = (post.likes or 0) + 1
    await db.commit()
    return {"liked": True, "likes": post.likes}


@router.get("/tags")
async def popular_tags(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(CommunityPost.tags))).scalars().all()
    counts: dict[str, int] = {}
    for tags in rows:
        for t in (tags or []):
            counts[t] = counts.get(t, 0) + 1
    sorted_tags = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:30]
    return {"tags": [{"name": t, "count": c} for t, c in sorted_tags]}
