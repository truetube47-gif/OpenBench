# OpenBench — Product Roadmap

OpenBench's mission: **become the PCPartPicker of local LLM deployment.**

---

## Phase 1 — Core Engine ✅ COMPLETE

> Goal: Make the fundamental analysis trustworthy and fast.

- [x] GGUF binary header parsing (HTTP Range — no full download)
- [x] Realistic VRAM estimation (weights + KV cache + framework overhead)
- [x] Quantization ladder (IQ1 → F32 with per-quant RAM bars)
- [x] Context-length KV cache scaling
- [x] CPU-only viability detection
- [x] Side-by-side model comparison
- [x] AI-generated winner summary
- [x] Open LLM Leaderboard v2 integration
- [x] Hardware preset library (20+ configs)
- [x] Wolfram symbolic memory derivation (optional)
- [x] SQLite analysis cache (avoids repeat HF API calls)

---

## Phase 2 — Hardware Wizard & Developer Tools ✅ COMPLETE

> Goal: Make the platform indispensable for developers.

- [x] Auto hardware detection (WebGL GPU, deviceMemory, hardwareConcurrency)
- [x] GGUF variant auto-discovery (`GET /models/{owner}/{repo}/variants`)
- [x] Per-task speed breakdown (Chat / Coding / Creative ratings)
- [x] Shareable report links (`/share/ID`)
- [x] Community real-world tok/s submissions
- [x] Capability radar chart
- [x] Local GGUF analysis (`POST /analyze/local`) — no HF account needed
- [x] SEO + Open Graph metadata
- [x] Dark/Light mode toggle

---

## Phase 3 — Community Stack ✅ COMPLETE

> Goal: Build the social layer for knowledge sharing.

- [x] Community feed (experiments, questions, discussions)
- [x] Threaded comments (3 levels)
- [x] Like reactions (session-based, no auth required)
- [x] Tag filtering + popular tags sidebar
- [x] "Share to Community" from analysis/comparison results
- [x] Embedded ModelAnalysis card in community posts
- [x] Embed badge generator (`/badge`)
- [x] Export PNG/PDF (html2canvas + jsPDF)

---

## Phase 4 — Deployment Intelligence (NEXT) 🔄

> Goal: Make "Can I Run This?" absurdly good — the killer differentiator.

- [x] "Can I Run This?" batch compatibility page (`/run-check`)
- [x] Inference recipe generator (Ollama/llama.cpp/vLLM/Transformers commands)
- [x] Framework compatibility matrix (flash attn, speculative decoding, MoE, RoPE)
- [ ] Thermal & power budget warnings (sustained workloads)
- [ ] Unified memory (Apple M-series) specific guidance
- [ ] NUMA / multi-socket CPU detection
- [ ] Partial GPU offload visualizer (layer-by-layer VRAM allocation)
- [ ] Context-vs-speed tradeoff chart (interactive slider)
- [ ] "Best model for my budget" recommender
- [ ] SEO auto-pages: `/can-rtx-3060-run-qwen3-14b`, `/best-models-for-16gb-vram`

---

## Phase 5 — Benchmark Intelligence 📋

> Goal: Make the benchmark data more trustworthy than any existing leaderboard.

- [ ] Community tok/s aggregation with statistical outlier removal
- [ ] Hardware-normalized performance scores
- [ ] `POST /api/v1/benchmark` — structured benchmark submission with validation
- [ ] Benchmark confidence intervals (sample size + variance)
- [ ] Real-world fit scores beyond academic benchmarks:
  - Coding (HumanEval + live coding tasks)
  - Long-context faithfulness (RULER, HELMET)
  - Instruction-following (IFEval)
  - Agentic tool use
- [ ] Model version tracking (quantized vs base vs instruct vs fine-tuned)

---

## Phase 6 — Developer Platform 💼

> Goal: Make OpenBench useful in CI/CD and professional workflows.

- [ ] `POST /api/v1/evaluate` — automated fine-tune evaluation pipeline
- [ ] GitHub Action: `openbench/analyze-action` — run analysis in CI
- [ ] Private reports (Pro tier) — shareable only with a secret token
- [ ] Model certification badge (verified analysis by OpenBench)
- [ ] API key authentication for high-volume programmatic access
- [ ] Webhook notifications when analysis completes
- [ ] Compare fine-tune vs base model automatically

---

## Phase 7 — SEO & Growth 🚀

> Goal: Capture organic search traffic from local LLM compatibility questions.

- [ ] Auto-generated pages: `/can-{gpu}-run-{model}`
- [ ] Auto-generated pages: `/best-models-for-{vram}gb-vram`
- [ ] Auto-generated pages: `/compare/{model-a}-vs-{model-b}`
- [ ] OpenGraph image generation (dynamic cards per report)
- [ ] Sitemap auto-generation from cache
- [ ] Schema.org structured data for model pages

---

## Technical Debt / Infrastructure

- [ ] Optional Redis cache layer (currently: in-memory dict — Redis URL via `REDIS_URL` env var)
- [ ] Rate limiting middleware (per-IP for `/analyze` — HF API costs)
- [ ] Async task queue (Celery/ARQ) for long-running analyses
- [ ] Database migrations (Alembic) — currently `create_all` on startup
- [ ] Test suite (pytest + httpx + pytest-asyncio)
- [ ] Docker image optimization (multi-stage build)
- [ ] CDN for static assets

---

## Monetization Path (When Ready)

**Free tier:**
- Unlimited comparisons and analysis
- Public community posts
- Shareable reports

**Pro tier (future):**
- Private reports + secret sharing
- Automated fine-tune evaluation
- CI/CD benchmark integration
- Model certification badge
- Priority analysis queue

> Note: Ads are explicitly out of scope. The platform should remain clean and developer-focused.
