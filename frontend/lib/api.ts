import type {
  ModelAnalysis,
  ComparisonResult,
  LeaderboardResponse,
  HardwarePreset,
  AnalyzeRequest,
  CompareRequest,
  ModelVariantsResponse,
  SharedLinkCreate,
  SharedLinkResponse,
  PostCreate,
  PostResponse,
  PostFeedResponse,
  CommentCreate,
  CommentResponse,
  HardwareProfile,
  HardwareCheckResponse,
  ModelCatalogEntry,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES_GET = 2;
const RETRY_DELAY_MS = 1_000;

class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const method = (options?.method ?? "GET").toUpperCase();
  const isRetryable = method === "GET";
  const maxAttempts = isRetryable ? MAX_RETRIES_GET + 1 : 1;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text();
        throw new ApiError(res.status, body);
      }
      return res.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (!isRetryable || attempt === maxAttempts - 1) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("API request failed");
}

export async function analyzeModel(req: AnalyzeRequest): Promise<ModelAnalysis> {
  return apiFetch<ModelAnalysis>("/api/v1/analyze", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function compareModels(req: CompareRequest): Promise<ComparisonResult> {
  return apiFetch<ComparisonResult>("/api/v1/compare", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getLeaderboard(params: {
  page?: number;
  per_page?: number;
  arch?: string;
  sort_by?: string;
}): Promise<LeaderboardResponse> {
  const qs = new URLSearchParams();
  if (params.page   != null) qs.set("page",     String(params.page));
  if (params.per_page != null) qs.set("per_page", String(params.per_page));
  if (params.arch)   qs.set("arch",     params.arch);
  if (params.sort_by) qs.set("sort_by",  params.sort_by);
  return apiFetch<LeaderboardResponse>(`/api/v1/leaderboard?${qs}`);
}

export async function getHardwarePresets(): Promise<HardwarePreset[]> {
  return apiFetch<HardwarePreset[]>("/api/v1/leaderboard/hardware/presets");
}

export async function submitCommunityBenchmark(payload: {
  repo_id: string;
  hardware_profile: object;
  tokens_per_second: number;
  context_length: number;
  framework: string;
  notes?: string;
}): Promise<{ success: boolean; id: number }> {
  return apiFetch("/api/v1/leaderboard/community/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCommunityBenchmarks(repoId: string) {
  return apiFetch(`/api/v1/leaderboard/community/${repoId}`);
}

export async function getModelVariants(
  repoId: string,
  ramGb = 16
): Promise<ModelVariantsResponse> {
  const [owner, ...rest] = repoId.split("/");
  const repo = rest.join("/");
  return apiFetch<ModelVariantsResponse>(
    `/api/v1/models/${owner}/${repo}/variants?ram_gb=${ramGb}`
  );
}

export async function createShare(
  payload: SharedLinkCreate
): Promise<SharedLinkResponse> {
  return apiFetch<SharedLinkResponse>("/api/v1/share", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getShare(id: string): Promise<SharedLinkResponse> {
  return apiFetch<SharedLinkResponse>(`/api/v1/share/${id}`);
}

export async function getCommunityFeed(params: {
  page?: number;
  tag?: string;
  post_type?: string;
  search?: string;
}): Promise<PostFeedResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.tag) q.set("tag", params.tag);
  if (params.post_type) q.set("post_type", params.post_type);
  if (params.search) q.set("search", params.search);
  return apiFetch<PostFeedResponse>(`/api/v1/community/posts?${q}`);
}

export async function getCommunityPost(id: number): Promise<PostResponse> {
  return apiFetch<PostResponse>(`/api/v1/community/posts/${id}`);
}

export async function createCommunityPost(payload: PostCreate): Promise<PostResponse> {
  return apiFetch<PostResponse>("/api/v1/community/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addComment(
  postId: number,
  payload: CommentCreate
): Promise<CommentResponse> {
  return apiFetch<CommentResponse>(`/api/v1/community/posts/${postId}/comment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function likePost(
  postId: number,
  sessionToken: string
): Promise<{ liked: boolean; likes: number }> {
  return apiFetch(`/api/v1/community/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({ reaction_type: "like", session_token: sessionToken }),
  });
}

export async function getCommunityTags(): Promise<{ tags: { name: string; count: number }[] }> {
  return apiFetch("/api/v1/community/tags");
}

export async function hardwareCheck(hw: HardwareProfile): Promise<HardwareCheckResponse> {
  return apiFetch<HardwareCheckResponse>("/api/v1/hardware-check", {
    method: "POST",
    body: JSON.stringify({ hardware_profile: hw }),
  });
}

export async function getModelCatalog(): Promise<ModelCatalogEntry[]> {
  return apiFetch<ModelCatalogEntry[]>("/api/v1/hardware-check/catalog");
}

export async function analyzeLocalFile(
  file: File,
  hardware: Record<string, unknown>,
  contextLength = 8192,
  framework = "llama.cpp"
): Promise<ModelAnalysis> {
  const HEADER_SIZE = 2 * 1024 * 1024;
  const slice = file.slice(0, HEADER_SIZE);
  const form = new FormData();
  form.append("file", new File([slice], file.name, { type: "application/octet-stream" }));
  form.append("hardware_json", JSON.stringify(hardware));
  form.append("context_length", String(contextLength));
  form.append("framework", framework);

  const res = await fetch(`${API_BASE}/api/v1/analyze/local`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Local analysis failed");
  }
  return res.json();
}
