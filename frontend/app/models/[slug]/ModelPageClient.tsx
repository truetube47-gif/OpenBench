"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, Zap, ExternalLink, HardDrive } from "lucide-react";
import { analyzeModel, getHardwarePresets } from "@/lib/api";
import type { ModelAnalysis, HardwareProfile, HardwarePreset } from "@/lib/types";
import HardwareWizard from "@/components/HardwareWizard";
import ModelInfoCard from "@/components/ModelInfoCard";
import BenchmarkChart from "@/components/BenchmarkChart";
import CapabilityRadar from "@/components/CapabilityRadar";
import QuantLadder from "@/components/QuantLadder";
import { formatParams } from "@/lib/utils";

const DEFAULT_HW: HardwareProfile = {
  cpu_name: "Generic CPU",
  cpu_threads: 8,
  ram_gb: 16,
  cpu_memory_bandwidth_gbps: 50,
};

interface ModelInfo {
  repoId: string;
  name: string;
  params: string;
  arch: string;
  desc: string;
}

interface Props {
  slug: string;
  info: ModelInfo | null;
}

export default function ModelPageClient({ slug, info }: Props) {
  const [hardware, setHardware] = useState<HardwareProfile>(DEFAULT_HW);
  const [presets, setPresets] = useState<HardwarePreset[]>([]);
  const [result, setResult] = useState<ModelAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);

  useEffect(() => {
    getHardwarePresets().then(setPresets).catch(() => {});
  }, []);

  useEffect(() => {
    if (info && !autoLoaded) {
      setAutoLoaded(true);
      runAnalysis(DEFAULT_HW);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  async function runAnalysis(hw: HardwareProfile) {
    if (!info) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeModel({
        repo_id: info.repoId,
        hardware_profile: hw,
        context_length: 8192,
        framework: "llama.cpp",
      });
      setResult(res);
    } catch {
      setError("Could not load analysis. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  if (!info) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-3xl font-bold text-bench-text">Model Not Found</p>
        <p className="text-bench-muted">This model page doesn&apos;t exist yet.</p>
        <Link href="/run-check" className="inline-flex items-center gap-2 text-bench-accent hover:underline">
          Browse compatible models <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-bench-muted flex items-center gap-1.5">
        <Link href="/" className="hover:text-bench-text">Home</Link>
        <ChevronRight size={10} />
        <Link href="/run-check" className="hover:text-bench-text">Models</Link>
        <ChevronRight size={10} />
        <span className="text-bench-text">{info.name}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 className="text-3xl font-bold text-bench-text">{info.name}</h1>
            <p className="text-bench-muted text-sm mt-1">{info.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`https://huggingface.co/${info.repoId}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bench-border text-bench-muted hover:text-bench-text text-xs transition-all"
            >
              <ExternalLink size={11} /> HuggingFace
            </Link>
            <Link
              href={`/compare?a=${encodeURIComponent(info.repoId)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bench-accent/10 border border-bench-accent/30 text-bench-accent hover:bg-bench-accent hover:text-white text-xs font-semibold transition-all"
            >
              Compare <ChevronRight size={11} />
            </Link>
          </div>
        </div>

        {/* Quick facts */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[info.params + " parameters", info.arch, "GGUF"].map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-bench-surface border border-bench-border text-bench-muted text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Hardware selector */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-bench-text text-sm">Your Hardware</h2>
            <p className="text-xs text-bench-muted mt-0.5">Customize to get accurate VRAM and speed estimates</p>
          </div>
          <button
            onClick={() => runAnalysis(hardware)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-all"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {loading ? "Analyzing…" : "Recalculate"}
          </button>
        </div>
        <HardwareWizard value={hardware} presets={presets} onChange={setHardware} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-bench-muted">
          <Loader2 size={20} className="animate-spin text-bench-accent" />
          <span>Fetching analysis…</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
          <div className="xl:col-span-1">
            <ModelInfoCard model={result} />
          </div>
          <div className="xl:col-span-2 space-y-5">
            {result.gguf_variants && result.gguf_variants.length > 0 && (
              <div className="rounded-2xl border border-bench-border bg-bench-card p-5">
                <h3 className="font-semibold text-bench-text text-sm mb-4">Quantization Ladder</h3>
                <QuantLadder variants={result.gguf_variants} availableGb={hardware.vram_gb ?? hardware.ram_gb} />
              </div>
            )}
            {result.benchmarks && <BenchmarkChart modelA={result} />}
            {result.capability_scores && <CapabilityRadar modelA={result} />}
          </div>
        </div>
      )}

      {/* SEO content block — always visible */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-6 space-y-4 prose-bench">
        <h2 className="font-bold text-bench-text text-lg">
          How to run {info.name} locally
        </h2>
        <p className="text-bench-muted text-sm leading-relaxed">
          {info.name} is a {info.params} parameter {info.arch} architecture model available in GGUF format
          via bartowski&apos;s quantized releases on HuggingFace. GGUF format allows running the model
          with llama.cpp, Ollama, LM Studio, and other local inference tools without needing a GPU —
          though GPU acceleration significantly improves speed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[
            { tool: "llama.cpp", detail: "Best performance, GGUF native, CPU+GPU hybrid" },
            { tool: "Ollama",    detail: "Easiest setup, one command, model management" },
            { tool: "LM Studio", detail: "GUI interface, best for non-technical users" },
          ].map(({ tool, detail }) => (
            <div key={tool} className="rounded-xl border border-bench-border bg-bench-surface p-3">
              <p className="font-semibold text-bench-text text-sm">{tool}</p>
              <p className="text-xs text-bench-muted mt-0.5">{detail}</p>
            </div>
          ))}
        </div>
        <p className="text-bench-muted text-sm leading-relaxed">
          Use the hardware selector above to see exact memory requirements for your system.
          The analysis shows weight memory + KV cache + framework overhead — all three components
          matter when choosing a quantization level.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link href="/run-check" className="flex items-center gap-1.5 text-bench-accent hover:underline text-sm">
            <HardDrive size={13} /> Check all models for your hardware
          </Link>
          <span className="text-bench-border">·</span>
          <Link href={`/compare?a=${encodeURIComponent(info.repoId)}`} className="flex items-center gap-1.5 text-bench-accent hover:underline text-sm">
            Compare with another model <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
