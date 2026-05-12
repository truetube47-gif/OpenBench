"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Zap, Scale, Search, Trophy, Cpu, BarChart2,
  GitCompare, HardDrive, Terminal, CheckCircle2, AlertTriangle,
  ChevronRight, Layers,
} from "lucide-react";

const HARDWARE_QUICK = [
  { slug: "rtx-3060-12gb",    label: "RTX 3060 12GB",   vram: "12 GB" },
  { slug: "rtx-4070",         label: "RTX 4070 12GB",   vram: "12 GB" },
  { slug: "rtx-4090",         label: "RTX 4090 24GB",   vram: "24 GB" },
  { slug: "apple-m2-pro",     label: "M2 Pro 16GB",     vram: "16 GB unified" },
  { slug: "apple-m3-max",     label: "M3 Max 48GB",     vram: "48 GB unified" },
  { slug: "16gb-ram-cpu",     label: "16 GB RAM CPU",   vram: "CPU-only" },
  { slug: "32gb-ram-cpu",     label: "32 GB RAM CPU",   vram: "CPU-only" },
  { slug: "rtx-3090",         label: "RTX 3090 24GB",   vram: "24 GB" },
];

const MODEL_QUICK = [
  { slug: "llama-3-1-8b",  label: "Llama 3.1 8B",    params: "8B"  },
  { slug: "qwen3-14b",     label: "Qwen3 14B",        params: "14B" },
  { slug: "qwen3-32b",     label: "Qwen3 32B",        params: "32B" },
  { slug: "deepseek-r1-8b",label: "DeepSeek R1 8B",   params: "8B"  },
  { slug: "phi-4-14b",     label: "Phi-4 14B",        params: "14B" },
  { slug: "mistral-7b",    label: "Mistral 7B",       params: "7B"  },
  { slug: "gemma-3-9b",    label: "Gemma 3 9B",       params: "9B"  },
  { slug: "llama-3-3-70b", label: "Llama 3.3 70B",   params: "70B" },
];

const EXAMPLE_COMPARISONS = [
  { a: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",   b: "bartowski/Qwen2.5-7B-Instruct-GGUF",          label: "Llama 3.1 8B vs Qwen2.5 7B"     },
  { a: "bartowski/Qwen3-14B-GGUF",                    b: "bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF",  label: "Qwen3 14B vs DeepSeek R1 14B"   },
  { a: "bartowski/phi-4-GGUF",                        b: "bartowski/gemma-3-12b-it-GGUF",                label: "Phi-4 14B vs Gemma 3 12B"       },
];

const INTENT_ANSWERS = [
  { q: "Can RTX 3060 run Qwen3 14B?",         a: "Yes — Q4_K_M fits in 11 GB VRAM, ~32 t/s",         status: "comfortable" },
  { q: "Best coding model for 8GB VRAM?",      a: "Qwen3 8B Q4_K_M or Phi-4 14B Q2_K",               status: "comfortable" },
  { q: "Can 16GB RAM run DeepSeek R1 32B?",    a: "No — needs ~19 GB at Q2_K. Try 8B instead.",      status: "cannot_run"  },
  { q: "Fastest GGUF for CPU-only laptop?",    a: "Llama 3.2 3B Q4_K_M — ~6 t/s on modern CPU",     status: "comfortable" },
  { q: "llama.cpp or vLLM for Qwen3?",         a: "llama.cpp — vLLM has no GGUF support",            status: "comfortable" },
  { q: "M2 Pro 16GB — which 14B models run?", a: "Qwen3 14B, Phi-4, DeepSeek R1 14B — all fit",    status: "comfortable" },
];

const FEATURES = [
  {
    icon: <Zap size={20} className="text-indigo-400" />,
    title: "Can I Run This?",
    desc: "Select your hardware — get an instant compatibility grid for 20 popular models with recommended quant, speed, and max context.",
    href: "/run-check",
  },
  {
    icon: <Layers size={20} className="text-violet-400" />,
    title: "Quantization Ladder",
    desc: "Every quant variant (IQ1 → F32) with per-quant RAM bars, run-compatibility, and a recommended badge for your hardware.",
    href: "/analyze",
  },
  {
    icon: <Terminal size={20} className="text-emerald-400" />,
    title: "Inference Recipes",
    desc: "Ready-to-paste llama.cpp, Ollama, vLLM, and Transformers commands auto-generated for your model and hardware config.",
    href: "/analyze",
  },
  {
    icon: <Scale size={20} className="text-blue-400" />,
    title: "Side-by-Side Comparison",
    desc: "Compare two models on VRAM requirements, benchmark scores, capability profiles, and speed — with an AI-generated winner summary.",
    href: "/compare",
  },
  {
    icon: <BarChart2 size={20} className="text-amber-400" />,
    title: "Framework Compatibility",
    desc: "Flash Attn, speculative decoding, MoE, RoPE scaling — per-architecture support matrix across llama.cpp, vLLM, MLX, Transformers.",
    href: "/analyze",
  },
  {
    icon: <Trophy size={20} className="text-rose-400" />,
    title: "Live Leaderboard",
    desc: "Real benchmark scores from Open LLM Leaderboard v2 + crowd-sourced real-world tok/s from the community.",
    href: "/leaderboard",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");

  function handleQuickCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!modelA.trim() || !modelB.trim()) return;
    router.push(`/compare?a=${encodeURIComponent(modelA.trim())}&b=${encodeURIComponent(modelB.trim())}`);
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bench-accent/10 border border-bench-accent/20 text-bench-accent text-xs font-medium mb-6">
            <Zap size={12} />
            Open-source · No account required · Instant
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
            <span className="text-gradient">Can I run this LLM?</span>
            <br />
            <span className="text-bench-text">Find out in seconds.</span>
          </h1>

          <p className="text-bench-muted text-lg max-w-2xl mx-auto mb-8">
            OpenBench tells you exactly which models your hardware can run,
            which quantization to pick, what speed to expect, and how to launch them —
            before you download a single gigabyte.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link
              href="/run-check"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-bench-accent hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
            >
              <HardDrive size={16} /> Check My Hardware
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/analyze"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-bench-border bg-bench-card hover:border-bench-accent/40 text-bench-text font-semibold text-sm transition-all"
            >
              <Search size={16} /> Analyze a Model
            </Link>
          </div>

          {/* Intent demo table */}
          <div className="max-w-2xl mx-auto rounded-2xl border border-bench-border bg-bench-card overflow-hidden text-left">
            <div className="px-4 py-2.5 border-b border-bench-border bg-bench-surface/30 text-xs text-bench-muted font-medium">
              Questions OpenBench answers instantly
            </div>
            {INTENT_ANSWERS.map(({ q, a, status }) => (
              <div key={q} className="flex items-start gap-3 px-4 py-3 border-b border-bench-border/50 last:border-0 hover:bg-bench-surface/20 transition-colors">
                <div className="shrink-0 mt-0.5">
                  {status === "comfortable"
                    ? <CheckCircle2 size={13} className="text-emerald-400" />
                    : <AlertTriangle size={13} className="text-red-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-bench-text text-xs font-medium">{q}</p>
                  <p className="text-bench-muted text-xs mt-0.5">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── By hardware ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-bench-text">Browse by Hardware</h2>
            <p className="text-bench-muted text-sm mt-0.5">See exactly which models each GPU or CPU can run</p>
          </div>
          <Link href="/run-check" className="flex items-center gap-1 text-bench-accent hover:underline text-sm">
            Custom hardware <ChevronRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {HARDWARE_QUICK.map((h) => (
            <Link
              key={h.slug}
              href={`/hardware/${h.slug}`}
              className="rounded-2xl border border-bench-border bg-bench-card p-4 hover:border-bench-accent/40 hover:bg-bench-surface/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-bench-surface flex items-center justify-center mb-2.5">
                <Cpu size={15} className="text-bench-accent" />
              </div>
              <p className="font-semibold text-bench-text text-sm group-hover:text-bench-accent transition-colors">{h.label}</p>
              <p className="text-xs text-bench-muted mt-0.5">{h.vram}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── By model ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-bench-text">Browse by Model</h2>
            <p className="text-bench-muted text-sm mt-0.5">VRAM requirements, quant guide, and run commands per model</p>
          </div>
          <Link href="/leaderboard" className="flex items-center gap-1 text-bench-accent hover:underline text-sm">
            Full leaderboard <ChevronRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODEL_QUICK.map((m) => (
            <Link
              key={m.slug}
              href={`/models/${m.slug}`}
              className="rounded-2xl border border-bench-border bg-bench-card p-4 hover:border-bench-accent/40 hover:bg-bench-surface/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-bench-surface flex items-center justify-center mb-2.5">
                <GitCompare size={15} className="text-violet-400" />
              </div>
              <p className="font-semibold text-bench-text text-sm group-hover:text-bench-accent transition-colors">{m.label}</p>
              <p className="text-xs text-bench-muted mt-0.5">{m.params} parameters</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-center text-bench-text mb-3">
          Deployment intelligence, not just benchmarks
        </h2>
        <p className="text-bench-muted text-center mb-12 max-w-xl mx-auto">
          The tools local LLM users actually need — before, during, and after choosing a model.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="rounded-2xl border border-bench-border bg-bench-card p-5 hover:border-bench-accent/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-bench-surface flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-bench-text mb-1.5 group-hover:text-bench-accent transition-colors">{f.title}</h3>
              <p className="text-bench-muted text-sm leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Compare CTA ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-transparent border border-bench-accent/20 p-8 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-bench-text mb-1">Compare any two models</h3>
            <p className="text-bench-muted text-sm">Paste two HuggingFace repo IDs and get a side-by-side deployment analysis.</p>
          </div>

          <form onSubmit={handleQuickCompare}>
            <div className="flex flex-col sm:flex-row gap-3 mb-3 max-w-2xl">
              <input
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                placeholder="bartowski/Qwen3-14B-GGUF"
                className="flex-1 px-4 py-3 rounded-xl bg-bench-card border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm transition-colors"
              />
              <span className="self-center text-bench-muted font-bold shrink-0">vs</span>
              <input
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                placeholder="bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF"
                className="flex-1 px-4 py-3 rounded-xl bg-bench-card border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm transition-colors"
              />
              <button
                type="submit"
                disabled={!modelA.trim() || !modelB.trim()}
                className="px-6 py-3 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center gap-2 shrink-0"
              >
                Compare <ArrowRight size={14} />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_COMPARISONS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => router.push(`/compare?a=${encodeURIComponent(ex.a)}&b=${encodeURIComponent(ex.b)}`)}
                className="text-xs px-3 py-1.5 rounded-full bg-bench-card border border-bench-border text-bench-muted hover:text-bench-text hover:border-bench-accent/40 transition-all"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developer CTA ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-bench-border bg-bench-card p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-bench-text mb-1">Publishing a model on HuggingFace?</h3>
            <p className="text-bench-muted text-sm">
              Generate a shareable hardware-compatibility report card to embed in your model card.
            </p>
          </div>
          <Link
            href="/analyze"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-bench-accent hover:bg-indigo-500 text-white font-semibold text-sm transition-all shrink-0"
          >
            <Search size={15} />
            Analyze a Model
          </Link>
        </div>
      </section>

    </div>
  );
}
