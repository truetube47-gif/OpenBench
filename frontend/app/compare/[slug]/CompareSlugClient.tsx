"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Trophy, ChevronRight, GitCompare } from "lucide-react";
import { compareModels, getHardwarePresets } from "@/lib/api";
import type { ComparisonResult, HardwareProfile, HardwarePreset } from "@/lib/types";
import ModelInfoCard from "@/components/ModelInfoCard";
import BenchmarkChart from "@/components/BenchmarkChart";
import CapabilityRadar from "@/components/CapabilityRadar";
import QuantLadder from "@/components/QuantLadder";
import HardwareWizard from "@/components/HardwareWizard";
import ShareButton from "@/components/ShareButton";
import { canRunColor } from "@/lib/utils";

const DEFAULT_HW: HardwareProfile = {
  cpu_name: "Generic CPU",
  cpu_threads: 8,
  ram_gb: 16,
  cpu_memory_bandwidth_gbps: 50,
};

type TabId = "overview" | "benchmarks" | "capability" | "quant";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview",   label: "Overview"     },
  { id: "benchmarks", label: "Benchmarks"   },
  { id: "capability", label: "Capability"   },
  { id: "quant",      label: "Quant Ladder" },
];

interface PairInfo {
  a: string;
  b: string;
  nameA: string;
  nameB: string;
  desc: string;
}

interface Props {
  slug: string;
  pair: PairInfo | null;
  allPairs: Record<string, PairInfo>;
}

export default function CompareSlugClient({ slug, pair, allPairs }: Props) {
  const [hardware, setHardware] = useState<HardwareProfile>(DEFAULT_HW);
  const [presets, setPresets] = useState<HardwarePreset[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    getHardwarePresets().then(setPresets).catch(() => {});
  }, []);

  useEffect(() => {
    if (pair) runCompare(DEFAULT_HW);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  async function runCompare(hw: HardwareProfile) {
    if (!pair) return;
    setLoading(true);
    setError(null);
    try {
      const res = await compareModels({
        model_a: pair.a,
        model_b: pair.b,
        hardware_profile: hw,
        context_length: 8192,
      });
      setResult(res);
    } catch {
      setError("Could not load comparison. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  if (!pair) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-3xl font-bold text-bench-text">Comparison Not Found</p>
        <p className="text-bench-muted">This comparison page doesn&apos;t exist yet.</p>
        <Link href="/compare" className="inline-flex items-center gap-2 text-bench-accent hover:underline">
          Build your own comparison <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const winnerName = result
    ? (result.winner.overall === result.model_a.repo_id ? result.model_a.name : result.model_b.name)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-bench-muted flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-bench-text">Home</Link>
        <ChevronRight size={10} />
        <Link href="/compare" className="hover:text-bench-text">Compare</Link>
        <ChevronRight size={10} />
        <span className="text-bench-text">{pair.nameA} vs {pair.nameB}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-bench-accent/10 border border-bench-accent/30 text-bench-accent text-xs font-semibold">A</span>
            <h1 className="text-2xl font-bold text-bench-text">{pair.nameA}</h1>
          </div>
          <GitCompare size={18} className="text-bench-muted shrink-0" />
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold">B</span>
            <h1 className="text-2xl font-bold text-bench-text">{pair.nameB}</h1>
          </div>
        </div>
        <p className="text-bench-muted text-sm leading-relaxed max-w-3xl">{pair.desc}</p>
      </div>

      {/* Hardware */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-bench-text text-sm">Your Hardware</h2>
            <p className="text-xs text-bench-muted mt-0.5">Affects VRAM estimates and speed predictions</p>
          </div>
          <button
            onClick={() => runCompare(hardware)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-all"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <GitCompare size={12} />}
            {loading ? "Comparing…" : "Recompare"}
          </button>
        </div>
        <HardwareWizard value={hardware} presets={presets} onChange={setHardware} />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-bench-muted">
          <Loader2 size={20} className="animate-spin text-bench-accent" />
          <span>Fetching model data and computing estimates…</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Winner banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Trophy size={20} className="text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-bench-text">
                  <span className="text-amber-400">{winnerName}</span> wins overall
                </p>
                <p className="text-bench-muted text-sm">{result.winner.reasoning}</p>
              </div>
            </div>
            <ShareButton type="compare" params={{ model_a: pair.a, model_b: pair.b, hardware }} />
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Performance winner", value: result.winner.performance === result.model_a.repo_id ? pair.nameA : pair.nameB, color: "text-bench-accent" },
              { label: "Efficiency winner",  value: result.winner.efficiency  === result.model_a.repo_id ? pair.nameA : pair.nameB, color: "text-emerald-400" },
              { label: `${pair.nameA} can run`, value: result.model_a.can_run, color: canRunColor(result.model_a.can_run) },
              { label: `${pair.nameB} can run`, value: result.model_b.can_run, color: canRunColor(result.model_b.can_run) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-bench-border bg-bench-card p-3 text-center">
                <p className={`font-semibold text-sm ${s.color} capitalize`}>{s.value}</p>
                <p className="text-xs text-bench-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-bench-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                  tab === t.id
                    ? "border-bench-accent text-bench-accent"
                    : "border-transparent text-bench-muted hover:text-bench-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ModelInfoCard model={result.model_a} side="A" />
              <ModelInfoCard model={result.model_b} side="B" />
            </div>
          )}
          {tab === "benchmarks" && (
            <div className="rounded-2xl border border-bench-border bg-bench-card p-5">
              <BenchmarkChart modelA={result.model_a} modelB={result.model_b} />
            </div>
          )}
          {tab === "capability" && (
            <div className="rounded-2xl border border-bench-border bg-bench-card p-5">
              <CapabilityRadar modelA={result.model_a} modelB={result.model_b} />
            </div>
          )}
          {tab === "quant" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-bench-border bg-bench-card p-5">
                <h3 className="font-semibold text-bench-text mb-4">{pair.nameA} — Quant Variants</h3>
                <QuantLadder variants={result.model_a.gguf_variants} availableGb={hardware.vram_gb ?? hardware.ram_gb} />
              </div>
              <div className="rounded-2xl border border-bench-border bg-bench-card p-5">
                <h3 className="font-semibold text-bench-text mb-4">{pair.nameB} — Quant Variants</h3>
                <QuantLadder variants={result.model_b.gguf_variants} availableGb={hardware.vram_gb ?? hardware.ram_gb} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEO prose */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-6 space-y-3">
        <h2 className="font-bold text-bench-text text-lg">{pair.nameA} vs {pair.nameB} — Which Should You Run?</h2>
        <p className="text-bench-muted text-sm leading-relaxed">{pair.desc}</p>
        <p className="text-bench-muted text-sm leading-relaxed">
          Use the hardware selector above to see which model fits your specific setup. The comparison
          accounts for weights memory, KV cache overhead, and framework overhead — giving you accurate
          numbers before you download either model.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/run-check" className="flex items-center gap-1.5 text-bench-accent hover:underline text-sm">
            Check all models for my hardware <ChevronRight size={13} />
          </Link>
          <span className="text-bench-border">·</span>
          <Link href="/compare" className="flex items-center gap-1.5 text-bench-accent hover:underline text-sm">
            Compare different models <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* More comparisons */}
      <div className="space-y-3">
        <h3 className="font-semibold text-bench-text">More Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(allPairs)
            .filter(([s]) => s !== slug)
            .slice(0, 6)
            .map(([s, p]) => (
              <Link
                key={s}
                href={`/compare/${s}`}
                className="rounded-xl border border-bench-border bg-bench-card p-3 hover:border-bench-accent/30 transition-all flex items-center gap-2"
              >
                <GitCompare size={13} className="text-bench-muted shrink-0" />
                <span className="text-bench-text text-sm">{p.nameA} vs {p.nameB}</span>
                <ChevronRight size={11} className="text-bench-muted ml-auto shrink-0" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
