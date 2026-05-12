"use client";

import { useState } from "react";
import { Share2, Copy, Check, Loader2, X } from "lucide-react";
import { createShare } from "@/lib/api";
import type { SharedLinkCreate } from "@/lib/types";

interface Props {
  type: "compare" | "analyze";
  params: Record<string, unknown>;
  label?: string;
}

export default function ShareButton({ type, params, label = "Share" }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleShare() {
    setState("loading");
    setOpen(true);
    try {
      const res = await createShare({ type, params } as SharedLinkCreate);
      const fullUrl = `${window.location.origin}${res.url}`;
      setShareUrl(fullUrl);
      setState("done");
    } catch {
      setState("error");
    }
  }

  async function copyUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setOpen(false);
    setState("idle");
    setShareUrl(null);
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={state === "idle" ? handleShare : () => setOpen(!open)}
        disabled={state === "loading"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bench-card border border-bench-border text-bench-muted hover:text-bench-text hover:border-bench-accent/50 transition-all text-sm disabled:opacity-50"
      >
        {state === "loading" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Share2 size={14} />
        )}
        {label}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-40 w-80 rounded-xl border border-bench-border bg-bench-card shadow-2xl p-4 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-bench-text">Share this {type}</p>
            <button onClick={reset} className="text-bench-muted hover:text-bench-text">
              <X size={14} />
            </button>
          </div>

          {state === "loading" && (
            <div className="flex items-center gap-2 text-bench-muted text-sm">
              <Loader2 size={14} className="animate-spin" />
              Generating link…
            </div>
          )}

          {state === "error" && (
            <p className="text-red-400 text-sm">Failed to generate link. Try again.</p>
          )}

          {state === "done" && shareUrl && (
            <>
              <div className="flex items-center gap-2 bg-bench-surface rounded-lg px-3 py-2 border border-bench-border">
                <p className="flex-1 text-xs text-bench-muted font-mono truncate">{shareUrl}</p>
                <button
                  onClick={copyUrl}
                  className="shrink-0 text-bench-accent hover:text-indigo-300 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-bench-muted">
                Anyone with this link can view the same comparison with identical settings.
              </p>
              {copied && (
                <p className="text-xs text-emerald-400 font-medium">Copied to clipboard!</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
