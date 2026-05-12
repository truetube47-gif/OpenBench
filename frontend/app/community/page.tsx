"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Search, Filter, Users, TrendingUp, Flame } from "lucide-react";
import { getCommunityFeed, getCommunityTags } from "@/lib/api";
import type { PostResponse, PostFeedResponse } from "@/lib/types";
import PostCard from "@/components/PostCard";
import NewPostModal from "@/components/NewPostModal";
import { cn } from "@/lib/utils";

const POST_TYPES = [
  { id: "", label: "All" },
  { id: "experiment", label: "Experiments" },
  { id: "question",   label: "Questions" },
  { id: "discussion", label: "Discussions" },
];

export default function CommunityPage() {
  const [feed, setFeed] = useState<PostFeedResponse | null>(null);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [postType, setPostType] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);
  const [showNewPost, setShowNewPost] = useState(false);

  useEffect(() => {
    getCommunityTags().then((r) => setTags(r.tags)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommunityFeed({
        page,
        tag: selectedTag || undefined,
        post_type: postType || undefined,
        search: debouncedSearch || undefined,
      });
      setFeed(res);
    } catch {
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [page, selectedTag, postType, debouncedSearch]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function handlePostCreated(post: PostResponse) {
    setFeed((prev) => prev
      ? { ...prev, posts: [post, ...prev.posts], total: prev.total + 1 }
      : { posts: [post], total: 1, page: 1, per_page: 20 }
    );
  }

  const totalPages = feed ? Math.ceil(feed.total / feed.per_page) : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-bench-text flex items-center gap-2 mb-1">
            <Users size={28} className="text-bench-accent" />
            Community Stack
          </h1>
          <p className="text-bench-muted text-sm">
            Share experiments, ask questions, and learn from other builders
          </p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bench-accent hover:bg-indigo-500 text-white font-semibold text-sm transition-all shrink-0"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Feed */}
        <div className="space-y-5">
          {/* Filters bar */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bench-muted" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search posts…"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bench-card border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm"
              />
            </div>

            {/* Post type tabs */}
            <div className="flex gap-1 bg-bench-card rounded-xl border border-bench-border p-1">
              {POST_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setPostType(t.id); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    postType === t.id
                      ? "bg-bench-accent text-white"
                      : "text-bench-muted hover:text-bench-text"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active tag filter */}
          {selectedTag && (
            <div className="flex items-center gap-2 text-sm text-bench-muted">
              <Filter size={13} />
              Filtered by <span className="text-bench-accent font-medium">#{selectedTag}</span>
              <button onClick={() => setSelectedTag("")} className="text-xs hover:text-bench-text underline">
                Clear
              </button>
            </div>
          )}

          {/* Posts */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-bench-muted gap-2">
              <Loader2 size={20} className="animate-spin text-bench-accent" />
              <span>Loading posts…</span>
            </div>
          )}

          {!loading && feed?.posts.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <p className="text-bench-muted">No posts yet.</p>
              <button
                onClick={() => setShowNewPost(true)}
                className="px-5 py-2 rounded-xl bg-bench-accent text-white text-sm hover:bg-indigo-500 transition-all"
              >
                Be the first to share!
              </button>
            </div>
          )}

          {!loading && feed && feed.posts.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feed.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-bench-border text-bench-muted hover:text-bench-text disabled:opacity-40 text-sm transition-all"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-bench-muted">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-bench-border text-bench-muted hover:text-bench-text disabled:opacity-40 text-sm transition-all"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Stats */}
          <div className="rounded-2xl border border-bench-border bg-bench-card p-5 space-y-3">
            <h3 className="font-semibold text-bench-text flex items-center gap-2 text-sm">
              <TrendingUp size={14} className="text-bench-accent" />
              Community
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-bench-muted">Total posts</span>
                <span className="font-mono text-bench-text">{feed?.total ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bench-muted">Experiments</span>
                <span className="font-mono text-bench-text">
                  {feed?.posts.filter((p) => p.post_type === "experiment").length ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Popular tags */}
          {tags.length > 0 && (
            <div className="rounded-2xl border border-bench-border bg-bench-card p-5 space-y-3">
              <h3 className="font-semibold text-bench-text flex items-center gap-2 text-sm">
                <Flame size={14} className="text-amber-400" />
                Popular Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 20).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => { setSelectedTag(t.name === selectedTag ? "" : t.name); setPage(1); }}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-xs transition-all",
                      selectedTag === t.name
                        ? "bg-bench-accent/20 border-bench-accent/50 text-bench-accent"
                        : "border-bench-border text-bench-muted hover:border-bench-accent/30 hover:text-bench-accent"
                    )}
                  >
                    #{t.name}
                    <span className="ml-1 opacity-50">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div className="rounded-2xl border border-bench-border bg-bench-card p-5 space-y-2.5 text-sm text-bench-muted">
            <h3 className="font-semibold text-bench-text">About this Stack</h3>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>Share model experiments & benchmarks</li>
              <li>Post questions about running LLMs</li>
              <li>Upload from Hugging Face or local files</li>
              <li>Like, comment, and discuss results</li>
            </ul>
          </div>
        </aside>
      </div>

      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
