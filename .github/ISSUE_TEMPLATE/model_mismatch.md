---
name: Model Mismatch / Incorrect Estimate
about: VRAM estimate, speed prediction, or compatibility verdict is incorrect
title: "[Estimate] "
labels: estimate-accuracy
assignees: ''
---

## Model
- **Repo ID:** (e.g., `bartowski/Qwen3-14B-GGUF`)
- **Quantization:** (e.g., Q4_K_M)

## Hardware
- **GPU:** (e.g., RTX 3060 12GB)
- **RAM:** (e.g., 32GB DDR4)
- **CPU:** (e.g., i7-12700)

## What OpenBench predicted
- **VRAM needed:** X GB
- **Can run status:** comfortable / marginal / cannot_run
- **Speed:** X tok/s

## What actually happened
- **Actual VRAM usage:** X GB
- **Did it run?** Yes / No
- **Actual speed:** X tok/s
- **Framework used:** (e.g., llama.cpp, Ollama)

## Additional context
How you measured (e.g., `nvidia-smi`, llama.cpp output, Activity Monitor).
