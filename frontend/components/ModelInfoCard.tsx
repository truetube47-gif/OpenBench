"use client";

import {
  formatParams,
  formatCtx,
  canRunLabel,
  canRunBg,
  canRunColor,
  quantColor,
  archIcon,
} from "@/lib/utils";
import type { ModelAnalysis, SpeedEstimate } from "@/lib/types";
import { ExternalLink, Layers, Hash, Clock, Cpu, MessageSquare, Code2, BookOpen } from "lucide-react";
import RunRecipes from "./RunRecipes";
import FrameworkMatrix from "./FrameworkMatrix";

interface Props {
  model: ModelAnalysis;
  side?: "A" | "B";
}

const SIDE_ACCENT: Record<string, string> = {
  A: "from-indigo-500/20 to-violet-500/10 border-indigo-500/30",
  B: "from-violet-500/20 to-pink-500/10  border-violet-500/30",
};

export default function ModelInfoCard({ model, side }: Props) {
  const runStatus = model.can_run;

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-b p-5 space-y-4 ${
        side ? SIDE_ACCENT[side] : "from-bench-card to-bench-surface border-bench-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {side && (
            <span className="text-xs font-bold uppercase tracking-widest text-bench-muted mb-1 block">
              Model {side}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{archIcon(model.architecture)}</span>
            <div>
              <h3 className="font-bold text-bench-text text-lg leading-tight">
                {model.name || model.repo_id.split("/").pop()}
              </h3>
              <a
                href={`https://huggingface.co/${model.repo_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-bench-muted hover:text-bench-accent flex items-center gap-1 transition-colors"
              >
                {model.repo_id}
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>

        {/* Can-run badge */}
        <div
          className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${canRunBg(runStatus)} ${canRunColor(runStatus)}`}
        >
          {canRunLabel(runStatus)}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Hash size={13} />} label="Parameters" value={formatParams(model.parameter_count)} />
        <Stat icon={<Clock size={13} />} label="Context" value={formatCtx(model.context_length)} />
        <Stat
          icon={<Layers size={13} />}
          label="Layers"
          value={model.n_layers ? String(model.n_layers) : "?"}
        />
        <Stat
          icon={<Cpu size={13} />}
          label="KV Heads"
          value={model.n_kv_heads ? String(model.n_kv_heads) : "?"}
        />
      </div>

      {/* Quant + size */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <span
          className={`font-mono text-sm font-semibold ${quantColor(model.quantization)}`}
        >
          {model.quantization}
        </span>
        <span className="text-bench-muted text-xs">
          {model.bits_per_weight.toFixed(1)} bpw
        </span>
        <span className="ml-auto text-bench-muted text-xs">
          {model.file_size_gb.toFixed(1)} GB
        </span>
      </div>

      {/* Memory estimate */}
      {model.memory_estimate && (
        <MemoryBar mem={model.memory_estimate} />
      )}


      {/* Speed */}
      {model.speed_estimate && (
        <SpeedBreakdownRow speed={model.speed_estimate} />
      )}

      {/* License + arch */}
      <div className="flex gap-3 text-xs">
        <Tag label={model.architecture} />
        {model.license !== "unknown" && <Tag label={model.license} />}
      </div>

      <RunRecipes model={model} />
      <FrameworkMatrix architecture={model.architecture} />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bench-surface/60 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1 text-bench-muted text-xs mb-0.5">
        {icon} {label}
      </div>
      <p className="font-mono font-semibold text-bench-text text-sm">{value}</p>
    </div>
  );
}

function MemoryBar({ mem }: { mem: NonNullable<ModelAnalysis["memory_estimate"]> }) {
  const breakdown = [
    { label: "Weights", value: mem.weights_gb, color: "bg-indigo-500" },
    { label: "KV cache", value: mem.kv_cache_gb, color: "bg-violet-500" },
    { label: "Overhead", value: mem.overhead_gb, color: "bg-zinc-500" },
  ];
  const total = mem.total_gb;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-bench-muted">Memory required</span>
        <span className="text-bench-text font-mono font-semibold">
          {total.toFixed(1)} GB
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-bench-surface overflow-hidden flex">
        {breakdown.map((b) => (
          <div
            key={b.label}
            className={`${b.color} opacity-80`}
            style={{ width: `${(b.value / total) * 100}%` }}
            title={`${b.label}: ${b.value.toFixed(2)} GB`}
          />
        ))}
      </div>
      <div className="flex gap-3 text-xs text-bench-muted">
        {breakdown.map((b) => (
          <span key={b.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${b.color}`} />
            {b.label} {b.value.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-bench-surface border border-bench-border text-bench-muted">
      {label}
    </span>
  );
}

const RATING_COLORS: Record<string, string> = {
  excellent: "text-emerald-400 bg-emerald-400/10",
  good:      "text-green-400   bg-green-400/10",
  acceptable:"text-yellow-400  bg-yellow-400/10",
  slow:      "text-orange-400  bg-orange-400/10",
  unusable:  "text-red-500     bg-red-500/10",
};

function RatingPill({ rating }: { rating: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold capitalize ${RATING_COLORS[rating] ?? "text-bench-muted bg-bench-surface"}`}>
      {rating}
    </span>
  );
}

function SpeedBreakdownRow({ speed }: { speed: SpeedEstimate }) {
  const tasks = speed.cpu_tasks;
  return (
    <div className="pt-1 border-t border-white/5 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-bench-muted">CPU speed</span>
        <span className="font-mono text-bench-text">
          {speed.cpu_tps_min.toFixed(0)}–{speed.cpu_tps_max.toFixed(0)} t/s
          {speed.gpu_tps_max && (
            <span className="ml-2 text-indigo-400">
              GPU {speed.gpu_tps_min?.toFixed(0)}–{speed.gpu_tps_max.toFixed(0)} t/s
            </span>
          )}
        </span>
      </div>
      {tasks && (
        <div className="grid grid-cols-3 gap-1">
          <div className="flex flex-col items-center gap-0.5 bg-bench-surface rounded p-1.5">
            <MessageSquare size={10} className="text-bench-muted" />
            <span className="text-xs text-bench-muted">Chat</span>
            <RatingPill rating={tasks.chat} />
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-bench-surface rounded p-1.5">
            <Code2 size={10} className="text-bench-muted" />
            <span className="text-xs text-bench-muted">Code</span>
            <RatingPill rating={tasks.coding} />
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-bench-surface rounded p-1.5">
            <BookOpen size={10} className="text-bench-muted" />
            <span className="text-xs text-bench-muted">Creative</span>
            <RatingPill rating={tasks.creative} />
          </div>
        </div>
      )}
    </div>
  );
}
