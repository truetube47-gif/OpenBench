import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://openbench.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "OpenBench — Can I Run This LLM? Local AI Deployment Intelligence",
    template: "%s | OpenBench",
  },
  description:
    "Know exactly which LLMs your hardware can run. Instant VRAM estimates, quantization recommendations, inference speed predictions, and ready-to-paste llama.cpp / Ollama commands.",
  keywords: [
    "can I run LLM locally", "GGUF VRAM requirements", "llama.cpp quantization",
    "best model for 8GB VRAM", "best model for 16GB VRAM", "local LLM deployment",
    "GGUF", "llama.cpp", "Ollama", "VRAM estimation", "model comparison",
    "AI hardware compatibility", "quantization guide", "Open LLM Leaderboard",
    "Hugging Face GGUF", "RTX 3060 LLM", "Apple Silicon LLM",
  ],
  authors: [{ name: "OpenBench" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "OpenBench — Can I Run This LLM?",
    description:
      "Instant VRAM requirements, quantization recommendations, and inference speed for any LLM on your hardware. llama.cpp, Ollama, vLLM recipes included.",
    url: BASE_URL,
    siteName: "OpenBench",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenBench — LLM Comparison Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenBench — Can I Run This LLM?",
    description: "Instant VRAM requirements, quant recommendations, and inference recipes for local LLMs.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bench-bg text-bench-text antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
        <footer className="border-t border-bench-border mt-24 py-10 text-bench-muted text-sm">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            <div>
              <p className="font-semibold text-bench-text mb-2">Tools</p>
              <div className="space-y-1.5">
                <a href="/run-check"   className="block hover:text-bench-text transition-colors">Can I Run This?</a>
                <a href="/analyze"     className="block hover:text-bench-text transition-colors">Analyze Model</a>
                <a href="/compare"     className="block hover:text-bench-text transition-colors">Compare Models</a>
                <a href="/leaderboard" className="block hover:text-bench-text transition-colors">Leaderboard</a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-bench-text mb-2">Popular Models</p>
              <div className="space-y-1.5">
                <a href="/models/llama-3-1-8b"  className="block hover:text-bench-text transition-colors">Llama 3.1 8B</a>
                <a href="/models/qwen3-14b"      className="block hover:text-bench-text transition-colors">Qwen3 14B</a>
                <a href="/models/deepseek-r1-8b" className="block hover:text-bench-text transition-colors">DeepSeek R1 8B</a>
                <a href="/models/phi-4-14b"      className="block hover:text-bench-text transition-colors">Phi-4 14B</a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-bench-text mb-2">Hardware Guides</p>
              <div className="space-y-1.5">
                <a href="/hardware/rtx-3060-12gb" className="block hover:text-bench-text transition-colors">RTX 3060 12GB</a>
                <a href="/hardware/rtx-4090"      className="block hover:text-bench-text transition-colors">RTX 4090 24GB</a>
                <a href="/hardware/apple-m2-pro"  className="block hover:text-bench-text transition-colors">Apple M2 Pro</a>
                <a href="/hardware/16gb-ram-cpu"  className="block hover:text-bench-text transition-colors">16GB RAM CPU</a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-bench-text mb-2">Community</p>
              <div className="space-y-1.5">
                <a href="/community" className="block hover:text-bench-text transition-colors">Feed</a>
                <a href="/badge"     className="block hover:text-bench-text transition-colors">Publish Badge</a>
                <a href="https://github.com/openbench-ai/openbench" target="_blank" rel="noopener noreferrer" className="block hover:text-bench-text transition-colors">GitHub ↗</a>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 pt-6 border-t border-bench-border/50 text-center">
            OpenBench — Open-source LLM deployment intelligence.
          </div>
        </footer>
      </body>
    </html>
  );
}
