"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BenchmarkScores, ModelAnalysis } from "@/lib/types";

interface Props {
  modelA?: ModelAnalysis;
  modelB?: ModelAnalysis;
}

const BENCH_LABELS: Record<string, string> = {
  mmlu:          "MMLU",
  mmlu_pro:      "MMLU-Pro",
  hellaswag:     "HellaSwag",
  arc_challenge: "ARC-C",
  winogrande:    "Winogrande",
  gsm8k:         "GSM8K",
  humaneval:     "HumanEval",
  math_lvl5:     "MATH Lvl5",
};

const EXCLUDED = new Set(["source", "arena_elo"]);

function buildChartData(a?: BenchmarkScores, b?: BenchmarkScores) {
  const keys = Object.keys(BENCH_LABELS);
  return keys
    .map((key) => {
      const av = a?.[key as keyof BenchmarkScores] as number | null | undefined;
      const bv = b?.[key as keyof BenchmarkScores] as number | null | undefined;
      if (av == null && bv == null) return null;
      return {
        name:    BENCH_LABELS[key],
        modelA:  av ?? null,
        modelB:  bv ?? null,
      };
    })
    .filter(Boolean) as { name: string; modelA: number | null; modelB: number | null }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bench-card border border-bench-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-bench-text mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="font-mono">
          {p.name}: {p.value != null ? `${p.value.toFixed(1)}%` : "N/A"}
        </p>
      ))}
    </div>
  );
};

export default function BenchmarkChart({ modelA, modelB }: Props) {
  const data = buildChartData(modelA?.benchmarks ?? undefined, modelB?.benchmarks ?? undefined);

  if (!data.length) {
    return (
      <div className="text-center text-bench-muted py-12 text-sm">
        No benchmark data available for these models.
      </div>
    );
  }

  const nameA = modelA?.name || "Model A";
  const nameB = modelB?.name || "Model B";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-bench-text">Benchmark Scores</h3>
        {modelA?.benchmarks?.source && (
          <span className="text-xs text-bench-muted">
            Source:{" "}
            {modelA.benchmarks.source === "estimated_from_scale"
              ? "Estimated (scaling laws)"
              : "Open LLM Leaderboard v2"}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2A42" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#8892A4", fontSize: 11 }}
            axisLine={{ stroke: "#1E2A42" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#8892A4", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          {modelA && modelB && (
            <Legend
              formatter={(v) => (v === "modelA" ? nameA : nameB)}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          )}
          <Bar
            dataKey="modelA"
            name="modelA"
            fill="#6366F1"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          {modelB && (
            <Bar
              dataKey="modelB"
              name="modelB"
              fill="#8B5CF6"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
