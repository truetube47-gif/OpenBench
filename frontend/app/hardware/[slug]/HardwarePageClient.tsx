"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, Zap, MemoryStick, Info,
} from "lucide-react";
import { hardwareCheck } from "@/lib/api";
import type { HardwareCheckResponse, ModelCompatibilityResult, HardwareProfile } from "@/lib/types";
import type { HardwareSpec } from "./page";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  hw: HardwareSpec | null;
  allHardware: Record<string, HardwareSpec>;
}

const STATUS_META = {
  comfortable: { label: "Runs Great",    icon: CheckCircle2, color: "text-emerald-400", pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  marginal:    { label: "Partial / Slow", icon: AlertTriangle, color: "text-amber-400",  pill: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  cannot_run:  { label: "Too Large",      icon: XCircle,       color: "text-red-400",    pill: "bg-red-500/15 text-red-400 border-red-500/30" },
  unknown:     { label: "Unknown",        icon: Info,           color: "text-bench-muted",pill: "bg-bench-surface text-bench-muted border-bench-border" },
} as const;

function formatParams(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(0)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(0)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(0)}M`;
  return String(n);
}

function ModelRow({ model }: { model: ModelCompatibilityResult }) {
  const meta = STATUS_META[model.status] ?? STATUS_META.unknown;
  const StatusIcon = meta.icon;
  const canRun = model.status !== "cannot_run";

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-3.5 border-b border-bench-border/50 hover:bg-bench-surface/30 transition-colors",
      !canRun && "opacity-50"
    )}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-bench-text text-sm truncate">{model.name}</p>
        <p className="text-xs text-bench-muted">{formatParams(model.param_count)} · {model.architecture}</p>
      </div>
      <span className={cn("shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium", meta.pill)}>
        <StatusIcon size={9} />
        {meta.label}
      </span>
      {canRun && (
        <>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs text-bench-muted">Quant</p>
            <p className="font-mono text-xs font-semibold text-bench-text">{model.recommended_quant}</p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs text-bench-muted">Speed</p>
            <p className="text-xs font-semibold text-bench-text">
              {model.expected_tps != null ? `~${model.expected_tps} t/s` : "—"}
            </p>
          </div>
        </>
      )}
      <Link
        href={`/analyze?repo=${encodeURIComponent(model.repo_id)}`}
        className={cn(
          "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
          canRun
            ? "bg-bench-accent/10 border border-bench-accent/30 text-bench-accent hover:bg-bench-accent hover:text-white"
            : "bg-bench-surface border border-bench-border text-bench-muted pointer-events-none"
        )}
      >
        Analyze <ChevronRight size={10} />
      </Link>
    </div>
  );
}

export default function HardwarePageClient({ slug, hw, allHardware }: Props) {
  const [result, setResult] = useState<HardwareCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = useCallback(async (spec: HardwareSpec) => {
    setLoading(true);
    const hwProfile: HardwareProfile = {
      cpu_name: spec.name,
      cpu_threads: spec.cpu_threads,
      ram_gb: spec.ram_gb,
      cpu_memory_bandwidth_gbps: spec.cpu_bw,
      ...(spec.vram_gb ? {
        gpu_name: spec.name,
        vram_gb: spec.vram_gb,
        gpu_memory_bandwidth_gbps: spec.gpu_bw ?? spec.cpu_bw,
      } : {}),
    };
    try {
      const res = await hardwareCheck(hwProfile);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hw) runCheck(hw);
  }, [hw, runCheck]);

  if (!hw) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-3xl font-bold text-bench-text">Hardware Not Found</p>
        <p className="text-bench-muted">This hardware page doesn&apos;t exist yet.</p>
        <Link href="/run-check" className="inline-flex items-center gap-2 text-bench-accent hover:underline">
          Check your hardware <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const vramStr = hw.vram_gb ? `${hw.vram_gb}GB VRAM` : `${hw.ram_gb}GB RAM`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-bench-muted flex items-center gap-1.5">
        <Link href="/" className="hover:text-bench-text">Home</Link>
        <ChevronRight size={10} />
        <Link href="/run-check" className="hover:text-bench-text">Run Check</Link>
        <ChevronRight size={10} />
        <span className="text-bench-text">{hw.name}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bench-accent/10 border border-bench-accent/30 text-bench-accent text-xs font-medium">
          <Zap size={11} />
          {hw.category}
        </div>
        <h1 className="text-3xl font-bold text-bench-text">{hw.name}</h1>
        <p className="text-bench-muted">{hw.tagline}</p>
        <p className="text-bench-muted text-sm leading-relaxed max-w-2xl">{hw.desc}</p>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-2.5 py-1 rounded-full bg-bench-surface border border-bench-border text-bench-muted text-xs flex items-center gap-1">
            <MemoryStick size={10} /> {vramStr}
          </span>
          {hw.vram_gb && (
            <span className="px-2.5 py-1 rounded-full bg-bench-surface border border-bench-border text-bench-muted text-xs">
              {hw.gpu_bw} GB/s bandwidth
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-bench-surface border border-bench-border text-bench-muted text-xs">
            {hw.cpu_threads} CPU threads
          </span>
        </div>
      </div>

      {/* Stats summary */}
      {result && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Models run great", count: result.comfortable_count, color: "text-emerald-400" },
            { label: "Partial / slow",   count: result.marginal_count,    color: "text-amber-400"  },
            { label: "Too large",        count: result.cannot_run_count,  color: "text-red-400"    },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-bench-border bg-bench-card p-4 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
              <p className="text-xs text-bench-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Model compatibility list */}
      <div className="rounded-2xl border border-bench-border bg-bench-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-bench-border flex items-center justify-between">
          <h2 className="font-semibold text-bench-text">Model Compatibility</h2>
          {loading && <Loader2 size={14} className="animate-spin text-bench-accent" />}
        </div>

        {result ? (
          <div>
            {result.models.map((m) => <ModelRow key={m.repo_id} model={m} />)}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-bench-muted">
            <Loader2 size={16} className="animate-spin text-bench-accent" />
            Computing compatibility…
          </div>
        ) : null}
      </div>

      {/* SEO prose block */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-6 space-y-4">
        <h2 className="font-bold text-bench-text text-lg">
          Best LLMs for {hw.name}
        </h2>
        <p className="text-bench-muted text-sm leading-relaxed">
          {hw.vram_gb ? (
            <>
              With {hw.vram_gb}GB VRAM, the {hw.name} can run most popular 7-13B GGUF models
              at Q4_K_M quantization. Q4_K_M provides the best quality-to-size ratio while
              keeping memory usage well within the available budget.
              {hw.vram_gb >= 16 && " At 16GB+, you can also run 14B models at Q4_K_M or 7-8B models at higher quality (Q6_K, Q8_0)."}
              {hw.vram_gb >= 24 && " With 24GB VRAM you can comfortably run 30B models at Q4_K_M — enough for frontier-quality local inference."}
            </>
          ) : (
            <>
              With {hw.ram_gb}GB of system RAM, you can run LLMs purely on CPU.
              CPU inference is slower than GPU (typically 2-10 tok/s depending on model size and RAM bandwidth),
              but it works without any GPU. llama.cpp is the recommended framework for CPU inference.
            </>
          )}
        </p>
        <div className="pt-2 flex items-center gap-3 flex-wrap">
          <Link href="/run-check" className="flex items-center gap-1.5 text-bench-accent hover:underline text-sm">
            <Zap size={13} /> Check with custom hardware
          </Link>
          <span className="text-bench-border">·</span>
          <Link href="/leaderboard" className="flex items-center gap-1.5 text-bench-accent hover:underline text-sm">
            Browse benchmark leaderboard <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Related hardware */}
      <div className="space-y-3">
        <h3 className="font-semibold text-bench-text">Other Hardware Profiles</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Object.entries(allHardware)
            .filter(([s]) => s !== slug)
            .slice(0, 8)
            .map(([s, h]) => (
              <Link
                key={s}
                href={`/hardware/${s}`}
                className="rounded-xl border border-bench-border bg-bench-card p-3 hover:border-bench-accent/30 transition-all"
              >
                <p className="font-medium text-bench-text text-xs truncate">{h.name}</p>
                <p className="text-xs text-bench-muted mt-0.5 truncate">{h.vram_gb ? `${h.vram_gb}GB VRAM` : `${h.ram_gb}GB RAM`}</p>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
