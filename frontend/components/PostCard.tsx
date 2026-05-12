"use client";

import Link from "next/link";
import { Heart, MessageSquare, Eye, Tag, HardDrive, ExternalLink } from "lucide-react";
import type { PostResponse } from "@/lib/types";
import AuthorAvatar from "./AuthorAvatar";

interface Props {
  post: PostResponse;
  onLike?: (id: number) => void;
}

const TYPE_STYLES: Record<string, string> = {
  experiment:  "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  question:    "bg-amber-500/15  text-amber-400  border-amber-500/30",
  discussion:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const TYPE_LABEL: Record<string, string> = {
  experiment: "Experiment",
  question:   "Question",
  discussion: "Discussion",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostCard({ post, onLike }: Props) {
  return (
    <Link
      href={`/community/${post.id}`}
      className="block rounded-2xl border border-bench-border bg-bench-card hover:border-bench-accent/40 transition-all group p-5 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AuthorAvatar name={post.author_name} seed={post.author_seed} size={30} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-bench-text truncate">{post.author_name}</p>
            <p className="text-xs text-bench-muted">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full border text-xs font-medium ${TYPE_STYLES[post.post_type] ?? TYPE_STYLES.discussion}`}>
          {TYPE_LABEL[post.post_type] ?? post.post_type}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-bench-text group-hover:text-bench-accent transition-colors leading-snug">
        {post.title}
      </h3>

      {/* Body preview */}
      {post.body && (
        <p className="text-sm text-bench-muted line-clamp-2 leading-relaxed">{post.body}</p>
      )}

      {/* Model ref */}
      {post.model_repo && (
        <div className="flex items-center gap-1.5 text-xs text-bench-muted">
          {post.is_local ? <HardDrive size={11} /> : <ExternalLink size={11} />}
          <span className="font-mono truncate max-w-xs">{post.model_repo}</span>
          {post.is_local && <span className="text-amber-400 font-medium">local</span>}
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.slice(0, 5).map((t) => (
            <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-bench-surface border border-bench-border text-xs text-bench-muted">
              <Tag size={9} />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center gap-4 text-xs text-bench-muted pt-1 border-t border-white/5">
        <button
          onClick={(e) => { e.preventDefault(); onLike?.(post.id); }}
          className="flex items-center gap-1 hover:text-rose-400 transition-colors"
        >
          <Heart size={12} />
          {post.likes}
        </button>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} />
          {post.comment_count}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={12} />
          {post.views}
        </span>
      </div>
    </Link>
  );
}
