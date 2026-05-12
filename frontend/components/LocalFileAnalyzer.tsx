"use client";

import { useState, useRef, useCallback } from "react";
import { HardDrive, Upload, Loader2, AlertTriangle, CheckCircle2, FileCode2 } from "lucide-react";
import { analyzeLocalFile } from "@/lib/api";
import type { ModelAnalysis, HardwareProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  hardware: HardwareProfile;
  onResult: (result: ModelAnalysis) => void;
}

export default function LocalFileAnalyzer({ hardware, onResult }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (f: File) => {
      if (!f.name.endsWith(".gguf")) {
        setError("Only .gguf files are supported");
        return;
      }
      setFile(f);
      setError(null);
      setLoading(true);
      setProgress("Reading first 2 MB of GGUF header…");

      try {
        const hw = hardware as unknown as Record<string, unknown>;
        setProgress("Sending to backend for analysis…");
        const result = await analyzeLocalFile(f, hw);
        setProgress(null);
        onResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
        setProgress(null);
      } finally {
        setLoading(false);
      }
    },
    [hardware, onResult]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 flex gap-3 text-sm">
        <HardDrive size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-bench-muted space-y-1">
          <p className="text-bench-text font-medium">No Hugging Face account needed</p>
          <p>
            Select any local <code className="text-indigo-400">.gguf</code> file — your fine-tune,
            merge, or checkpoint. Only the <strong>first 2 MB</strong> is read (the GGUF header).
            The full model file is <strong>never uploaded</strong>.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all p-10",
          dragging
            ? "border-bench-accent bg-bench-accent/10"
            : "border-bench-border hover:border-bench-accent/50 hover:bg-bench-surface/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".gguf"
          className="hidden"
          onChange={onInputChange}
        />
        {loading ? (
          <>
            <Loader2 size={32} className="text-bench-accent animate-spin" />
            <p className="text-bench-muted text-sm">{progress}</p>
          </>
        ) : file ? (
          <>
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="font-medium text-bench-text">{file.name}</p>
            <p className="text-xs text-bench-muted">{(file.size / 1024 / 1024).toFixed(1)} MB total • Click to change</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-bench-surface border border-bench-border flex items-center justify-center">
              <FileCode2 size={24} className="text-bench-muted" />
            </div>
            <div className="text-center">
              <p className="font-medium text-bench-text">Drop your .gguf file here</p>
              <p className="text-sm text-bench-muted mt-1">or click to browse</p>
            </div>
            <div className="flex gap-4 text-xs text-bench-muted">
              <span>✓ Fine-tunes</span>
              <span>✓ Merged models</span>
              <span>✓ Dev checkpoints</span>
              <span>✓ Custom quants</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <p className="text-xs text-bench-muted text-center">
        Works with llama.cpp GGUF v1–v3. Supports all quantization types.
        Results include RAM requirements and estimated inference speed for your hardware.
      </p>
    </div>
  );
}
