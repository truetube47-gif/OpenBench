"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Code2, Badge } from "lucide-react";
import Link from "next/link";

const BADGE_STYLES = [
  {
    id: "flat",
    label: "Flat",
    preview: (repo: string) =>
      `https://img.shields.io/badge/OpenBench-Analyze%20on%20OpenBench-6366f1?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI2IiBmaWxsPSIjNjM2NmYxIi8+PC9zdmc+`,
  },
  {
    id: "for-the-badge",
    label: "Big Badge",
    preview: () =>
      `https://img.shields.io/badge/OpenBench-Analyze-6366f1?style=for-the-badge`,
  },
];

function copyToClipboard(text: string, cb: () => void) {
  navigator.clipboard.writeText(text).then(cb);
}

export default function BadgePage() {
  const [repo, setRepo] = useState("bartowski/Meta-Llama-3.1-8B-Instruct-GGUF");
  const [copied, setCopied] = useState<string | null>(null);

  const analyzeUrl = `${typeof window !== "undefined" ? window.location.origin : "https://openbench.ai"}/analyze?repo=${encodeURIComponent(repo)}`;
  const compareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://openbench.ai"}/compare`;

  const snippets = {
    markdown: `[![Analyze on OpenBench](https://img.shields.io/badge/OpenBench-Analyze-6366f1?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNXYtNEg3bDUtOXY0aDNsLTUgOXoiLz48L3N2Zz4=)](${analyzeUrl})`,
    html: `<a href="${analyzeUrl}" target="_blank"><img src="https://img.shields.io/badge/OpenBench-Analyze-6366f1?style=flat-square" alt="Analyze on OpenBench" /></a>`,
    directLink: analyzeUrl,
  };

  function handleCopy(key: string, text: string) {
    copyToClipboard(text, () => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-bench-bg pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bench-accent/10 border border-bench-accent/30 text-bench-accent text-sm font-medium mb-2">
            <Badge size={14} />
            Publish to OpenBench
          </div>
          <h1 className="text-4xl font-bold text-bench-text">
            Add an OpenBench Badge
          </h1>
          <p className="text-bench-muted text-lg max-w-xl mx-auto">
            Let your users instantly benchmark your model on their hardware.
            Drop a badge in your HuggingFace model card or README.
          </p>
        </div>

        {/* Repo input */}
        <div className="bg-bench-card rounded-2xl border border-bench-border p-6 space-y-4">
          <h2 className="font-semibold text-bench-text">Your model repo</h2>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/model-name-GGUF"
            className="w-full px-4 py-3 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted focus:outline-none focus:border-bench-accent font-mono text-sm"
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-bench-muted">Preview:</span>
            <a href={analyzeUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img
                src="https://img.shields.io/badge/OpenBench-Analyze%20on%20OpenBench-6366f1?style=flat-square"
                alt="Analyze on OpenBench"
              />
            </a>
            <a href={analyzeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-bench-accent flex items-center gap-1 hover:underline">
              Test link <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Snippets */}
        <div className="space-y-4">
          <h2 className="font-semibold text-bench-text text-lg">Copy snippet</h2>

          {(Object.entries(snippets) as [string, string][]).map(([key, code]) => (
            <div key={key} className="bg-bench-card rounded-xl border border-bench-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-bench-border bg-bench-surface/50">
                <div className="flex items-center gap-2">
                  <Code2 size={13} className="text-bench-muted" />
                  <span className="text-xs font-medium text-bench-muted capitalize">
                    {key === "directLink" ? "Direct URL" : key}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(key, code)}
                  className="flex items-center gap-1.5 text-xs text-bench-muted hover:text-bench-text transition-colors"
                >
                  {copied === key ? (
                    <><Check size={12} className="text-emerald-400" /> Copied!</>
                  ) : (
                    <><Copy size={12} /> Copy</>
                  )}
                </button>
              </div>
              <pre className="px-4 py-3 text-xs text-bench-muted overflow-x-auto whitespace-pre-wrap break-all font-mono">
                {code}
              </pre>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-bench-card rounded-2xl border border-bench-border p-6 space-y-4">
          <h2 className="font-semibold text-bench-text">How it works</h2>
          <ol className="space-y-3 text-sm text-bench-muted list-none">
            {[
              "Copy the Markdown or HTML snippet above.",
              "Paste it into your HuggingFace model card README.md.",
              "Users click the badge and land on the OpenBench analyze page with your model pre-loaded.",
              "They can select their hardware profile to see RAM requirements and expected speed.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-bench-accent/20 text-bench-accent text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center">
          <Link
            href={`/analyze?repo=${encodeURIComponent(repo)}`}
            className="px-6 py-3 rounded-xl bg-bench-accent text-white font-semibold hover:bg-indigo-500 transition-colors"
          >
            Try it now
          </Link>
          <Link
            href={compareUrl}
            className="px-6 py-3 rounded-xl border border-bench-border text-bench-muted hover:text-bench-text hover:border-bench-accent/50 transition-all"
          >
            Compare models
          </Link>
        </div>

      </div>
    </main>
  );
}
