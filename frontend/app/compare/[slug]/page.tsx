import type { Metadata } from "next";
import CompareSlugClient from "./CompareSlugClient";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://openbench.ai";

const COMPARE_PAIRS: Record<string, {
  a: string; b: string;
  nameA: string; nameB: string;
  desc: string;
}> = {
  "qwen3-14b-vs-deepseek-r1-14b":   { a: "bartowski/Qwen3-14B-GGUF",                       b: "bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF",  nameA: "Qwen3 14B",          nameB: "DeepSeek R1 14B",     desc: "Qwen3 14B vs DeepSeek R1 14B — both 14B reasoning models. Qwen3 has hybrid thinking mode; R1 excels at chain-of-thought math. Compare VRAM, speed, and benchmark scores." },
  "llama-3-1-8b-vs-qwen2-5-7b":     { a: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",      b: "bartowski/Qwen2.5-7B-Instruct-GGUF",            nameA: "Llama 3.1 8B",       nameB: "Qwen2.5 7B",          desc: "Llama 3.1 8B vs Qwen2.5 7B — the classic 7-8B class matchup. Both fit in 8GB VRAM at Q4_K_M. Which is faster and scores better for your use case?" },
  "phi-4-14b-vs-gemma-3-12b":        { a: "bartowski/phi-4-GGUF",                           b: "bartowski/gemma-3-12b-it-GGUF",                 nameA: "Phi-4 14B",          nameB: "Gemma 3 12B",         desc: "Microsoft Phi-4 14B vs Google Gemma 3 12B — two efficient 12-14B models from top labs. Phi-4 excels at coding and math; Gemma 3 leads on multilinguality and long context." },
  "llama-3-1-8b-vs-mistral-7b":      { a: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",      b: "bartowski/Mistral-7B-Instruct-v0.3-GGUF",       nameA: "Llama 3.1 8B",       nameB: "Mistral 7B",          desc: "Llama 3.1 8B vs Mistral 7B — the most common 7-8B comparison. Both run on 8GB VRAM. Llama 3.1 has more context; Mistral is faster on many hardware configs." },
  "qwen3-32b-vs-llama-3-3-70b":      { a: "bartowski/Qwen3-32B-GGUF",                       b: "bartowski/Meta-Llama-3.3-70B-Instruct-GGUF",    nameA: "Qwen3 32B",          nameB: "Llama 3.3 70B",       desc: "Qwen3 32B vs Llama 3.3 70B — a 32B with reasoning vs a full 70B general model. Qwen3 32B fits on 24GB VRAM; Llama 70B needs 48GB+. Which punches above its weight?" },
  "deepseek-r1-8b-vs-llama-3-1-8b":  { a: "bartowski/DeepSeek-R1-Distill-Llama-8B-GGUF",   b: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",     nameA: "DeepSeek R1 8B",     nameB: "Llama 3.1 8B",        desc: "DeepSeek R1 8B vs Llama 3.1 8B — same size, same 8GB VRAM requirement, very different strengths. R1 for reasoning and math; Llama 3.1 for general chat and instruction following." },
  "qwen3-8b-vs-llama-3-1-8b":        { a: "bartowski/Qwen3-8B-GGUF",                        b: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",     nameA: "Qwen3 8B",           nameB: "Llama 3.1 8B",        desc: "Qwen3 8B vs Llama 3.1 8B — both 8B models running on 8GB VRAM. Qwen3 brings hybrid thinking mode and stronger coding; Llama 3.1 has broader community support." },
  "phi-4-14b-vs-qwen3-14b":          { a: "bartowski/phi-4-GGUF",                           b: "bartowski/Qwen3-14B-GGUF",                      nameA: "Phi-4 14B",          nameB: "Qwen3 14B",           desc: "Phi-4 14B vs Qwen3 14B — Microsoft's coding champion vs Alibaba's reasoning powerhouse. Both fit in 12GB VRAM at Q4_K_M. A key decision for 12-16GB VRAM users." },
  "qwen2-5-72b-vs-llama-3-3-70b":    { a: "bartowski/Qwen2.5-72B-Instruct-GGUF",            b: "bartowski/Meta-Llama-3.3-70B-Instruct-GGUF",    nameA: "Qwen2.5 72B",        nameB: "Llama 3.3 70B",       desc: "Qwen2.5 72B vs Llama 3.3 70B — the 70B-class titan comparison. Both need 48GB+ RAM at Q4_K_M. Qwen2.5 wins on multilingual; Llama 3.3 on reasoning benchmarks." },
  "gemma-3-9b-vs-qwen2-5-7b":        { a: "bartowski/gemma-3-9b-it-GGUF",                   b: "bartowski/Qwen2.5-7B-Instruct-GGUF",            nameA: "Gemma 3 9B",         nameB: "Qwen2.5 7B",          desc: "Google Gemma 3 9B vs Qwen2.5 7B — both fit in 8GB VRAM. Gemma 3 has extended 128K context; Qwen2.5 has stronger multilingual capabilities." },
};

export async function generateStaticParams() {
  return Object.keys(COMPARE_PAIRS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pair = COMPARE_PAIRS[slug];
  if (!pair) return { title: "Comparison Not Found" };

  const title = `${pair.nameA} vs ${pair.nameB} — VRAM, Speed & Benchmark Comparison`;
  return {
    title,
    description: pair.desc,
    keywords: [
      `${pair.nameA} vs ${pair.nameB}`, `${pair.nameA} comparison`, `${pair.nameB} comparison`,
      `${pair.nameA} GGUF`, `${pair.nameB} GGUF`, "local LLM comparison",
      "VRAM requirements", "GGUF benchmark", "llama.cpp", "best local LLM",
    ],
    openGraph: {
      title,
      description: pair.desc,
      url: `${BASE_URL}/compare/${slug}`,
      type: "article",
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: pair.desc },
    alternates: { canonical: `${BASE_URL}/compare/${slug}` },
  };
}

export default async function CompareSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pair = COMPARE_PAIRS[slug];

  const jsonLd = pair ? {
    "@context": "https://schema.org",
    "@type": "ComparisonPage",
    "name": `${pair.nameA} vs ${pair.nameB}`,
    "description": pair.desc,
    "url": `${BASE_URL}/compare/${slug}`,
    "author": { "@type": "Organization", "name": "OpenBench", "url": BASE_URL },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CompareSlugClient slug={slug} pair={pair ?? null} allPairs={COMPARE_PAIRS} />
    </>
  );
}
