"use client";

import type { GGUFVariant } from "@/lib/types";
import { canRunColor, canRunBg, quantColor } from "@/lib/utils";

interface Props {
  variants: GGUFVariant[];
  availableGb: number;
}

export default function QuantLadder({ variants, availableGb }: Props) {
  if (!variants.length) {
    return (
      <div className="text-bench-muted text-sm text-center py-6">
        No GGUF variants found in this repo.
      </div>
    );
  }

  const sorted = [...variants].sort((a, b) => b.bits_per_weight - a.bits_per_weight);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-bench-muted mb-3">
        <span>Quantization</span>
        <span>bpw</span>
        <span>File size</span>
        <span>RAM needed</span>
        <span>Status</span>
      </div>

      {sorted.map((v) => {
        const pct = Math.min((v.memory_estimate.total_gb / availableGb) * 100, 100);
        return (
          <div
            key={v.filename}
            className="rounded-xl border border-bench-border bg-bench-card hover:border-bench-accent/30 transition-all p-3"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Quant name */}
              <span className={`font-mono font-semibold text-sm w-20 shrink-0 ${quantColor(v.quantization)}`}>
                {v.quantization}
              </span>

              {/* BPW */}
              <span className="text-bench-muted text-xs w-12 text-center shrink-0">
                {v.bits_per_weight.toFixed(1)}
              </span>

              {/* File size */}
              <span className="text-bench-text text-xs w-14 text-center font-mono shrink-0">
                {v.file_size_gb.toFixed(1)} GB
              </span>

              {/* RAM bar + value */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-bench-muted truncate">{v.filename.split("/").pop()?.slice(-24)}</span>
                  <span className="text-bench-text font-mono shrink-0 ml-2">
                    {v.memory_estimate.total_gb.toFixed(1)} GB
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-bench-surface overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      v.can_run === "comfortable"
                        ? "bg-green-500"
                        : v.can_run === "marginal"
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Status badge */}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${canRunBg(v.can_run)} ${canRunColor(v.can_run)}`}
              >
                {v.can_run === "comfortable"
                  ? "✓ OK"
                  : v.can_run === "marginal"
                  ? "⚠ Tight"
                  : v.can_run === "cannot_run"
                  ? "✗ No"
                  : "?"}
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-bench-muted text-right pt-1">
        Available: {availableGb.toFixed(0)} GB
      </p>
    </div>
  );
}
