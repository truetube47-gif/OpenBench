from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Tuple, Any
from enum import Enum


class CanRunStatus(str, Enum):
    COMFORTABLE = "comfortable"
    MARGINAL = "marginal"
    CANNOT_RUN = "cannot_run"
    UNKNOWN = "unknown"


class HardwareProfile(BaseModel):
    cpu_name: str = "Generic CPU"
    cpu_threads: int = 8
    ram_gb: float = 16.0
    gpu_name: Optional[str] = None
    vram_gb: Optional[float] = None
    cpu_memory_bandwidth_gbps: float = 50.0
    gpu_memory_bandwidth_gbps: Optional[float] = None


class MemoryEstimate(BaseModel):
    weights_gb: float
    kv_cache_gb: float
    overhead_gb: float
    total_gb: float
    context_length: int
    framework: str = "llama.cpp"


class TaskSpeedBreakdown(BaseModel):
    chat: str
    coding: str
    creative: str
    tps: float
    rating: str
    description: str


class SpeedEstimate(BaseModel):
    cpu_tps_min: float
    cpu_tps_max: float
    gpu_tps_min: Optional[float] = None
    gpu_tps_max: Optional[float] = None
    bottleneck: str = "memory_bandwidth"
    cpu_tasks: Optional[TaskSpeedBreakdown] = None
    gpu_tasks: Optional[TaskSpeedBreakdown] = None


class BenchmarkScores(BaseModel):
    mmlu: Optional[float] = None
    mmlu_pro: Optional[float] = None
    hellaswag: Optional[float] = None
    arc_challenge: Optional[float] = None
    winogrande: Optional[float] = None
    gsm8k: Optional[float] = None
    humaneval: Optional[float] = None
    math_lvl5: Optional[float] = None
    arena_elo: Optional[float] = None
    source: str = "unknown"


class CapabilityScores(BaseModel):
    coding: float = 50.0
    math: float = 50.0
    reasoning: float = 50.0
    creative: float = 50.0
    multilingual: float = 50.0
    long_context: float = 50.0
    speed: float = 50.0
    instruction_following: float = 50.0


class GGUFVariant(BaseModel):
    filename: str
    quantization: str
    bits_per_weight: float
    file_size_gb: float
    memory_estimate: MemoryEstimate
    can_run: CanRunStatus


class ModelAnalysis(BaseModel):
    repo_id: str
    name: str
    architecture: str = "unknown"
    parameter_count: int = 0
    context_length: int = 4096
    quantization: str = "unknown"
    bits_per_weight: float = 8.0
    file_size_gb: float = 0.0
    n_layers: int = 32
    n_heads: int = 32
    n_kv_heads: int = 8
    head_dim: int = 128
    vocab_size: int = 32000
    license: str = "unknown"
    tags: List[str] = []
    gguf_variants: List[GGUFVariant] = []
    memory_estimate: Optional[MemoryEstimate] = None
    speed_estimate: Optional[SpeedEstimate] = None
    benchmarks: Optional[BenchmarkScores] = None
    capability_scores: Optional[CapabilityScores] = None
    can_run: CanRunStatus = CanRunStatus.UNKNOWN
    wolfram_derivation: Optional[str] = None


class CompareRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_a: str = Field(..., description="HuggingFace repo ID, e.g. bartowski/Llama-3.2-3B-Instruct-GGUF")
    model_b: str
    hardware_profile: Optional[HardwareProfile] = None
    context_length: int = 8192


class AnalyzeRequest(BaseModel):
    repo_id: str
    hardware_profile: Optional[HardwareProfile] = None
    context_length: int = 8192
    framework: str = "llama.cpp"
    use_wolfram: bool = False


class WinnerSummary(BaseModel):
    overall: str
    performance: str
    efficiency: str
    user_hardware: Optional[str] = None
    reasoning: str


class ComparisonResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_a: ModelAnalysis
    model_b: ModelAnalysis
    hardware_profile: Optional[HardwareProfile] = None
    winner: WinnerSummary


class CommunityBenchmarkSubmit(BaseModel):
    repo_id: str
    hardware_profile: HardwareProfile
    tokens_per_second: float
    context_length: int
    framework: str = "llama.cpp"
    notes: Optional[str] = None


class LeaderboardEntry(BaseModel):
    repo_id: str
    name: str
    architecture: str
    parameter_count: int
    mmlu: Optional[float] = None
    mmlu_pro: Optional[float] = None
    arc_challenge: Optional[float] = None
    gsm8k: Optional[float] = None
    humaneval: Optional[float] = None
    arena_elo: Optional[float] = None
    avg_score: Optional[float] = None


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    total: int
    page: int
    per_page: int


class HardwarePreset(BaseModel):
    id: str
    name: str
    category: str
    cpu_name: str
    cpu_threads: int
    ram_gb: float
    gpu_name: Optional[str] = None
    vram_gb: Optional[float] = None
    cpu_memory_bandwidth_gbps: float
    gpu_memory_bandwidth_gbps: Optional[float] = None


class WolframDerivation(BaseModel):
    formula_text: str
    step_by_step: List[str]
    result_gb: float
    source: str = "wolfram"


class GGUFVariantInfo(BaseModel):
    filename: str
    quantization: str
    size_gb: float
    bpw: float
    can_run: CanRunStatus
    recommended: bool = False
    quality_tier: str = "medium"
    quality_description: str = ""


class ModelVariantsResponse(BaseModel):
    repo_id: str
    total_variants: int
    variants: List[GGUFVariantInfo]
    recommended_filename: Optional[str] = None


class SharedLinkCreate(BaseModel):
    type: str
    params: Dict


class SharedLinkResponse(BaseModel):
    id: str
    type: str
    params: Dict
    views: int = 0
    url: str


class PostCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    title: str = Field(..., max_length=200)
    body: Optional[str] = None
    post_type: str = "experiment"
    author_name: str = "Anonymous"
    model_repo: Optional[str] = None
    is_local: bool = False
    result_data: Optional[Dict] = None
    tags: List[str] = []


class CommentResponse(BaseModel):
    id: int
    post_id: int
    parent_id: Optional[int] = None
    body: str
    author_name: str
    author_seed: Optional[str] = None
    likes: int = 0
    created_at: Optional[str] = None
    replies: List["CommentResponse"] = []


class PostResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: int
    title: str
    body: Optional[str] = None
    post_type: str
    author_name: str
    author_seed: Optional[str] = None
    model_repo: Optional[str] = None
    is_local: bool = False
    result_data: Optional[Dict] = None
    tags: List[str] = []
    likes: int = 0
    views: int = 0
    comment_count: int = 0
    created_at: Optional[str] = None
    comments: List[CommentResponse] = []


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)
    author_name: str = "Anonymous"
    parent_id: Optional[int] = None


class ReactionRequest(BaseModel):
    reaction_type: str = "like"
    session_token: Optional[str] = None


class PostFeedResponse(BaseModel):
    posts: List[PostResponse]
    total: int
    page: int
    per_page: int


CommentResponse.model_rebuild()


# ---------------------------------------------------------------------------
# Hardware-check schemas
# ---------------------------------------------------------------------------

class ModelCatalogEntry(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str
    repo_id: str
    param_count: int
    architecture: str
    n_layers: int = 32
    n_kv_heads: int = 8
    head_dim: int = 128
    context_length: int = 8192
    tags: List[str] = []


class ModelCompatibilityResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str
    repo_id: str
    param_count: int
    architecture: str
    tags: List[str]
    recommended_quant: str
    status: CanRunStatus
    required_gb: float
    available_gb: float
    expected_tps: Optional[float] = None
    max_safe_context: int = 4096
    recommended_backend: str = "llama.cpp"
    warnings: List[str] = []


class HardwareCheckRequest(BaseModel):
    hardware_profile: HardwareProfile


class HardwareCheckResponse(BaseModel):
    hardware: HardwareProfile
    models: List[ModelCompatibilityResult]
    total: int
    comfortable_count: int = 0
    marginal_count: int = 0
    cannot_run_count: int = 0
