"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2, AlertTriangle, XCircle, Cpu, Loader2,
  Zap, MemoryStick, Clock, ChevronRight, Filter,
  Info, HardDrive, Search
} from "lucide-react";
import { hardwareCheck, getHardwarePresets } from "@/lib/api";
import type {
  HardwareCheckResponse,
  ModelCompatibilityResult,
  HardwareProfile,
  HardwarePreset,
} from "@/lib/types";
import HardwareWizard from "@/components/HardwareWizard";
import { cn } from "@/lib/utils";

const DEFAULT_HW: HardwareProfile = {
  cpu_name: "Generic CPU",
  cpu_threads: 8,
  ram_gb: 16,
  cpu_memory_bandwidth_gbps: 50,
};

type FilterStatus = "all" | "comfortable" | "marginal" | "cannot_run";

const STATUS_META = {
  comfortable: {
    label: "Runs Great",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  marginal: {
    label: "Partial / Slow",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    pill: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  cannot_run: {
    label: "Too Large",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    pill: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  unknown: {
    label: "Unknown",
    icon: Info,
    color: "text-bench-muted",
    bg: "bg-bench-surface border-bench-border",
    pill: "bg-bench-surface text-bench-muted border-bench-border",
  },
} as const;

function formatCtx(n: number): string {
  if (n >= 131072) return "128K";
  if (n >= 65536) return "64K";
  if (n >= 32768) return "32K";
  if (n >= 16384) return "16K";
  if (n >= 8192)  return "8K";
  return `${Math.round(n / 1024)}K`;
}

function formatParams(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(0)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(0)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(0)}M`;
  return String(n);
}

function CompatCard({ model }: { model: ModelCompatibilityResult }) {
  const meta = STATUS_META[model.status] ?? STATUS_META.unknown;
  const StatusIcon = meta.icon;
  const canRun = model.status !== "cannot_run";

  return (
    <div className={cn(
      "rounded-2xl border p-5 space-y-4 transition-all",
      canRun ? "hover:border-bench-accent/30" : "opacity-60",
      model.status === "comfortable" ? "border-bench-border bg-bench-card" :
      model.status === "marginal"    ? "border-amber-500/20 bg-bench-card" :
                                       "border-bench-border bg-bench-card"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-bench-text text-sm truncate">{model.name}</h3>
          <p className="text-xs text-bench-muted mt-0.5">
            {formatParams(model.param_count)} · {model.architecture}
          </p>
        </div>
        <span className={cn("shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium", meta.pill)}>
          <StatusIcon size={10} />
          {meta.label}
        </span>
      </div>

      {/* Stats grid */}
      {canRun && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-bench-surface/60 py-2 px-1">
            <p className="text-xs text-bench-muted mb-0.5">Quant</p>
            <p className="text-xs font-mono font-bold text-bench-text">{model.recommended_quant}</p>
          </div>
          <div className="rounded-xl bg-bench-surface/60 py-2 px-1">
            <p className="text-xs text-bench-muted mb-0.5">Speed</p>
            <p className="text-xs font-bold text-bench-text">
              {model.expected_tps != null ? `~${model.expected_tps} t/s` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-bench-surface/60 py-2 px-1">
            <p className="text-xs text-bench-muted mb-0.5">Context</p>
            <p className="text-xs font-bold text-bench-text">{formatCtx(model.max_safe_context)}</p>
          </div>
        </div>
      )}

      {/* Memory bar */}
      {canRun && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-bench-muted">
            <span className="flex items-center gap-1"><MemoryStick size={10} /> {model.required_gb} GB required</span>
            <span>{model.available_gb} GB available</span>
          </div>
          <div className="h-1.5 rounded-full bg-bench-surface overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                model.status === "comfortable" ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${Math.min(100, (model.required_gb / model.available_gb) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Warnings */}
      {model.warnings.length > 0 && canRun && (
        <div className="space-y-1">
          {model.warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-xs text-amber-400/80 flex items-start gap-1">
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {model.tags.slice(0, 4).map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-bench-surface border border-bench-border text-bench-muted">
            {t}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <Link
          href={`/analyze?repo=${encodeURIComponent(model.repo_id)}`}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all",
            canRun
              ? "bg-bench-accent/10 border border-bench-accent/30 text-bench-accent hover:bg-bench-accent hover:text-white"
              : "bg-bench-surface border border-bench-border text-bench-muted cursor-not-allowed pointer-events-none"
          )}
        >
          Full Analysis <ChevronRight size={11} />
        </Link>
        {!canRun && (
          <p className="text-xs text-bench-muted">
            Need ≥{model.required_gb} GB RAM
          </p>
        )}
      </div>
    </div>
  );
}

export default function RunCheckPage() {
  const [hardware, setHardware] = useState<HardwareProfile>(DEFAULT_HW);
  const [presets, setPresets] = useState<HardwarePreset[]>([]);
  const [result, setResult] = useState<HardwareCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => {
    getHardwarePresets().then(setPresets).catch(() => {});
  }, []);

  const runCheck = useCallback(async (hw: HardwareProfile) => {
    setLoading(true);
    try {
      const res = await hardwareCheck(hw);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleHardwareChange(hw: HardwareProfile) {
    setHardware(hw);
    if (autoRun) runCheck(hw);
  }

  const displayed = result?.models.filter((m) => {
    if (filter !== "all" && m.status !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !m.tags.some((t) => t.includes(search.toLowerCase()))) return false;
    return true;
  }) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bench-accent/10 border border-bench-accent/30 text-bench-accent text-xs font-medium">
          <Cpu size={12} />
          Deployment Intelligence
        </div>
        <h1 className="text-4xl font-bold text-bench-text">
          Can I Run This?
        </h1>
        <p className="text-bench-muted max-w-xl mx-auto">
          Tell us your hardware — we'll instantly show which models you can run,
          which quant to pick, expected speed, and max context.
        </p>
      </div>

      {/* Hardware selector */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-bench-text">Your Hardware</h2>
            <p className="text-xs text-bench-muted mt-0.5">Use a preset or customise manually</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-bench-muted cursor-pointer">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              Auto-check on change
            </label>
            <button
              onClick={() => runCheck(hardware)}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {loading ? "Checking…" : "Check Compatibility"}
            </button>
          </div>
        </div>
        <HardwareWizard value={hardware} presets={presets} onChange={handleHardwareChange} />
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Runs Great", count: result.comfortable_count, icon: CheckCircle2, color: "text-emerald-400", filter: "comfortable" as FilterStatus },
              { label: "Partial / Slow", count: result.marginal_count, icon: AlertTriangle, color: "text-amber-400", filter: "marginal" as FilterStatus },
              { label: "Too Large", count: result.cannot_run_count, icon: XCircle, color: "text-red-400", filter: "cannot_run" as FilterStatus },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.filter}
                  onClick={() => setFilter(filter === s.filter ? "all" : s.filter)}
                  className={cn(
                    "rounded-2xl border p-4 text-center transition-all space-y-1",
                    filter === s.filter
                      ? "border-bench-accent/50 bg-bench-accent/10"
                      : "border-bench-border bg-bench-card hover:border-bench-accent/30"
                  )}
                >
                  <Icon size={20} className={cn("mx-auto", s.color)} />
                  <p className="text-2xl font-bold text-bench-text">{s.count}</p>
                  <p className="text-xs text-bench-muted">{s.label}</p>
                </button>
              );
            })}
          </div>

          {/* Filters bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-bench-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or tag…"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bench-card border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm"
              />
            </div>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bench-border text-bench-muted hover:text-bench-text text-xs transition-all"
              >
                <Filter size={11} /> Clear filter
              </button>
            )}
            <p className="text-xs text-bench-muted">
              Showing {displayed.length} of {result.total} models
            </p>
          </div>

          {/* Model grid */}
          {displayed.length === 0 && (
            <div className="text-center py-16 text-bench-muted">
              <p>No models match your filter.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map((m) => (
              <CompatCard key={m.repo_id} model={m} />
            ))}
          </div>

          {/* Footer note */}
          <p className="text-xs text-bench-muted text-center pb-4">
            Estimates based on weights + KV cache + framework overhead (llama.cpp).
            Actual requirements vary by context length and system overhead.
            Click <strong>Full Analysis</strong> for exact per-quant breakdown.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="text-center py-20 space-y-4 text-bench-muted">
          <HardDrive size={48} className="mx-auto text-bench-border" />
          <div>
            <p className="font-medium text-bench-text">Configure your hardware above</p>
            <p className="text-sm mt-1">then click Check Compatibility to see which models you can run</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs pt-2">
            {["RTX 3060 12GB", "M2 MacBook Pro", "32GB RAM CPU", "RTX 4090 24GB"].map((preset) => (
              <span key={preset} className="px-3 py-1.5 rounded-full border border-bench-border">
                {preset}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
