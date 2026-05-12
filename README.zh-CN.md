<div align="center">

<img src="frontend/public/pngtree-eurasian-eagle-owl-png-image_12527751-removebg-preview.png" alt="VRAMfit Owl" width="110" height="110" />

# VRAMfit

### 我能运行这个 LLM 吗？几秒钟出答案。

**开源本地大模型部署智能平台。为你的显存找到完美适配。**
真实的显存估算、量化选择、硬件兼容性检查、推理速度预测 —— 直接在浏览器完成。

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](../CONTRIBUTING.md)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776AB.svg)](https://python.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com)

[在线演示](https://vramfit.ai) &bull; [API 文档](https://vramfit.ai/docs)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## 问题

你在 HuggingFace 上发现了一个模型。然后呢？

- *"8GB 显存能跑吗？"*
- *"该选哪个量化 —— Q4_K_M？IQ4_XS？Q5_K_S？"*
- *"在我的硬件上实际速度是多少？"*
- *"CPU 能跑吗？有多慢？"*

**每个本地 AI 玩家每天都在问这些问题。** 答案散落在 Reddit、GitHub 讨论区和反复试错中。直到现在。

## 解决方案

VRAMfit 瞬间回答 **"我能跑这个吗？"**：

| 你问 | VRAMfit 回答 |
|---------|-------------------|
| *"RTX 3060 能跑 Qwen3-14B 吗？"* | ✅ Q4_K_M 只需 11.2 GB —— 约 38 tok/s |
| *"8 GB 显存选哪个量化？"* | IQ4_XS —— 预算内最佳质量 |
| *"CPU 能跑吗？"* | 能 —— Ryzen 约 4.2 tok/s，需要 18 GB 内存 |
| *"用 llama.cpp 还是 Ollama？"* | llama.cpp —— 附带复制粘贴命令 |
| *"我的微调模型对比如何？"* | 上传 .gguf 头文件 —— 2 秒出分析 |

---

## 功能

### 硬件兼容性检查器
选择你的硬件（或自动检测），立即查看 20+ 热门模型中哪些可以运行、该用哪个量化、速度如何。

### 显存与内存估算
基于物理的公式：`权重 + KV 缓存 + 框架开销`。不是凭感觉 —— 是你可以验证的数学。

```
总计 = (参数量 × bpw / 8) + (2 × 层数 × kv头数 × 头维度 × 上下文 × 2 / 1e9) + 开销
```

### 量化阶梯
从 IQ1_S 到 F32 的每个 GGUF 变体，带内存条、速度估算和针对你硬件的推荐徽章。

### 速度预测
LLM 推理受内存带宽限制。我们按 `带宽 / 模型大小 × 效率` 计算 tok/s —— 经真实测量验证。

### 模型对比
并排分析：基准分数、能力雷达、量化阶梯、速度估算、AI 生成的获胜摘要。

**专为模型改造工作流设计。** 在微调、去能力化（abliteration）、LoRA 合并或 DARE/TIES 混合后，模型可能静默丢失推理、编程或指令跟随能力。VRAMfit 无需主观提示即可发现这些能力退化 —— 上传两个 GGUF，让基准说话。

| 工作流 | 比较对象 |
|--------|----------|
| 微调模型 | 微调版 vs. 基础版 —— 训练是否损害了通用推理？ |
| [去能力化](https://colab.research.google.com/github/elder-plinius/OBLITERATUS/blob/main/notebooks/abliterate.ipynb)模型 | 处理前后 —— 能力移除后哪些基准分数下降？ |
| LoRA 合并 | 合并模型 vs. 基础模型 —— 适配器是否导致能力泄漏？ |
| 量化 + 微调 | Q4 微调 vs. Q4 基础 —— 损失来自量化还是训练？ |

### 本地 GGUF 分析
上传任意 `.gguf` 文件的前 2 MB —— 无需 HuggingFace，无需下载整个模型即可获得完整分析。

**支持私有和未发布模型。** 无需仓库。适用于：
- 尚未分享的本地微调检查点
- 想在发布前评估的去能力化变体
- LoRA 合并或 DARE/TIES 混合模型
- 使用 `llama.cpp` 转换脚本生成的自定义量化版本

### 社区基准
众包 tok/s 测量，按模型 + 硬件 + 量化 + 框架组织。来自真实用户的真实数据。

### SEO 优化页面
40+ 预渲染页面，针对部署意图搜索：
- `/models/llama-3-1-8b` —— "本地能跑 Llama 3.1 8B 吗？"
- `/hardware/rtx-3060-12gb` —— "RTX 3060 最佳 LLM"
- `/compare/qwen3-14b-vs-deepseek-r1-14b` —— 正面对比

---

## 技术栈

| 层级 | 技术 |
|-------|-----------|
| **前端** | Next.js 14, React, TypeScript, Tailwind CSS |
| **后端** | FastAPI, Python 3.11+, Pydantic v2 |
| **数据库** | SQLite + 异步 (aiosqlite, SQLAlchemy) |
| **缓存** | 内存 TTL 缓存，带统计 + 定期清理 |
| **外部** | HuggingFace API, Wolfram Alpha (可选) |
| **安全** | 速率限制 (slowapi), 请求大小限制, CORS 加固, 输入验证 |
| **测试** | pytest (估算器公式 44 个确定性测试) |

---

## 快速开始

### 后端

```bash
cd backend
cp .env.example .env          # 添加 HF_TOKEN 获得更高 API 限额
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

打开 http://localhost:3000 —— 完成。

### Docker（前后端一起）

```bash
docker compose up --build
```

---

## 环境变量

### 后端 (`backend/.env`)

| 变量 | 必需 | 说明 |
|----------|----------|-------------|
| `ENV` | 否 | `development` / `production` / `testing` |
| `HF_TOKEN` | 推荐 | HuggingFace 令牌 (5000 次/天 vs 250) |
| `WOLFRAM_APP_ID` | 否 | 符号内存推导 |
| `CORS_ORIGINS` | 否 | 允许的源 JSON 数组 |
| `RATE_LIMIT_DEFAULT` | 否 | 默认：`30/分钟` |

### 前端 (`frontend/.env.local`)

| 变量 | 必需 | 说明 |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | 是 | 后端 URL (默认: `http://localhost:8000`) |
| `NEXT_PUBLIC_BASE_URL` | 否 | SEO 规范 URL |

---

## 架构

```
OpenBench/
├── backend/
│   ├── app/
│   │   ├── core/           # 配置、缓存、数据库、日志、验证
│   │   ├── models/         # Pydantic 模式 + SQLAlchemy 模型
│   │   ├── utils/          # GGUF 解析器、内存估算器、速度估算器
│   │   ├── services/       # HF 客户端、分析器、对比器、Wolfram
│   │   └── routers/        # 分析、对比、排行榜、硬件、社区
│   ├── tests/              # 44 个确定性单元测试
│   └── main.py             # 带中间件栈的 FastAPI 应用
├── frontend/
│   ├── app/                # Next.js App Router (40+ 页面)
│   ├── components/         # 可复用 UI 组件
│   └── lib/                # API 客户端、类型、工具
├── .github/                # Issue 模板
├── LICENSE                 # MIT
├── CONTRIBUTING.md
├── SECURITY.md
└── CODE_OF_CONDUCT.md
```

### 请求流程

```
浏览器 → Next.js (SSR + ISR) → FastAPI → 缓存 (命中?) → SQLite / HuggingFace API
                                       ↓
                              速率限制 → 验证 → 响应
```

---

## API 亮点

| 端点 | 功能 |
|----------|-------------|
| `POST /api/v1/analyze` | 从仓库 ID 完整分析模型 |
| `POST /api/v1/analyze/local` | 分析本地 GGUF (2 MB 上传) |
| `POST /api/v1/compare` | 并排对比 |
| `POST /api/v1/hardware-check` | 你的硬件批量兼容性检查 |
| `GET /api/v1/leaderboard` | 基准排行榜 (分页) |
| `GET /health` | 健康检查 + 缓存统计 |

完整 API 文档在 `/docs` (开发模式)。

---

## 路线图

- [x] 核心分析引擎 (GGUF 解析、内存/速度估算)
- [x] 硬件兼容性检查器 (20+ 预设)
- [x] 带获胜摘要的模型对比
- [x] 社区基准和讨论
- [x] SEO 基础设施 (40+ 页面、站点地图、结构化数据)
- [x] 速率限制、日志、输入验证
- [ ] GPU 自动检测改进 (WebGPU API)
- [ ] Redis 缓存后端选项
- [ ] 模型推荐引擎 ("X 任务 + Y 预算的最佳模型")
- [ ] 第三方集成 API 密钥
- [ ] 浏览器扩展 (在 HuggingFace 上"检查兼容性")
- [ ] 移动端优化 UI
- [ ] Ollama 集成 (从 VRAMfit 拉取 + 运行)

---

## 参与贡献

欢迎贡献！查看 [CONTRIBUTING.md](../CONTRIBUTING.md)。

**高影响领域：**
- 验证速度公式的真实 tok/s 测量
- 新硬件带宽数据 (特别是 AMD、Intel Arc)
- 模型目录扩展
- 错误显存估算的错误报告

---

## 免责声明

所有性能估算均基于公布的规格和带宽限制公式计算 —— 非实时基准。实际性能因驱动、操作系统、构建标志和工作负载而异。作为起点使用，在你的硬件上验证。

---

## 许可证

[MIT](../LICENSE) —— 随意使用。

---

<div align="center">

**如果这个项目帮你为硬件选对了模型，请考虑给个 Star。**

Made with precision by the VRAMfit team.

</div>
