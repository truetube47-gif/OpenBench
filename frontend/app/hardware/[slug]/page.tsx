import type { Metadata } from "next";
import HardwarePageClient from "./HardwarePageClient";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://openbench.ai";

export interface HardwareSpec {
  name: string;
  category: string;
  vram_gb?: number;
  ram_gb: number;
  gpu_bw?: number;
  cpu_bw: number;
  cpu_threads: number;
  desc: string;
  tagline: string;
}

const HARDWARE_MAP: Record<string, HardwareSpec> = {
  "rtx-3060-12gb":   { name: "RTX 3060 12GB",   category: "GPU", vram_gb: 12, ram_gb: 32, gpu_bw: 360, cpu_bw: 50, cpu_threads: 12, tagline: "Best 12GB VRAM GPU for local LLMs", desc: "The RTX 3060 12GB is one of the most popular GPUs for local LLM inference. Its 12GB VRAM fits most 7-13B models at Q4_K_M, and some 14B models at lower quants." },
  "rtx-3060-ti":     { name: "RTX 3060 Ti",      category: "GPU", vram_gb: 8,  ram_gb: 32, gpu_bw: 448, cpu_bw: 50, cpu_threads: 12, tagline: "8GB VRAM — great for 7-8B models",   desc: "The RTX 3060 Ti has 8GB VRAM. At Q4_K_M, it comfortably runs 7-8B models like Llama 3.1 8B and Qwen2.5 7B." },
  "rtx-3070":        { name: "RTX 3070",          category: "GPU", vram_gb: 8,  ram_gb: 32, gpu_bw: 448, cpu_bw: 50, cpu_threads: 12, tagline: "Fast 8GB GPU for 7-8B models",        desc: "The RTX 3070 has 8GB VRAM with excellent memory bandwidth. Ideal for 7-8B models at Q4_K_M or smaller models at Q8_0." },
  "rtx-3080-10gb":   { name: "RTX 3080 10GB",     category: "GPU", vram_gb: 10, ram_gb: 32, gpu_bw: 760, cpu_bw: 50, cpu_threads: 12, tagline: "High bandwidth 10GB GPU",             desc: "The RTX 3080 10GB offers excellent memory bandwidth (760 GB/s), making it one of the fastest options for 7-8B models with headroom for 13B at lower quants." },
  "rtx-3090":        { name: "RTX 3090 24GB",      category: "GPU", vram_gb: 24, ram_gb: 64, gpu_bw: 936, cpu_bw: 50, cpu_threads: 16, tagline: "24GB VRAM — runs 30B models",        desc: "The RTX 3090 24GB is the ultimate consumer GPU for local LLMs. 24GB VRAM lets you run 30B models at Q4_K_M or 7-13B models at Q8_0 with long context." },
  "rtx-4060":        { name: "RTX 4060 8GB",       category: "GPU", vram_gb: 8,  ram_gb: 32, gpu_bw: 272, cpu_bw: 50, cpu_threads: 12, tagline: "Budget GPU for 7B models",            desc: "The RTX 4060 8GB is a budget-friendly option for running 7-8B models at Q4_K_M. Lower memory bandwidth than 3080 but great efficiency." },
  "rtx-4060-ti-16gb":{ name: "RTX 4060 Ti 16GB",  category: "GPU", vram_gb: 16, ram_gb: 32, gpu_bw: 288, cpu_bw: 50, cpu_threads: 12, tagline: "Sweet spot: 16GB on a budget",        desc: "The RTX 4060 Ti 16GB is a sweet spot for local LLMs — enough VRAM to run 13-14B models at Q4_K_M while staying affordable." },
  "rtx-4070":        { name: "RTX 4070 12GB",      category: "GPU", vram_gb: 12, ram_gb: 32, gpu_bw: 504, cpu_bw: 50, cpu_threads: 12, tagline: "Efficient 12GB GPU",                  desc: "The RTX 4070 12GB offers great efficiency and speed. Runs 7-13B models comfortably, and some 14B models at lower quants." },
  "rtx-4070-ti-super":{ name: "RTX 4070 Ti Super 16GB", category: "GPU", vram_gb: 16, ram_gb: 32, gpu_bw: 672, cpu_bw: 50, cpu_threads: 12, tagline: "Fast 16GB mid-range GPU",        desc: "The RTX 4070 Ti Super 16GB combines high bandwidth with 16GB VRAM. Excellent for 13-14B models and can handle some 30B quants." },
  "rtx-4080-16gb":   { name: "RTX 4080 16GB",      category: "GPU", vram_gb: 16, ram_gb: 64, gpu_bw: 717, cpu_bw: 50, cpu_threads: 16, tagline: "High-end 16GB GPU",                  desc: "The RTX 4080 16GB is a high-end option with excellent speed. Runs 13-14B models at Q8_0 and can handle 32B models at lower quants." },
  "rtx-4090":        { name: "RTX 4090 24GB",      category: "GPU", vram_gb: 24, ram_gb: 64, gpu_bw: 1008,cpu_bw: 50, cpu_threads: 16, tagline: "Fastest consumer GPU — runs 30B models",desc: "The RTX 4090 24GB is the fastest consumer GPU for local LLMs. 24GB VRAM at 1 TB/s bandwidth. Runs 30B models at Q4_K_M fast enough for real-time chat." },
  "rtx-5070-ti":     { name: "RTX 5070 Ti 16GB",   category: "GPU", vram_gb: 16, ram_gb: 32, gpu_bw: 896, cpu_bw: 50, cpu_threads: 16, tagline: "Next-gen 16GB speed",                 desc: "The RTX 5070 Ti 16GB brings next-gen bandwidth to 16GB VRAM. Excellent for 13-14B models with room for longer context windows." },
  "rtx-5090":        { name: "RTX 5090 32GB",      category: "GPU", vram_gb: 32, ram_gb: 64, gpu_bw: 1792,cpu_bw: 50, cpu_threads: 16, tagline: "Next-gen 32GB — runs 70B models",    desc: "The RTX 5090 32GB is the ultimate local LLM GPU. 32GB VRAM at extraordinary bandwidth. Can run 70B models at lower quants in real-time." },
  "apple-m1":        { name: "Apple M1 16GB",      category: "Apple Silicon", ram_gb: 16, cpu_bw: 68, cpu_threads: 8,  tagline: "Unified memory — 16GB for all models", desc: "Apple M1 16GB unified memory means the full 16GB is available to models. MLX framework provides excellent performance for GGUF inference on Apple Silicon." },
  "apple-m2-pro":    { name: "Apple M2 Pro 16GB",  category: "Apple Silicon", ram_gb: 16, cpu_bw: 200,cpu_threads: 12, tagline: "Fast unified memory for local LLMs",   desc: "The M2 Pro 16GB has 200 GB/s memory bandwidth and 16GB unified memory. Runs 7-13B models efficiently. Best consumer option for CPU-only inference." },
  "apple-m3-max":    { name: "Apple M3 Max 48GB",  category: "Apple Silicon", ram_gb: 48, cpu_bw: 400,cpu_threads: 16, tagline: "48GB unified memory — runs 30B models", desc: "The M3 Max 48GB is one of the best local LLM machines available. 400 GB/s bandwidth and 48GB unified memory can run 30-70B models at decent speed." },
  "apple-m4-pro":    { name: "Apple M4 Pro 24GB",  category: "Apple Silicon", ram_gb: 24, cpu_bw: 273,cpu_threads: 14, tagline: "Latest Apple Silicon for LLMs",         desc: "The M4 Pro 24GB offers impressive performance for local LLMs with unified memory architecture and the latest neural engine." },
  "16gb-ram-cpu":    { name: "16GB RAM (CPU-only)", category: "CPU-only", ram_gb: 16, cpu_bw: 50, cpu_threads: 8,  tagline: "CPU inference with 16GB RAM",             desc: "Running LLMs on CPU-only with 16GB RAM. You can run 7B models at Q4_K_M (needs ~6GB) but expect 2-8 tok/s depending on your CPU bandwidth." },
  "32gb-ram-cpu":    { name: "32GB RAM (CPU-only)", category: "CPU-only", ram_gb: 32, cpu_bw: 50, cpu_threads: 16, tagline: "CPU inference with 32GB RAM",             desc: "32GB RAM CPU-only lets you run 13-14B models at Q4_K_M comfortably. Expect 4-10 tok/s on modern CPUs with good memory bandwidth." },
  "64gb-ram-cpu":    { name: "64GB RAM (CPU-only)", category: "CPU-only", ram_gb: 64, cpu_bw: 80, cpu_threads: 32, tagline: "Run 70B models CPU-only",                 desc: "64GB RAM CPU-only can run 70B models at Q2_K. With a Ryzen 9 or Threadripper and high-bandwidth RAM, expect 3-6 tok/s on very large models." },
};

export async function generateStaticParams() {
  return Object.keys(HARDWARE_MAP).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hw = HARDWARE_MAP[slug];
  if (!hw) return { title: "Hardware Not Found" };

  const vramStr = hw.vram_gb ? `${hw.vram_gb}GB VRAM` : `${hw.ram_gb}GB RAM`;
  const title = `${hw.name} LLM Compatibility — Which AI Models Can It Run?`;
  const desc = `${hw.tagline}. ${hw.desc} See VRAM requirements, recommended quantization, and expected token speed for popular LLMs.`;

  return {
    title,
    description: desc,
    keywords: [
      hw.name, `${hw.name} LLM`, `${hw.name} AI models`, `can ${hw.name} run LLM`,
      `${vramStr} models`, `best models for ${vramStr}`, "local LLM", "GGUF",
      "llama.cpp compatibility", "quantization", "VRAM requirements",
    ],
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/hardware/${slug}`,
      type: "article",
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: desc },
    alternates: { canonical: `${BASE_URL}/hardware/${slug}` },
  };
}

export default async function HardwarePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hw = HARDWARE_MAP[slug];

  const jsonLd = hw ? {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": `${hw.name} LLM Compatibility — Which AI Models Can It Run?`,
    "description": hw.desc,
    "url": `${BASE_URL}/hardware/${slug}`,
    "author": { "@type": "Organization", "name": "OpenBench", "url": BASE_URL },
    "publisher": { "@type": "Organization", "name": "OpenBench", "url": BASE_URL },
    "about": { "@type": "Product", "name": hw.name, "description": hw.desc },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <HardwarePageClient slug={slug} hw={hw ?? null} allHardware={HARDWARE_MAP} />
    </>
  );
}
