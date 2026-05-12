"use client";

import { useState, useEffect } from "react";
import { Trophy, ChevronUp, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/types";
import { formatParams, benchScoreColor, archIcon } from "@/lib/utils";
import Link from "next/link";

const SORT_FIELDS = [
  { key: "avg_score",    label: "Avg Score"   },
  { key: "mmlu",         label: "MMLU"        },
  { key: "gsm8k",        label: "GSM8K"       },
  { key: "arc_challenge", label: "ARC-C"      },
  { key: "humaneval",    label: "HumanEval"   },
];

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState("avg_score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [archFilter, setArchFilter] = useState("");

  async function fetchData(p = 0, sort = sortBy, filter = archFilter) {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeaderboard({
        page: p,
        per_page: 25,
        sort_by: sort,
        arch: filter || undefined,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function handleSort(field: string) {
    if (field === sortBy) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    fetchData(page, field, archFilter);
  }

  function SortIcon({ field }: { field: string }) {
    if (field !== sortBy) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === "desc"
      ? <ChevronDown size={12} className="text-bench-accent" />
      : <ChevronUp size={12} className="text-bench-accent" />;
  }

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-bench-text mb-1 flex items-center gap-2">
          <Trophy size={28} className="text-amber-400" />
          Open LLM Leaderboard
        </h1>
        <p className="text-bench-muted text-sm">
          Live benchmark data from HuggingFace Open LLM Leaderboard v2
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          value={archFilter}
          onChange={(e) => setArchFilter(e.target.value)}
          placeholder="Filter by architecture (e.g. llama, mistral, qwen)"
          className="flex-1 px-4 py-2.5 rounded-xl bg-bench-card border border-bench-border text-bench-text placeholder-bench-muted/50 focus:outline-none focus:border-bench-accent text-sm"
          onKeyDown={(e) => e.key === "Enter" && fetchData(0, sortBy, archFilter)}
        />
        <button
          onClick={() => { setPage(0); fetchData(0, sortBy, archFilter); }}
          className="px-5 py-2.5 rounded-xl bg-bench-accent hover:bg-indigo-500 text-white font-semibold text-sm transition-all shrink-0"
        >
          Search
        </button>
      </div>

      {/* Sort buttons */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <span className="text-xs text-bench-muted shrink-0">Sort by:</span>
        {SORT_FIELDS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleSort(f.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              sortBy === f.key
                ? "bg-bench-accent/15 text-bench-accent border border-bench-accent/30"
                : "bg-bench-card border border-bench-border text-bench-muted hover:text-bench-text"
            }`}
          >
            {f.label}
            <SortIcon field={f.key} />
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-bench-muted">
          <Loader2 size={24} className="animate-spin text-bench-accent" />
          <span>Loading leaderboard…</span>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-bench-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bench-surface border-b border-bench-border text-bench-muted text-xs">
                    <th className="text-left px-4 py-3 w-8">#</th>
                    <th className="text-left px-4 py-3">Model</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Params</th>
                    <th className="text-center px-3 py-3">Avg</th>
                    <th className="text-center px-3 py-3">MMLU</th>
                    <th className="text-center px-3 py-3">ARC-C</th>
                    <th className="text-center px-3 py-3">GSM8K</th>
                    <th className="text-center px-3 py-3">HumanEval</th>
                    <th className="text-center px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <LeaderboardRow
                      key={entry.repo_id}
                      entry={entry}
                      rank={page * 25 + idx + 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-bench-muted text-sm">
              {total > 0 ? `${total.toLocaleString()} models` : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
                className="px-3 py-1.5 rounded-lg bg-bench-card border border-bench-border text-bench-muted hover:text-bench-text disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-all"
              >
                ← Previous
              </button>
              <span className="text-bench-muted text-sm px-2">
                {page + 1} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
                className="px-3 py-1.5 rounded-lg bg-bench-card border border-bench-border text-bench-muted hover:text-bench-text disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {!loading && entries.length === 0 && !error && (
        <div className="text-center text-bench-muted py-16">
          No models found. The backend may need a HF_TOKEN to access leaderboard data.
        </div>
      )}
    </div>
  );
}

function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <td className="text-center px-3 py-3 text-bench-muted text-xs">—</td>;
  return (
    <td className={`text-center px-3 py-3 font-mono font-semibold ${benchScoreColor(value)}`}>
      {value.toFixed(1)}
    </td>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const medalColor = rank === 1 ? "text-yellow-400" : rank === 2 ? "text-zinc-300" : rank === 3 ? "text-amber-600" : "text-bench-muted";

  return (
    <tr className="border-b border-bench-border hover:bg-bench-surface/50 transition-colors">
      <td className={`px-4 py-3 font-mono text-sm font-bold ${medalColor}`}>{rank}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{archIcon(entry.architecture)}</span>
          <div>
            <p className="font-medium text-bench-text leading-tight">
              {entry.name || entry.repo_id.split("/").pop()}
            </p>
            <a
              href={`https://huggingface.co/${entry.repo_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-bench-muted hover:text-bench-accent flex items-center gap-0.5 transition-colors"
            >
              {entry.repo_id}
              <ExternalLink size={9} />
            </a>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-bench-muted font-mono text-xs whitespace-nowrap">
        {formatParams(entry.parameter_count)}
      </td>
      <ScoreCell value={entry.avg_score} />
      <ScoreCell value={entry.mmlu} />
      <ScoreCell value={entry.arc_challenge} />
      <ScoreCell value={entry.gsm8k} />
      <ScoreCell value={entry.humaneval} />
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <Link
            href={`/analyze?repo=${encodeURIComponent(entry.repo_id)}`}
            className="px-2 py-1 rounded-lg text-xs bg-bench-accent/15 text-bench-accent hover:bg-bench-accent/25 transition-all"
          >
            Analyze
          </Link>
        </div>
      </td>
    </tr>
  );
}
