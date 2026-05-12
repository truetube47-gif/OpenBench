<div align="center">

<img src="frontend/public/pngtree-eurasian-eagle-owl-png-image_12527751-removebg-preview.png" alt="OpenBench Owl" width="110" height="110" />

# OpenBench

### Can I Run This LLM? Find Out in Seconds.

**The open-source deployment intelligence platform for local LLMs.**
Realistic VRAM estimation, quantization selection, hardware compatibility checks, and inference speed prediction — all from your browser.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776AB.svg)](https://python.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com)

[Live Demo](https://openbench.ai) &bull; [API Docs](https://openbench.ai/docs) &bull; [Report Bug](https://github.com/truetube47-gif/openbench/issues/new?template=bug_report.md) &bull; [Request Feature](https://github.com/truetube47-gif/openbench/issues/new?template=feature_request.md)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## The Problem

You found a model on HuggingFace. Now what?

- *"Will this fit in my 8GB VRAM?"*
- *"Which quantization should I pick — Q4_K_M? IQ4_XS? Q5_K_S?"*
- *"How fast will it actually run on my hardware?"*
- *"Can I run this on CPU only? How bad is it?"*

**Every local AI enthusiast asks these questions daily.** The answers are scattered across Reddit threads, GitHub discussions, and trial-and-error. Until now.

## The Solution

OpenBench answers **"Can I run this?"** instantly:

| You ask | OpenBench answers |
|---------|-------------------|
| *"Can I run Qwen3-14B on my RTX 3060?"* | ✅ Q4_K_M fits in 11.2 GB — expect ~38 tok/s |
| *"Which quant for 8 GB VRAM?"* | IQ4_XS — best quality at your budget |
| *"Does it work on CPU only?"* | Yes — 4.2 tok/s on Ryzen, needs 18 GB RAM |
| *"llama.cpp or Ollama?"* | llama.cpp — copy-paste command included |
| *"How does my fine-tune compare?"* | Upload the .gguf header — analysis in 2 seconds |

---

## Features

### Hardware Compatibility Checker
Select your hardware (or auto-detect it) and instantly see which of 20+ popular models you can run, at which quantization, and how fast.

### VRAM & Memory Estimation
Physics-based formulas: `weights + KV cache + framework overhead`. Not vibes — actual math you can verify.

```
Total = (params x bpw / 8) + (2 x layers x kv_heads x head_dim x ctx x 2 / 1e9) + overhead
```

### Quantization Ladder
Every GGUF variant from IQ1_S to F32, with per-quant memory bars, speed estimates, and a recommended badge for your hardware.

### Speed Prediction
LLM inference is memory-bandwidth bound. We calculate tok/s from `bandwidth / model_size x efficiency` — validated against real-world measurements.

### Model Comparison
Side-by-side analysis: benchmark scores, capability radar, quant ladders, speed estimates, and an AI-generated winner summary.

**Built for model surgery workflows.** After fine-tuning, abliteration, LoRA merging, or DARE/TIES blending, models can silently lose capabilities in reasoning, coding, or instruction-following. OpenBench surfaces these regressions without subjective prompting — just upload both GGUFs and let the benchmarks speak.

| Workflow | What to compare |
|----------|-----------------|
| Fine-tuned model | Your fine-tune vs. base — did training degrade general reasoning? |
| [Abliterated](https://colab.research.google.com/github/elder-plinius/OBLITERATUS/blob/main/notebooks/abliterate.ipynb) model | Pre/post — which benchmarks dropped after capability removal? |
| LoRA merge | Merged model vs. base — capability leakage from the adapter? |
| Quantized + fine-tuned | Q4 fine-tune vs. Q4 base — quality loss from quant or from training? |

### Local GGUF Analysis
Upload the first 2 MB of any `.gguf` file — get full analysis without HuggingFace, without downloading the whole model.

**Works with private and unpublished models.** No repository required. Ideal for:
- Locally fine-tuned checkpoints not yet shared anywhere
- Post-abliteration variants you want to evaluate before publishing
- LoRA-merged or DARE/TIES blended models
- Custom quantizations produced with `llama.cpp` conversion scripts

### Community Benchmarks
Crowd-sourced tok/s measurements organized by model + hardware + quantization + framework. Real numbers from real users.

### SEO-Optimized Pages
40+ pre-rendered pages targeting deployment-intent searches:
- `/models/llama-3-1-8b` — "Can I run Llama 3.1 8B locally?"
- `/hardware/rtx-3060-12gb` — "Best LLM for RTX 3060"
- `/compare/qwen3-14b-vs-deepseek-r1-14b` — head-to-head comparisons

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2 |
| **Database** | SQLite + async (aiosqlite, SQLAlchemy) |
| **Cache** | In-memory TTL cache with stats + periodic cleanup |
| **External** | HuggingFace API, Wolfram Alpha (optional) |
| **Security** | Rate limiting (slowapi), request size guards, CORS hardening, input validation |
| **Testing** | pytest (44 deterministic tests for estimator formulas) |

---

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env          # Add HF_TOKEN for higher API limits
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — done.

### Docker (both together)

```bash
docker compose up --build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ENV` | No | `development` / `production` / `testing` |
| `HF_TOKEN` | Recommended | HuggingFace token (5000 req/day vs 250) |
| `WOLFRAM_APP_ID` | No | Symbolic memory derivations |
| `CORS_ORIGINS` | No | JSON array of allowed origins |
| `RATE_LIMIT_DEFAULT` | No | Default: `30/minute` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_BASE_URL` | No | Canonical URL for SEO |

---

## Architecture

```
OpenBench/
├── backend/
│   ├── app/
│   │   ├── core/           # config, cache, database, logging, validation
│   │   ├── models/         # Pydantic schemas + SQLAlchemy models
│   │   ├── utils/          # GGUF parser, memory estimator, speed estimator
│   │   ├── services/       # HF client, analyzer, comparator, Wolfram
│   │   └── routers/        # analyze, compare, leaderboard, hardware, community
│   ├── tests/              # 44 deterministic unit tests
│   └── main.py             # FastAPI app with middleware stack
├── frontend/
│   ├── app/                # Next.js App Router (40+ pages)
│   ├── components/         # Reusable UI components
│   └── lib/                # API client, types, utilities
├── .github/                # Issue templates
├── LICENSE                 # MIT
├── CONTRIBUTING.md
├── SECURITY.md
└── CODE_OF_CONDUCT.md
```

### Request Flow

```
Browser → Next.js (SSR + ISR) → FastAPI → Cache (hit?) → SQLite / HuggingFace API
                                       ↓
                              Rate limit → Validate → Respond
```

---

## API Highlights

| Endpoint | What it does |
|----------|-------------|
| `POST /api/v1/analyze` | Full model analysis from repo ID |
| `POST /api/v1/analyze/local` | Analyze local GGUF (2 MB upload) |
| `POST /api/v1/compare` | Side-by-side comparison |
| `POST /api/v1/hardware-check` | Batch compatibility for your hardware |
| `GET /api/v1/leaderboard` | Benchmark leaderboard (paginated) |
| `GET /health` | Health + cache stats |

Full API docs at `/docs` (development mode).

---

## Roadmap

- [x] Core analysis engine (GGUF parsing, memory/speed estimation)
- [x] Hardware compatibility checker (20+ presets)
- [x] Model comparison with winner summary
- [x] Community benchmarks and discussion
- [x] SEO infrastructure (40+ pages, sitemap, structured data)
- [x] Rate limiting, logging, input validation
- [ ] GPU auto-detection improvements (WebGPU API)
- [ ] Redis cache backend option
- [ ] Model recommendation engine ("best model for X task + Y budget")
- [ ] API keys for third-party integrations
- [ ] Browser extension ("Check compatibility" on HuggingFace)
- [ ] Mobile-optimized UI
- [ ] Ollama integration (pull + run from OpenBench)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

**High-impact areas:**
- Real-world tok/s measurements to validate speed formulas
- New hardware bandwidth data (especially AMD, Intel Arc)
- Model catalog expansion
- Bug reports for incorrect VRAM estimates

---

## Disclaimer

All performance estimates are calculated from published specifications and bandwidth-bound formulas — not live benchmarks. Actual performance varies by driver, OS, build flags, and workload. Use as a starting point, verify on your hardware.

---

## License

[MIT](LICENSE) — use it however you want.

---

<div align="center">

**If this project helps you pick the right model for your hardware, consider giving it a star.**

Made with precision by the OpenBench team.

</div>
