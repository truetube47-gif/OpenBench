from sqlalchemy import Column, String, Float, Integer, JSON, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.core.database import Base


class CachedAnalysis(Base):
    __tablename__ = "cached_analyses"

    repo_id = Column(String, primary_key=True)
    data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CachedComparison(Base):
    __tablename__ = "cached_comparisons"

    id = Column(String, primary_key=True)  # sha256(model_a + model_b)
    data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BenchmarkCache(Base):
    __tablename__ = "benchmark_cache"

    repo_id = Column(String, primary_key=True)
    scores = Column(JSON)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CommunityBenchmark(Base):
    __tablename__ = "community_benchmarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(String, index=True)
    hardware_profile = Column(JSON)
    tokens_per_second = Column(Float)
    context_length = Column(Integer)
    framework = Column(String)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SharedLink(Base):
    __tablename__ = "shared_links"

    id = Column(String(8), primary_key=True)
    type = Column(String)
    params = Column(JSON)
    views = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    post_type = Column(String(20), default="experiment")  # experiment | question | discussion
    author_name = Column(String(80), default="Anonymous")
    author_seed = Column(String(16), nullable=True)       # for deterministic avatar color
    model_repo = Column(String(200), nullable=True)       # optional HF repo or local filename
    is_local = Column(Boolean, default=False)             # True = came from local file upload
    result_data = Column(JSON, nullable=True)             # ModelAnalysis or ComparisonResult snapshot
    tags = Column(JSON, default=list)
    likes = Column(Integer, default=0)
    views = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PostComment(Base):
    __tablename__ = "post_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("post_comments.id"), nullable=True)
    body = Column(Text, nullable=False)
    author_name = Column(String(80), default="Anonymous")
    author_seed = Column(String(16), nullable=True)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PostReaction(Base):
    __tablename__ = "post_reactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, nullable=False, index=True)
    reaction_type = Column(String(20), default="like")   # like | bookmark
    session_token = Column(String(64), nullable=True)    # browser fingerprint
    created_at = Column(DateTime(timezone=True), server_default=func.now())
