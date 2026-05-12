"use client";

import { useState, useRef } from "react";
import { X, Send, Loader2, Plus, Tag } from "lucide-react";
import { createCommunityPost } from "@/lib/api";
import type { PostCreate, PostResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onCreated: (post: PostResponse) => void;
  prefill?: Partial<PostCreate>;
}

const POST_TYPES = [
  { id: "experiment", label: "🧪 Experiment", desc: "Share benchmark results or analysis" },
  { id: "question",   label: "❓ Question",   desc: "Ask the community for help" },
  { id: "discussion", label: "💬 Discussion", desc: "Open-ended topic or idea" },
];

const SUGGESTED_TAGS = [
  "llama", "mistral", "qwen", "gemma", "phi",
  "fine-tuning", "gguf", "quantization", "cpu-only", "low-vram",
  "comparison", "speed", "memory", "benchmark",
];

export default function NewPostModal({ onClose, onCreated, prefill }: Props) {
  const [form, setForm] = useState<PostCreate>({
    title: prefill?.title ?? "",
    body: prefill?.body ?? "",
    post_type: prefill?.post_type ?? "experiment",
    author_name: "",
    model_repo: prefill?.model_repo ?? "",
    is_local: prefill?.is_local ?? false,
    result_data: prefill?.result_data,
    tags: prefill?.tags ?? [],
  });
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function addTag(t: string) {
    const cleaned = t.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
    if (!cleaned || (form.tags ?? []).includes(cleaned) || (form.tags ?? []).length >= 8) return;
    setForm((f) => ({ ...f, tags: [...(f.tags ?? []), cleaned] }));
    setTagInput("");
  }

  function removeTag(t: string) {
    setForm((f) => ({ ...f, tags: (f.tags ?? []).filter((x) => x !== t) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const post = await createCommunityPost({
        ...form,
        author_name: form.author_name?.trim() || "Anonymous",
      });
      onCreated(post);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-bench-border bg-bench-card shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bench-border">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-bench-accent" />
            <h2 className="font-semibold text-bench-text">Share to Community</h2>
          </div>
          <button onClick={onClose} className="text-bench-muted hover:text-bench-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Post type */}
          <div className="grid grid-cols-3 gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, post_type: t.id }))}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all",
                  form.post_type === t.id
                    ? "border-bench-accent/60 bg-bench-accent/10"
                    : "border-bench-border hover:border-bench-accent/30"
                )}
              >
                <p className="text-xs font-semibold text-bench-text">{t.label}</p>
                <p className="text-xs text-bench-muted mt-0.5 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-bench-muted mb-1 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What did you discover?"
              required
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-bench-muted mb-1 block">Description</label>
            <textarea
              value={form.body ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Share your findings, observations, or question in detail..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm resize-none"
            />
          </div>

          {/* Model + local flag */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-bench-muted mb-1 block">Model (optional)</label>
              <input
                value={form.model_repo ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, model_repo: e.target.value }))}
                placeholder="bartowski/Llama-3.2-3B-GGUF or my-finetuned.gguf"
                className="w-full px-3 py-2 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm font-mono"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl bg-bench-surface border border-bench-border">
                <input
                  type="checkbox"
                  checked={form.is_local}
                  onChange={(e) => setForm((f) => ({ ...f, is_local: e.target.checked }))}
                  className="rounded accent-indigo-500"
                />
                <span className="text-sm text-bench-muted">Local file</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-bench-muted mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.tags ?? []).map((t) => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bench-accent/20 border border-bench-accent/30 text-xs text-bench-accent">
                  <Tag size={9} />
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="ml-0.5 hover:text-red-400"><X size={9} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Add tag + Enter"
                className="flex-1 px-3 py-1.5 rounded-lg bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {SUGGESTED_TAGS.filter((t) => !(form.tags ?? []).includes(t)).slice(0, 10).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="px-2 py-0.5 rounded-full border border-bench-border text-xs text-bench-muted hover:border-bench-accent/40 hover:text-bench-accent transition-all"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Author */}
          <div>
            <label className="text-xs text-bench-muted mb-1 block">Your name (optional)</label>
            <input
              value={form.author_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
              placeholder="Anonymous"
              maxLength={80}
              className="w-full px-4 py-2 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-bench-muted hover:text-bench-text transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.title?.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {loading ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
