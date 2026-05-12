"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Trophy, Cpu, GitCompare } from "lucide-react";
import { compareModels, getHardwarePresets, getShare } from "@/lib/api";
import ShareButton from "@/components/ShareButton";
import ExportButton from "@/components/ExportButton";
import type { ComparisonResult, HardwareProfile, HardwarePreset } from "@/lib/types";
import ModelInfoCard from "@/components/ModelInfoCard";
import BenchmarkChart from "@/components/BenchmarkChart";
import CapabilityRadar from "@/components/CapabilityRadar";
import QuantLadder from "@/components/QuantLadder";
import HardwareWizard from "@/components/HardwareWizard";
import { canRunColor } from "@/lib/utils";

const DEFAULT_HW: HardwareProfile = {
  cpu_name: "Generic CPU",
  cpu_threads: 8,
  ram_gb: 16,
  gpu_name: undefined,
  vram_gb: undefined,
  cpu_memory_bandwidth_gbps: 50,
};

type TabId = "overview" | "benchmarks" | "capability" | "quant";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",   label: "Overview"     },
  { id: "benchmarks", label: "Benchmarks"   },
  { id: "capability", label: "Capability"   },
  { id: "quant",      label: "Quant Ladder" },
];

export default function ComparePage() {
  const params = useSearchParams();

  const [modelAInput, setModelAInput] = useState(params?.get("a") || "");
  const [modelBInput, setModelBInput] = useState(params?.get("b") || "");
  const [hardware, setHardware] = useState<HardwareProfile>(DEFAULT_HW);
  const [presets, setPresets] = useState<HardwarePreset[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    getHardwarePresets()
      .then(setPresets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const a = params?.get("a");
    const b = params?.get("b");
    const shareId = params?.get("share");
    if (shareId) {
      getShare(shareId).then((s) => {
        const p = s.params as Record<string, unknown>;
        const ma = String(p.model_a ?? "");
        const mb = String(p.model_b ?? "");
        const hw = (p.hardware as HardwareProfile) ?? hardware;
        if (ma) setModelAInput(ma);
        if (mb) setModelBInput(mb);
        if (ma && mb) runCompare(ma, mb, hw);
      }).catch(() => {});
    } else if (a && b) {
      setModelAInput(a);
      setModelBInput(b);
      runCompare(a, b, hardware);
    }
  }, []);

  const runCompare = useCallback(
    async (a: string, b: string, hw: HardwareProfile) => {
      if (!a.trim() || !b.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await compareModels({ model_a: a.trim(), model_b: b.trim(), hardware_profile: hw });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Comparison failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runCompare(modelAInput, modelBInput, hardware);
  }

  const winnerName = result
    ? (result.winner.user_hardware || result.winner.overall) === result.model_a.repo_id
      ? result.model_a.name || "Model A"
      : result.model_b.name || "Model B"
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-bench-text mb-1 flex items-center gap-2">
          <GitCompare size={28} className="text-bench-accent" />
          Compare Models
        </h1>
        <p className="text-bench-muted text-sm">
          Side-by-side analysis of two HuggingFace LLM repos
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-bench-border bg-bench-card p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-bench-muted mb-1.5 block">Model A (HuggingFace repo)</label>
            <input
              value={modelAInput}
              onChange={(e) => setModelAInput(e.target.value)}
              placeholder="bartowski/Llama-3.2-3B-Instruct-GGUF"
              className="w-full px-4 py-2.5 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-bench-muted mb-1.5 block">Model B (HuggingFace repo)</label>
            <input
              value={modelBInput}
              onChange={(e) => setModelBInput(e.target.value)}
              placeholder="Qwen/Qwen2.5-7B-Instruct-GGUF"
              className="w-full px-4 py-2.5 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-bench-muted mb-1.5 block flex items-center gap-1">
              <Cpu size={11} /> Your Hardware
            </label>
            <HardwareWizard value={hardware} presets={presets} onChange={setHardware} />
          </div>
          <button
            type="submit"
            disabled={loading || !modelAInput.trim() || !modelBInput.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all h-11"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Analyzing…" : "Compare"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-20 text-bench-muted">
          <Loader2 size={32} className="animate-spin text-bench-accent" />
          <p>Fetching model metadata and computing estimates…</p>
          <p className="text-xs">This may take 10–30s for large repos</p>
        </div>
      )}

      {result && !loading && (
        <div id="compare-export-root" className="space-y-6 animate-fade-in">
          {/* Winner banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
            <Trophy size={20} className="text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-bench-text">
                <span className="text-amber-400">{winnerName}</span> wins overall
              </p>
              <p className="text-bench-muted text-sm">{result.winner.reasoning}</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton targetId="compare-export-root" filename={`compare-${modelAInput.split("/").pop()}-vs-${modelBInput.split("/").pop()}`} />
              <ShareButton
                type="compare"
                params={{ model_a: modelAInput, model_b: modelBInput, hardware }}
              />
            </div>
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
                <h3 className="font-semibold text-bench-text mb-4">
                  {result.model_a.name} — Quant Variants
                </h3>
                <QuantLadder
                  variants={result.model_a.gguf_variants}
                  availableGb={hardware.vram_gb || hardware.ram_gb}
                />
              </div>
              <div className="rounded-2xl border border-bench-border bg-bench-card p-5">
                <h3 className="font-semibold text-bench-text mb-4">
                  {result.model_b.name} — Quant Variants
                </h3>
                <QuantLadder
                  variants={result.model_b.gguf_variants}
                  availableGb={hardware.vram_gb || hardware.ram_gb}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
