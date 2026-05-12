# Contributing to OpenBench

Thank you for your interest in contributing! OpenBench is an open-source LLM deployment intelligence platform.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Set up the backend and frontend (see [README.md](README.md))
4. Create a feature branch from `main`

## Development Setup

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Pull Request Guidelines

- **One feature per PR** — keep changes focused
- **Include tests** for new backend logic (especially estimator formulas)
- **Run `npx tsc --noEmit`** before submitting frontend changes
- **Run `pytest`** before submitting backend changes
- **Follow existing code style** — no linter config changes without discussion
- **Update docs** if your change affects the public API or architecture

## What We're Looking For

- **Model catalog expansion** — add new models to `hardware_check.py` catalog
- **Estimator accuracy** — real-world tok/s measurements to validate formulas
- **Hardware bandwidth data** — verified GPU/CPU bandwidth values
- **Bug reports** — especially incorrect VRAM estimates or compatibility verdicts
- **SEO improvements** — new static pages, structured data, comparison content

## Reporting Issues

Use the issue templates:
- **Bug Report** — something is broken or incorrect
- **Model Mismatch** — VRAM estimate or compatibility verdict is wrong
- **Feature Request** — new functionality

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
