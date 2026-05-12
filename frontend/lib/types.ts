export type CanRunStatus = "comfortable" | "marginal" | "cannot_run" | "unknown";

export interface HardwareProfile {
  cpu_name: string;
  cpu_threads: number;
  ram_gb: number;
  gpu_name?: string | null;
  vram_gb?: number | null;
  cpu_memory_bandwidth_gbps: number;
  gpu_memory_bandwidth_gbps?: number | null;
}

export interface HardwarePreset {
  id: string;
  name: string;
  category: string;
  cpu_name: string;
  cpu_threads: number;
  ram_gb: number;
  gpu_name?: string | null;
  vram_gb?: number | null;
  cpu_memory_bandwidth_gbps: number;
  gpu_memory_bandwidth_gbps?: number | null;
}

export interface MemoryEstimate {
  weights_gb: number;
  kv_cache_gb: number;
  overhead_gb: number;
  total_gb: number;
  context_length: number;
  framework: string;
}

export interface TaskSpeedBreakdown {
  chat: string;
  coding: string;
  creative: string;
  tps: number;
  rating: string;
  description: string;
}

export interface SpeedEstimate {
  cpu_tps_min: number;
  cpu_tps_max: number;
  gpu_tps_min?: number | null;
  gpu_tps_max?: number | null;
  bottleneck: string;
  cpu_tasks?: TaskSpeedBreakdown | null;
  gpu_tasks?: TaskSpeedBreakdown | null;
}

export interface BenchmarkScores {
  mmlu?: number | null;
  mmlu_pro?: number | null;
  hellaswag?: number | null;
  arc_challenge?: number | null;
  winogrande?: number | null;
  gsm8k?: number | null;
  humaneval?: number | null;
  math_lvl5?: number | null;
  arena_elo?: number | null;
  source: string;
}

export interface CapabilityScores {
  coding: number;
  math: number;
  reasoning: number;
  creative: number;
  multilingual: number;
  long_context: number;
  speed: number;
  instruction_following: number;
}

export interface GGUFVariant {
  filename: string;
  quantization: string;
  bits_per_weight: number;
  file_size_gb: number;
  memory_estimate: MemoryEstimate;
  can_run: CanRunStatus;
}

export interface ModelAnalysis {
  repo_id: string;
  name: string;
  architecture: string;
  parameter_count: number;
  context_length: number;
  quantization: string;
  bits_per_weight: number;
  file_size_gb: number;
  n_layers: number;
  n_heads: number;
  n_kv_heads: number;
  head_dim: number;
  vocab_size: number;
  license: string;
  tags: string[];
  gguf_variants: GGUFVariant[];
  memory_estimate?: MemoryEstimate | null;
  speed_estimate?: SpeedEstimate | null;
  benchmarks?: BenchmarkScores | null;
  capability_scores?: CapabilityScores | null;
  can_run: CanRunStatus;
  wolfram_derivation?: string | null;
}

export interface WinnerSummary {
  overall: string;
  performance: string;
  efficiency: string;
  user_hardware?: string | null;
  reasoning: string;
}

export interface ComparisonResult {
  model_a: ModelAnalysis;
  model_b: ModelAnalysis;
  hardware_profile?: HardwareProfile | null;
  winner: WinnerSummary;
}

export interface LeaderboardEntry {
  repo_id: string;
  name: string;
  architecture: string;
  parameter_count: number;
  mmlu?: number | null;
  mmlu_pro?: number | null;
  arc_challenge?: number | null;
  gsm8k?: number | null;
  humaneval?: number | null;
  arena_elo?: number | null;
  avg_score?: number | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  per_page: number;
}

export interface AnalyzeRequest {
  repo_id: string;
  hardware_profile?: HardwareProfile | null;
  context_length?: number;
  framework?: string;
  use_wolfram?: boolean;
}

export interface CompareRequest {
  model_a: string;
  model_b: string;
  hardware_profile?: HardwareProfile | null;
  context_length?: number;
}

export interface GGUFVariantInfo {
  filename: string;
  quantization: string;
  size_gb: number;
  bpw: number;
  can_run: CanRunStatus;
  recommended: boolean;
  quality_tier: string;
  quality_description: string;
}

export interface ModelVariantsResponse {
  repo_id: string;
  total_variants: number;
  variants: GGUFVariantInfo[];
  recommended_filename?: string | null;
}

export interface SharedLinkCreate {
  type: "compare" | "analyze";
  params: Record<string, unknown>;
}

export interface SharedLinkResponse {
  id: string;
  type: string;
  params: Record<string, unknown>;
  views: number;
  url: string;
}

export interface CommentResponse {
  id: number;
  post_id: number;
  parent_id?: number | null;
  body: string;
  author_name: string;
  author_seed?: string | null;
  likes: number;
  created_at?: string | null;
  replies: CommentResponse[];
}

export interface PostResponse {
  id: number;
  title: string;
  body?: string | null;
  post_type: string;
  author_name: string;
  author_seed?: string | null;
  model_repo?: string | null;
  is_local: boolean;
  result_data?: Record<string, unknown> | null;
  tags: string[];
  likes: number;
  views: number;
  comment_count: number;
  created_at?: string | null;
  comments: CommentResponse[];
}

export interface PostCreate {
  title: string;
  body?: string;
  post_type?: string;
  author_name?: string;
  model_repo?: string;
  is_local?: boolean;
  result_data?: Record<string, unknown>;
  tags?: string[];
}

export interface CommentCreate {
  body: string;
  author_name?: string;
  parent_id?: number;
}

export interface PostFeedResponse {
  posts: PostResponse[];
  total: number;
  page: number;
  per_page: number;
}

export interface ModelCatalogEntry {
  name: string;
  repo_id: string;
  param_count: number;
  architecture: string;
  n_layers: number;
  n_kv_heads: number;
  head_dim: number;
  context_length: number;
  tags: string[];
}

export interface ModelCompatibilityResult {
  name: string;
  repo_id: string;
  param_count: number;
  architecture: string;
  tags: string[];
  recommended_quant: string;
  status: "comfortable" | "marginal" | "cannot_run" | "unknown";
  required_gb: number;
  available_gb: number;
  expected_tps?: number | null;
  max_safe_context: number;
  recommended_backend: string;
  warnings: string[];
}

export interface HardwareCheckResponse {
  hardware: HardwareProfile;
  models: ModelCompatibilityResult[];
  total: number;
  comfortable_count: number;
  marginal_count: number;
  cannot_run_count: number;
}
