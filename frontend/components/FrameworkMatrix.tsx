"use client";

import { CheckCircle2, XCircle, MinusCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  architecture: string;
  className?: string;
}

type Support = "yes" | "no" | "partial" | "unknown";

interface FrameworkRow {
  name: string;
  gguf: Support;
  flashAttn: Support;
  specDecode: Support;
  moe: Support;
  ropeScale: Support;
  multimodal: Support;
  notes?: string;
}

const FRAMEWORK_DATA: FrameworkRow[] = [
  {
    name: "llama.cpp",
    gguf: "yes", flashAttn: "yes", specDecode: "yes", moe: "yes", ropeScale: "yes", multimodal: "partial",
    notes: "Best GGUF support. Partial offload. CPU+GPU hybrid.",
  },
  {
    name: "Ollama",
    gguf: "yes", flashAttn: "yes", specDecode: "no", moe: "yes", ropeScale: "yes", multimodal: "partial",
    notes: "Built on llama.cpp. Easy CLI. No speculative decoding yet.",
  },
  {
    name: "LM Studio",
    gguf: "yes", flashAttn: "yes", specDecode: "no", moe: "yes", ropeScale: "yes", multimodal: "partial",
    notes: "GUI wrapper for llama.cpp. Best for non-technical users.",
  },
  {
    name: "vLLM",
    gguf: "no", flashAttn: "yes", specDecode: "yes", moe: "yes", ropeScale: "yes", multimodal: "partial",
    notes: "Highest throughput for production. Requires HF format, not GGUF.",
  },
  {
    name: "Transformers",
    gguf: "partial", flashAttn: "yes", specDecode: "yes", moe: "yes", ropeScale: "yes", multimodal: "yes",
    notes: "GGUF load supported in recent versions. Best ecosystem breadth.",
  },
  {
    name: "MLX",
    gguf: "partial", flashAttn: "yes", specDecode: "no", moe: "partial", ropeScale: "yes", multimodal: "partial",
    notes: "Apple Silicon only. Excellent M-series performance.",
  },
  {
    name: "TensorRT-LLM",
    gguf: "no", flashAttn: "yes", specDecode: "yes", moe: "yes", ropeScale: "yes", multimodal: "partial",
    notes: "NVIDIA only. Highest GPU throughput. Complex setup.",
  },
];

// Architecture-specific override hints
const ARCH_NOTES: Record<string, string> = {
  llama:   "llama.cpp + Ollama recommended. vLLM works well for serving.",
  mistral: "llama.cpp + Ollama work perfectly. MLX on Apple Silicon.",
  qwen2:   "llama.cpp recommended. vLLM has strong Qwen2 support.",
  qwen3:   "llama.cpp recommended. vLLM added Qwen3 support in v0.5+.",
  gemma3:  "llama.cpp + Transformers. MLX has Gemma support.",
  phi3:    "llama.cpp recommended. Transformers for fine-tuning.",
  falcon3: "llama.cpp. vLLM has partial Falcon support.",
};

function SupportIcon({ s }: { s: Support }) {
  if (s === "yes")     return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (s === "no")      return <XCircle      size={14} className="text-red-400" />;
  if (s === "partial") return <MinusCircle  size={14} className="text-amber-400" />;
  return <HelpCircle size={14} className="text-bench-muted/40" />;
}

const COLS = [
  { key: "gguf",       label: "GGUF" },
  { key: "flashAttn",  label: "Flash Attn" },
  { key: "specDecode", label: "Spec. Decode" },
  { key: "moe",        label: "MoE" },
  { key: "ropeScale",  label: "RoPE Scale" },
  { key: "multimodal", label: "Multimodal" },
] as const;

export default function FrameworkMatrix({ architecture, className }: Props) {
  const hint = ARCH_NOTES[architecture.toLowerCase()];

  return (
    <div className={cn("rounded-2xl border border-bench-border bg-bench-card overflow-hidden", className)}>
      <div className="px-5 py-3.5 border-b border-bench-border">
        <h3 className="font-semibold text-bench-text text-sm">Framework Compatibility</h3>
        {hint && <p className="text-xs text-bench-muted mt-0.5">{hint}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bench-border bg-bench-surface/30">
              <th className="text-left px-4 py-2.5 font-medium text-bench-muted">Framework</th>
              {COLS.map((c) => (
                <th key={c.key} className="text-center px-3 py-2.5 font-medium text-bench-muted whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FRAMEWORK_DATA.map((row, i) => (
              <tr
                key={row.name}
                className={cn(
                  "border-b border-bench-border/50 hover:bg-bench-surface/30 transition-colors",
                  i === FRAMEWORK_DATA.length - 1 && "border-0"
                )}
                title={row.notes}
              >
                <td className="px-4 py-2.5 font-medium text-bench-text whitespace-nowrap">{row.name}</td>
                {COLS.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-center">
                    <div className="flex justify-center">
                      <SupportIcon s={row[c.key]} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-bench-border bg-bench-surface/20 flex items-center gap-4 text-xs text-bench-muted">
        <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-400" /> Full</span>
        <span className="flex items-center gap-1"><MinusCircle size={11} className="text-amber-400" /> Partial</span>
        <span className="flex items-center gap-1"><XCircle size={11} className="text-red-400" /> Not supported</span>
      </div>
    </div>
  );
}
