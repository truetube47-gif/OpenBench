"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, Heart, MessageSquare, Eye, HardDrive,
  ExternalLink, Tag, Send, CornerDownRight
} from "lucide-react";
import { getCommunityPost, addComment, likePost } from "@/lib/api";
import type { PostResponse, CommentResponse } from "@/lib/types";
import AuthorAvatar from "@/components/AuthorAvatar";
import ModelInfoCard from "@/components/ModelInfoCard";
import type { ModelAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "ssr";
  let tok = localStorage.getItem("ob-session");
  if (!tok) {
    tok = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("ob-session", tok);
  }
  return tok;
}

function CommentNode({
  comment,
  postId,
  depth = 0,
  onReply,
}: {
  comment: CommentResponse;
  postId: number;
  depth?: number;
  onReply: (parentId: number, authorName: string) => void;
}) {
  return (
    <div className={cn("space-y-3", depth > 0 && "pl-6 border-l border-bench-border/50")}>
      <div className="flex gap-3">
        <AuthorAvatar name={comment.author_name} seed={comment.author_seed} size={26} />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-bench-text">{comment.author_name}</span>
            <span className="text-bench-muted">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-bench-muted leading-relaxed">{comment.body}</p>
          {depth < 3 && (
            <button
              onClick={() => onReply(comment.id, comment.author_name)}
              className="text-xs text-bench-muted hover:text-bench-accent flex items-center gap-1 transition-colors"
            >
              <CornerDownRight size={11} /> Reply
            </button>
          )}
        </div>
      </div>
      {comment.replies.map((r) => (
        <CommentNode key={r.id} comment={r} postId={postId} depth={depth + 1} onReply={onReply} />
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCommunityPost(Number(id))
      .then(setPost)
      .catch(() => router.push("/community"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleLike() {
    if (!post) return;
    const session = getOrCreateSession();
    try {
      const res = await likePost(post.id, session);
      setLiked(res.liked);
      setPost((p) => p ? { ...p, likes: res.likes } : p);
    } catch { /* ignore */ }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!post || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addComment(post.id, {
        body: commentText.trim(),
        author_name: authorName.trim() || "Anonymous",
        parent_id: replyTo?.id,
      });
      setPost((p) => {
        if (!p) return p;
        if (!replyTo) {
          return { ...p, comments: [...p.comments, { ...comment, replies: [] }], comment_count: p.comment_count + 1 };
        }
        function inject(comments: CommentResponse[]): CommentResponse[] {
          return comments.map((c) =>
            c.id === replyTo?.id
              ? { ...c, replies: [...c.replies, { ...comment, replies: [] }] }
              : { ...c, replies: inject(c.replies) }
          );
        }
        return { ...p, comments: inject(p.comments), comment_count: p.comment_count + 1 };
      });
      setCommentText("");
      setReplyTo(null);
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  function startReply(parentId: number, authorNameStr: string) {
    setReplyTo({ id: parentId, name: authorNameStr });
    setTimeout(() => commentRef.current?.focus(), 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-bench-muted gap-2">
        <Loader2 size={24} className="animate-spin text-bench-accent" />
        Loading post…
      </div>
    );
  }

  if (!post) return null;

  const embeddedAnalysis = post.result_data as unknown as ModelAnalysis | null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Back */}
      <Link href="/community" className="flex items-center gap-1.5 text-bench-muted hover:text-bench-text text-sm transition-colors">
        <ArrowLeft size={14} /> Community Stack
      </Link>

      {/* Post header */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AuthorAvatar name={post.author_name} seed={post.author_seed} size={40} />
            <div>
              <p className="font-semibold text-bench-text">{post.author_name}</p>
              <p className="text-xs text-bench-muted">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-bench-accent/10 border border-bench-accent/30 text-xs text-bench-accent font-medium capitalize">
            {post.post_type}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-bench-text leading-snug">{post.title}</h1>

        {post.body && (
          <p className="text-bench-muted leading-relaxed whitespace-pre-wrap">{post.body}</p>
        )}

        {post.model_repo && (
          <div className="flex items-center gap-2 text-sm text-bench-muted bg-bench-surface px-3 py-2 rounded-lg w-fit">
            {post.is_local ? <HardDrive size={13} /> : <ExternalLink size={13} />}
            <span className="font-mono">{post.model_repo}</span>
            {post.is_local && <span className="text-amber-400 text-xs font-medium">local file</span>}
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/community?tag=${t}`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-bench-border text-xs text-bench-muted hover:text-bench-accent hover:border-bench-accent/30 transition-all"
              >
                <Tag size={9} />
                {t}
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 pt-3 border-t border-white/5 text-sm">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              liked ? "text-rose-400" : "text-bench-muted hover:text-rose-400"
            )}
          >
            <Heart size={15} fill={liked ? "currentColor" : "none"} />
            {post.likes} likes
          </button>
          <span className="flex items-center gap-1.5 text-bench-muted">
            <MessageSquare size={15} />
            {post.comment_count} comments
          </span>
          <span className="flex items-center gap-1.5 text-bench-muted">
            <Eye size={15} />
            {post.views} views
          </span>
        </div>
      </div>

      {/* Embedded analysis result */}
      {embeddedAnalysis && embeddedAnalysis.repo_id && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-bench-muted uppercase tracking-wider">
            Attached Analysis
          </h2>
          <ModelInfoCard model={embeddedAnalysis} />
        </div>
      )}

      {/* Comments */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-bench-text flex items-center gap-2">
          <MessageSquare size={18} className="text-bench-accent" />
          {post.comment_count} Comments
        </h2>

        {post.comments.length === 0 && (
          <p className="text-bench-muted text-sm">No comments yet — be the first!</p>
        )}

        <div className="space-y-6">
          {post.comments.map((c) => (
            <CommentNode key={c.id} comment={c} postId={post.id} onReply={startReply} />
          ))}
        </div>
      </div>

      {/* Comment form */}
      <div className="rounded-2xl border border-bench-border bg-bench-card p-5 space-y-3">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-bench-muted bg-bench-surface px-3 py-1.5 rounded-lg">
            <CornerDownRight size={11} />
            Replying to <span className="font-medium text-bench-text">{replyTo.name}</span>
            <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-bench-text">✕</button>
          </div>
        )}
        <form onSubmit={handleComment} className="space-y-3">
          <textarea
            ref={commentRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts, ask a follow-up, or contribute data…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={80}
              className="flex-1 px-3 py-2 rounded-xl bg-bench-surface border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-bench-accent hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
