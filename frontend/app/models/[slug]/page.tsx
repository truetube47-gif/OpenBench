import type { Metadata } from "next";
import ModelPageClient from "./ModelPageClient";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://openbench.ai";

const SLUG_MAP: Record<string, { repoId: string; name: string; params: string; arch: string; desc: string }> = {
  "llama-3-1-8b":             { repoId: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",    name: "Llama 3.1 8B",            params: "8B",   arch: "llama",   desc: "Meta's Llama 3.1 8B instruct model. Runs comfortably on 8GB VRAM with Q4_K_M. Excellent for coding, chat, and reasoning tasks." },
  "llama-3-2-3b":             { repoId: "bartowski/Llama-3.2-3B-Instruct-GGUF",          name: "Llama 3.2 3B",            params: "3B",   arch: "llama",   desc: "Compact Llama 3.2 3B model. Runs on CPU-only machines with 8GB RAM. Best choice for edge deployment and fast inference." },
  "llama-3-3-70b":            { repoId: "bartowski/Meta-Llama-3.3-70B-Instruct-GGUF",    name: "Llama 3.3 70B",           params: "70B",  arch: "llama",   desc: "Meta's flagship 70B model. Requires Q2_K for 24GB VRAM or 48+ GB RAM for CPU. Near-GPT-4 quality for local deployment." },
  "qwen3-8b":                 { repoId: "bartowski/Qwen3-8B-GGUF",                       name: "Qwen3 8B",                params: "8B",   arch: "qwen3",   desc: "Qwen3 8B with hybrid thinking mode. Excellent reasoning at the 8B class. Q4_K_M fits in 8GB VRAM with 40K context." },
  "qwen3-14b":                { repoId: "bartowski/Qwen3-14B-GGUF",                      name: "Qwen3 14B",               params: "14B",  arch: "qwen3",   desc: "Qwen3 14B — strong reasoning and coding. Fits in 12GB VRAM with Q4_K_M. Top choice in the 14B class." },
  "qwen3-32b":                { repoId: "bartowski/Qwen3-32B-GGUF",                      name: "Qwen3 32B",               params: "32B",  arch: "qwen3",   desc: "Qwen3 32B — near-frontier quality locally. Requires 24GB VRAM (Q4_K_M) or 40GB RAM for CPU. Excellent reasoning." },
  "qwen2-5-7b":               { repoId: "bartowski/Qwen2.5-7B-Instruct-GGUF",            name: "Qwen2.5 7B",              params: "7B",   arch: "qwen2",   desc: "Qwen2.5 7B instruct — multilingual, strong at coding. Fits 8GB VRAM with Q4_K_M. Great Mistral 7B alternative." },
  "qwen2-5-14b":              { repoId: "bartowski/Qwen2.5-14B-Instruct-GGUF",           name: "Qwen2.5 14B",             params: "14B",  arch: "qwen2",   desc: "Qwen2.5 14B — excellent multilingual and reasoning. Best 14B GGUF for 12GB VRAM configs." },
  "qwen2-5-32b":              { repoId: "bartowski/Qwen2.5-32B-Instruct-GGUF",           name: "Qwen2.5 32B",             params: "32B",  arch: "qwen2",   desc: "Qwen2.5 32B — strong reasoning and long context. Requires 24GB VRAM or 40GB RAM. Top local model." },
  "qwen2-5-72b":              { repoId: "bartowski/Qwen2.5-72B-Instruct-GGUF",           name: "Qwen2.5 72B",             params: "72B",  arch: "qwen2",   desc: "Qwen2.5 72B — frontier-class multilingual model. Requires 48GB+ VRAM or 80GB+ RAM for full quality." },
  "mistral-7b":               { repoId: "bartowski/Mistral-7B-Instruct-v0.3-GGUF",       name: "Mistral 7B",              params: "7B",   arch: "mistral", desc: "Mistral 7B v0.3 — fast, reliable, excellent for chat and coding. Runs on any 8GB VRAM GPU. Community favorite." },
  "deepseek-r1-8b":           { repoId: "bartowski/DeepSeek-R1-Distill-Llama-8B-GGUF",  name: "DeepSeek R1 8B",          params: "8B",   arch: "llama",   desc: "DeepSeek R1 distilled 8B — reasoning specialist. Chain-of-thought model in 8B size. Fits 8GB VRAM with Q4_K_M." },
  "deepseek-r1-14b":          { repoId: "bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF",  name: "DeepSeek R1 14B",         params: "14B",  arch: "qwen2",   desc: "DeepSeek R1 distilled 14B — excellent math and reasoning. Best R1 size for 12-16GB VRAM configs." },
  "deepseek-r1-32b":          { repoId: "bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF",  name: "DeepSeek R1 32B",         params: "32B",  arch: "qwen2",   desc: "DeepSeek R1 distilled 32B — near-full R1 quality. Requires 24GB+ VRAM for comfortable local inference." },
  "phi-4-14b":                { repoId: "bartowski/phi-4-GGUF",                          name: "Phi-4 14B",               params: "14B",  arch: "phi3",    desc: "Microsoft Phi-4 14B — exceptional coding and math at small size. Fits 12GB VRAM. Best-in-class for its parameter count." },
  "phi-3-5-mini":             { repoId: "bartowski/Phi-3.5-mini-instruct-GGUF",          name: "Phi-3.5 Mini 3.8B",       params: "3.8B", arch: "phi3",    desc: "Microsoft Phi-3.5 Mini — surprisingly capable 3.8B model. Runs on 4GB VRAM or CPU. Great for edge devices." },
  "gemma-3-4b":               { repoId: "bartowski/gemma-3-4b-it-GGUF",                  name: "Gemma 3 4B",              params: "4B",   arch: "gemma3",  desc: "Google Gemma 3 4B instruct — efficient, capable 4B model. Runs on 4-6GB VRAM or CPU with 8GB RAM." },
  "gemma-3-9b":               { repoId: "bartowski/gemma-3-9b-it-GGUF",                  name: "Gemma 3 9B",              params: "9B",   arch: "gemma3",  desc: "Google Gemma 3 9B instruct — strong reasoning for its size. Fits in 8-10GB VRAM with Q4_K_M." },
  "gemma-3-12b":              { repoId: "bartowski/gemma-3-12b-it-GGUF",                 name: "Gemma 3 12B",             params: "12B",  arch: "gemma3",  desc: "Google Gemma 3 12B instruct — excellent general model. Fits 12GB VRAM (Q4_K_M). Google's best local model." },
};

export async function generateStaticParams() {
  return Object.keys(SLUG_MAP).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const info = SLUG_MAP[slug];
  if (!info) return { title: "Model Not Found" };

  const title = `${info.name} GGUF — VRAM Requirements, Speed & Quantization Guide`;
  const desc = `${info.desc} Check memory requirements, recommended quantization, and inference speed on your hardware.`;

  return {
    title,
    description: desc,
    keywords: [
      info.name, `${info.name} GGUF`, `${info.name} quantization`,
      `${info.name} VRAM`, `${info.name} requirements`, `run ${info.name} locally`,
      `${info.name} llama.cpp`, `${info.name} ollama`, `${info.arch} model`,
      "GGUF", "local LLM", "VRAM estimation",
    ],
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/models/${slug}`,
      type: "article",
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: desc },
    alternates: { canonical: `${BASE_URL}/models/${slug}` },
  };
}

export default async function ModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const info = SLUG_MAP[slug];

  const jsonLd = info ? {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": info.name,
    "applicationCategory": "AI Language Model",
    "description": info.desc,
    "url": `${BASE_URL}/models/${slug}`,
    "provider": { "@type": "Organization", "name": "OpenBench", "url": BASE_URL },
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ModelPageClient slug={slug} info={info ?? null} />
    </>
  );
}
