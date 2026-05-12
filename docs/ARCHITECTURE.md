# VRAMfit — Architecture Guide

This document defines the conventions that all contributors and AI coding agents must follow.  
Its purpose is to prevent drift across sessions and maintain a coherent codebase.

---

## 1. Project Philosophy

VRAMfit is a **deployment intelligence platform**, not a benchmark leaderboard.  
Every feature must answer one of these user questions:

- "Can I run this on my hardware?"
- "Which quant gives the best quality I can afford?"
- "How fast will it actually be?"
- "What's the best way to run it?"

Features that don't serve these questions belong in the Community section, not the core product.

---

## 2. Directory Layout

```
backend/app/
├── core/
│   ├── config.py        # Settings (pydantic-settings), env vars
│   ├── database.py      # SQLAlchemy async engine + session factory
│   └── cache.py         # In-memory TTL cache (async-safe dict)
├── models/
│   ├── db_models.py     # SQLAlchemy ORM models (snake_case table names)
│   └── schemas.py       # Pydantic v2 schemas (all response/request types)
├── utils/
│   ├── gguf_header_parser.py   # Binary GGUF header reader (no full download)
│   ├── memory_estimator.py     # VRAM/RAM estimation formulas
│   └── speed_estimator.py      # tok/s estimation + task breakdown
├── services/
│   ├── hf_client.py            # HuggingFace API calls (always uses hf_headers)
│   ├── gguf_analyzer.py        # Full model analysis pipeline
│   ├── comparator.py           # Two-model comparison logic
│   ├── benchmark_fetcher.py    # Open LLM Leaderboard data
│   └── wolfram.py              # Optional Wolfram derivation
└── routers/
    ├── analyze.py          # POST /analyze, GET /analyze/{owner}/{repo}, POST /analyze/local
    ├── compare.py          # POST /compare
    ├── leaderboard.py      # GET /leaderboard, POST /community/submit
    ├── models.py           # GET /models/{owner}/{repo}/variants
    ├── share.py            # POST /share, GET /share/{id}
    ├── community.py        # Community posts, comments, reactions
    └── hardware_check.py   # POST /hardware-check, GET /hardware-check/catalog

frontend/
├── app/                    # Next.js App Router pages (one folder = one route)
├── components/             # Reusable UI components (PascalCase filenames)
└── lib/
    ├── api.ts              # All fetch calls — NO fetch calls anywhere else
    ├── types.ts            # TypeScript mirrors of all Pydantic schemas
    └── utils.ts            # cn(), formatParams(), canRunColor() etc.
```

---

## 3. Naming Conventions

### Backend (Python)
| Type | Convention | Example |
|---|---|---|
| Files | `snake_case.py` | `hardware_check.py` |
| Classes | `PascalCase` | `ModelCompatibilityResult` |
| Functions | `snake_case` | `compute_model_compat()` |
| DB table names | `snake_case` | `community_posts` |
| Env vars | `UPPER_SNAKE` | `HF_TOKEN` |
| Router prefix | `/api/v1/<resource>` | `/api/v1/hardware-check` |
| Pydantic models with `model_` fields | Add `model_config = ConfigDict(protected_namespaces=())` |

### Frontend (TypeScript)
| Type | Convention | Example |
|---|---|---|
| Pages | `page.tsx` inside route folder | `app/run-check/page.tsx` |
| Components | `PascalCase.tsx` | `RunRecipes.tsx` |
| Hooks | `use<Name>.ts` | `useHardwareStore.ts` |
| Utility functions | `camelCase` | `formatParams()` |
| CSS classes | Tailwind only — no custom CSS unless absolutely necessary |
| API calls | Only in `lib/api.ts` — never inline `fetch()` in components |

---

## 4. API Contract Rules

1. **All routes return Pydantic schemas** — never raw dicts.
2. **All routes use `response_model=`** — enables automatic validation + docs.
3. **Error responses always include `detail`** — `raise HTTPException(status_code=..., detail="...")`
4. **Cache before HF** — check SQLite/memory cache before any external API call.
5. **HF token always via `settings.hf_headers`** — never hardcode.
6. **POST for mutations, GET for reads** — no exceptions.
7. **Paginated responses always include `total`, `page`, `per_page`**.

---

## 5. Database Schema Rules

- All ORM models in `db_models.py` only — no ad-hoc table definitions in routers.
- Use `DateTime` with `default=func.now()` for timestamps.
- Foreign keys always have `ondelete="CASCADE"`.
- JSON columns use `JSON` type (SQLAlchemy) — not raw `String`.
- Never store binary blobs in SQLite — use file paths.
- Migrations: `init_db()` uses `create_all` — for schema changes, document them in `ROADMAP.md`.

---

## 6. Frontend Component Rules

- **Props interfaces** must be defined above the component (not inline).
- **No `any` types** — use proper TypeScript types from `lib/types.ts`.
- **All API calls go through `lib/api.ts`** — components call `api.*` functions only.
- **`cn()` from `lib/utils`** for conditional class merging.
- **Loading states** use `<Loader2 className="animate-spin" />` from lucide-react.
- **Error states** use the red pill pattern: `rounded-xl border border-red-500/30 bg-red-500/10 text-red-400`.
- **Tailwind design tokens** (defined in `tailwind.config`):
  - `bench-bg` — page background
  - `bench-card` — card/panel background
  - `bench-surface` — input/secondary background
  - `bench-border` — default border
  - `bench-text` — primary text
  - `bench-muted` — secondary text
  - `bench-accent` — indigo primary action color

---

## 7. Caching Standards

| Layer | Mechanism | TTL | Use For |
|---|---|---|---|
| In-memory | `app/core/cache.py` | 1 hour | Hardware-check, leaderboard, HF metadata |
| SQLite | `CachedAnalysis` table | permanent | Full model analysis results |

- **Do not cache community content** — it must be fresh.
- **Cache keys** must include all parameters that affect the result.
- **Cache writes** are best-effort — never block the response on a cache write failure.

---

## 8. Error Handling Rules

- Backend: always use `HTTPException` with a meaningful `detail` string.
- Backend: log exceptions with `logger.exception()` before re-raising.
- Frontend: catch API errors and show inline error messages — never silent failures.
- Frontend: loading spinners for any operation > 100ms estimated latency.

---

## 9. New Feature Checklist

Before adding a feature:
- [ ] Does it answer a deployment intelligence question?
- [ ] Is the Pydantic schema defined in `schemas.py`?
- [ ] Is the TypeScript type in `lib/types.ts`?
- [ ] Is the API function in `lib/api.ts`?
- [ ] Is the router registered in `main.py`?
- [ ] Does the endpoint have `response_model=`?
- [ ] Is there a cache check before any external call?
- [ ] Is the feature listed in `ROADMAP.md`?
