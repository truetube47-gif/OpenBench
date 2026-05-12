"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Star } from "lucide-react";
import { getModelVariants } from "@/lib/api";
import type { GGUFVariantInfo, ModelVariantsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  repoId: string;
  ramGb?: number;
  onSelect?: (variant: GGUFVariantInfo) => void;
  className?: string;
}

const TIER_COLORS: Record<string, string> = {
  extreme: "text-rose-400",
  high:    "text-emerald-400",
  medium:  "text-indigo-400",
  low:     "text-zinc-400",
};

const RUN_ICON: Record<string, React.ReactNode> = {
  comfortable: <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />,
  marginal:    <AlertTriangle size={13} className="text-yellow-400 shrink-0" />,
  cannot_run:  <XCircle size={13} className="text-red-500 shrink-0" />,
  unknown:     <span className="w-3 h-3 rounded-full bg-zinc-600 shrink-0 inline-block" />,
};

export default function ModelVariantPicker({ repoId, ramGb = 16, onSelect, className }: Props) {
  const [data, setData] = useState<ModelVariantsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!repoId || !repoId.includes("/")) {
      setData(null);
      setError(null);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getModelVariants(repoId, ramGb);
        setData(res);
        setSelected(res.recommended_filename ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load variants");
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 800);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [repoId, ramGb]);

  if (!repoId || !repoId.includes("/")) return null;

  return (
    <div className={cn("rounded-xl border border-bench-border bg-bench-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-bench-border bg-bench-surface/50">
        <span className="text-xs font-semibold text-bench-muted uppercase tracking-wider">
          GGUF Variants
        </span>
        {loading && <Loader2 size={13} className="animate-spin text-bench-accent" />}
        {data && !loading && (
          <span className="text-xs text-bench-muted">{data.total_variants} files</span>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs px-4 py-3">{error}</p>
      )}

      {!loading && !error && data && (
        <div className="max-h-64 overflow-y-auto divide-y divide-bench-border/50">
          {data.variants.map((v) => (
            <button
              key={v.filename}
              onClick={() => {
                setSelected(v.filename);
                onSelect?.(v);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bench-surface transition-all text-xs",
                selected === v.filename && "bg-bench-accent/10 border-l-2 border-bench-accent"
              )}
            >
              {/* Run icon */}
              {RUN_ICON[v.can_run]}

              {/* Name + quant */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-mono font-bold ${TIER_COLORS[v.quality_tier]}`}>
                    {v.quantization}
                  </span>
                  <span className="text-bench-muted">{v.bpw.toFixed(1)} bpw</span>
                  {v.recommended && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bench-accent/20 text-bench-accent font-semibold">
                      <Star size={9} /> Recommended
                    </span>
                  )}
                </div>
                <p className="text-bench-muted truncate max-w-xs mt-0.5 opacity-60">
                  {v.filename.split("/").pop()}
                </p>
              </div>

              {/* Size + RAM bar */}
              <div className="text-right shrink-0">
                <p className="font-mono text-bench-text">{v.size_gb.toFixed(1)} GB</p>
                <div className="w-20 h-1.5 rounded-full bg-bench-surface mt-1 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      v.can_run === "comfortable" ? "bg-emerald-500" :
                      v.can_run === "marginal"    ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min((v.size_gb / (ramGb * 0.75)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && data && (
        <div className="px-4 py-2 border-t border-bench-border bg-bench-surface/30 text-xs text-bench-muted flex gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-400" /> Comfortable
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={11} className="text-yellow-400" /> Marginal
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={11} className="text-red-500" /> Cannot run
          </span>
        </div>
      )}
    </div>
  );
}
