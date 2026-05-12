"use client";

import { useState } from "react";
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ModelAnalysis, HardwareProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  model: ModelAnalysis;
  hardware?: HardwareProfile | null;
}

const OLLAMA_MODELS: Record<string, string> = {
  "bartowski/Llama-3.2-3B-Instruct-GGUF":         "llama3.2:3b",
  "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF":    "llama3.1:8b",
  "bartowski/Meta-Llama-3.3-70B-Instruct-GGUF":   "llama3.3:70b",
  "bartowski/Qwen2.5-7B-Instruct-GGUF":           "qwen2.5:7b",
  "bartowski/Qwen2.5-14B-Instruct-GGUF":          "qwen2.5:14b",
  "bartowski/Qwen2.5-32B-Instruct-GGUF":          "qwen2.5:32b",
  "bartowski/Qwen2.5-72B-Instruct-GGUF":          "qwen2.5:72b",
  "bartowski/Qwen3-8B-GGUF":                      "qwen3:8b",
  "bartowski/Qwen3-14B-GGUF":                     "qwen3:14b",
  "bartowski/Qwen3-32B-GGUF":                     "qwen3:32b",
  "bartowski/Mistral-7B-Instruct-v0.3-GGUF":      "mistral:7b",
  "bartowski/gemma-3-4b-it-GGUF":                 "gemma3:4b",
  "bartowski/gemma-3-9b-it-GGUF":                 "gemma3:9b",
  "bartowski/gemma-3-12b-it-GGUF":                "gemma3:12b",
  "bartowski/phi-4-GGUF":                         "phi4",
  "bartowski/Phi-3.5-mini-instruct-GGUF":         "phi3.5",
  "bartowski/DeepSeek-R1-Distill-Llama-8B-GGUF":  "deepseek-r1:8b",
  "bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF":  "deepseek-r1:14b",
  "bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF":  "deepseek-r1:32b",
};

function nglFlag(hardware?: HardwareProfile | null): string {
  if (!hardware?.vram_gb) return "";
  return " -ngl 99";
}

function ctxFlag(model: ModelAnalysis): string {
  const ctx = Math.min(model.context_length, 8192);
  return ` -c ${ctx}`;
}

interface Recipe {
  id: string;
  label: string;
  lang: string;
  code: string;
}

function buildRecipes(model: ModelAnalysis, hardware?: HardwareProfile | null): Recipe[] {
  const quant = model.quantization !== "unknown" ? model.quantization : "Q4_K_M";
  const isLocal = model.repo_id.startsWith("local/");
  const filename = isLocal ? model.repo_id.replace("local/", "") : `${model.name.replace(/\s/g, "-")}-${quant}.gguf`;
  const ollamaModel = OLLAMA_MODELS[model.repo_id];
  const ngl = nglFlag(hardware);
  const ctx = ctxFlag(model);
  const threads = hardware?.cpu_threads ? ` -t ${Math.min(hardware.cpu_threads, 8)}` : "";

  const recipes: Recipe[] = [];

  if (ollamaModel && !isLocal) {
    recipes.push({
      id: "ollama",
      label: "Ollama",
      lang: "bash",
      code: `# Pull and run with Ollama
ollama run ${ollamaModel}

# Or with custom context
ollama run ${ollamaModel} --verbose`,
    });
  }

  recipes.push({
    id: "llamacpp",
    label: "llama.cpp",
    lang: "bash",
    code: `# Interactive chat (llama.cpp CLI)
./llama-cli \\
  -m "${filename}"${ngl}${ctx}${threads} \\
  --chat-template chatml \\
  -i -ins

# Server mode (OpenAI-compatible API)
./llama-server \\
  -m "${filename}"${ngl}${ctx}${threads} \\
  --host 0.0.0.0 --port 8080`,
  });

  if (!isLocal) {
    recipes.push({
      id: "vllm",
      label: "vLLM",
      lang: "bash",
      code: `# Note: vLLM requires the original HuggingFace repo (not GGUF)
# For GGUF, use llama.cpp instead

python -m vllm.entrypoints.openai.api_server \\
  --model "${model.repo_id.replace("-GGUF", "").replace("bartowski/", "")}" \\
  --max-model-len ${Math.min(model.context_length, 8192)} \\
  --dtype auto`,
    });

    recipes.push({
      id: "transformers",
      label: "Transformers",
      lang: "python",
      code: `from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

repo = "${model.repo_id.replace("-GGUF", "").replace("bartowski/", "")}"
tokenizer = AutoTokenizer.from_pretrained(repo)
model = AutoModelForCausalLM.from_pretrained(
    repo,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

messages = [{"role": "user", "content": "Hello!"}]
inputs = tokenizer.apply_chat_template(
    messages, return_tensors="pt", add_generation_prompt=True
).to(model.device)

output = model.generate(inputs, max_new_tokens=256)
print(tokenizer.decode(output[0][inputs.shape[1]:], skip_special_tokens=True))`,
    });
  }

  return recipes;
}

export default function RunRecipes({ model, hardware }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const recipes = buildRecipes(model, hardware);

  function copyCode() {
    navigator.clipboard.writeText(recipes[activeTab].code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-bench-border bg-bench-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bench-surface/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Terminal size={15} className="text-bench-accent" />
          <span className="font-semibold text-bench-text text-sm">How to Run This Model</span>
          <span className="text-xs text-bench-muted">— ready-to-paste commands</span>
        </div>
        {open ? <ChevronUp size={15} className="text-bench-muted" /> : <ChevronDown size={15} className="text-bench-muted" />}
      </button>

      {open && (
        <div className="border-t border-bench-border">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-bench-border bg-bench-surface/30">
            {recipes.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-4 py-2.5 text-xs font-medium transition-all border-b-2",
                  activeTab === i
                    ? "border-bench-accent text-bench-accent"
                    : "border-transparent text-bench-muted hover:text-bench-text"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="relative">
            <button
              onClick={copyCode}
              className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-bench-card border border-bench-border text-bench-muted hover:text-bench-text transition-all text-xs z-10"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="p-5 text-xs font-mono text-bench-muted leading-relaxed overflow-x-auto bg-[#0a0c12] max-h-72 overflow-y-auto">
              {recipes[activeTab].code}
            </pre>
          </div>

          {/* Quick notes */}
          <div className="px-5 py-3 border-t border-bench-border bg-bench-surface/20 text-xs text-bench-muted space-y-1">
            {!hardware?.vram_gb && (
              <p className="text-amber-400">⚠ No GPU detected — CPU mode. Add <code className="bg-bench-surface px-1 rounded">-ngl 99</code> when GPU is available.</p>
            )}
            {hardware?.vram_gb && (
              <p className="text-emerald-400">✓ GPU detected ({hardware.vram_gb} GB VRAM) — <code className="bg-bench-surface px-1 rounded">-ngl 99</code> offloads all layers.</p>
            )}
            <p>Quant used: <code className="bg-bench-surface px-1 rounded">{model.quantization}</code> · Context: <code className="bg-bench-surface px-1 rounded">{model.context_length.toLocaleString()}</code> tokens</p>
          </div>
        </div>
      )}
    </div>
  );
}
