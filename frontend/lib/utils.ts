import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CanRunStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatParams(n: number): string {
  if (!n) return "Unknown";
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(0)}M`;
  return String(n);
}

export function formatCtx(n: number): string {
  if (!n) return "Unknown";
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export function formatGb(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)} GB`;
}

export function formatTps(min: number, max: number): string {
  return `${min.toFixed(1)} – ${max.toFixed(1)} t/s`;
}

export function canRunLabel(status: CanRunStatus): string {
  return {
    comfortable: "✓ Runs Comfortably",
    marginal:    "⚠ Runs (Tight)",
    cannot_run:  "✗ Cannot Run",
    unknown:     "? Unknown",
  }[status] ?? "Unknown";
}

export function canRunColor(status: CanRunStatus): string {
  return {
    comfortable: "text-bench-green",
    marginal:    "text-bench-amber",
    cannot_run:  "text-bench-red",
    unknown:     "text-bench-muted",
  }[status] ?? "text-bench-muted";
}

export function canRunBg(status: CanRunStatus): string {
  return {
    comfortable: "bg-green-500/10 border-green-500/30",
    marginal:    "bg-amber-500/10 border-amber-500/30",
    cannot_run:  "bg-red-500/10  border-red-500/30",
    unknown:     "bg-zinc-700/20 border-zinc-600/30",
  }[status] ?? "bg-zinc-700/20 border-zinc-600/30";
}

export function quantColor(quant: string): string {
  const q = quant.toUpperCase();
  if (q.startsWith("IQ1") || q.startsWith("IQ2") || q === "Q2_K") return "text-red-400";
  if (q.startsWith("Q3") || q === "Q4_0") return "text-amber-400";
  if (q.startsWith("Q4_K") || q.startsWith("Q5")) return "text-green-400";
  if (q.startsWith("Q6") || q.startsWith("Q8") || q === "F16" || q === "BF16") return "text-indigo-400";
  if (q === "F32") return "text-purple-400";
  return "text-bench-muted";
}

export function archIcon(arch: string): string {
  const a = arch.toLowerCase();
  if (a.includes("llama")) return "🦙";
  if (a.includes("mistral")) return "🌬";
  if (a.includes("qwen")) return "🐉";
  if (a.includes("phi")) return "Φ";
  if (a.includes("gemma")) return "💎";
  if (a.includes("falcon")) return "🦅";
  if (a.includes("deepseek")) return "🔍";
  return "🤖";
}

export function benchScoreColor(score: number | null | undefined): string {
  if (score == null) return "text-bench-muted";
  if (score >= 75) return "text-green-400";
  if (score >= 55) return "text-amber-400";
  return "text-red-400";
}

export function avgBenchScore(benchmarks: Record<string, number | null | undefined | string>): number | null {
  const values = Object.entries(benchmarks)
    .filter(([k]) => k !== "source" && k !== "arena_elo")
    .map(([, v]) => (typeof v === "number" ? v : null))
    .filter((v): v is number => v !== null);
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
