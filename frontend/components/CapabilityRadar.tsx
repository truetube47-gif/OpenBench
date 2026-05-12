"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { CapabilityScores, ModelAnalysis } from "@/lib/types";

interface Props {
  modelA?: ModelAnalysis;
  modelB?: ModelAnalysis;
}

const DIMS: { key: keyof CapabilityScores; label: string }[] = [
  { key: "coding",                label: "Coding"        },
  { key: "math",                  label: "Math"          },
  { key: "reasoning",             label: "Reasoning"     },
  { key: "instruction_following", label: "Instructions"  },
  { key: "multilingual",          label: "Multilingual"  },
  { key: "long_context",          label: "Long Context"  },
  { key: "speed",                 label: "Speed"         },
  { key: "creative",              label: "Creative"      },
];

function buildRadarData(a?: CapabilityScores, b?: CapabilityScores) {
  return DIMS.map(({ key, label }) => ({
    subject: label,
    A:       a?.[key] ?? 50,
    B:       b?.[key] ?? 50,
  }));
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bench-card border border-bench-border rounded-lg px-3 py-2 text-sm shadow-xl">
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.stroke }} className="font-mono">
          {p.name}: {p.value?.toFixed(1)}
        </p>
      ))}
    </div>
  );
};

export default function CapabilityRadar({ modelA, modelB }: Props) {
  const data = buildRadarData(
    modelA?.capability_scores ?? undefined,
    modelB?.capability_scores ?? undefined
  );

  const nameA = modelA?.name || "Model A";
  const nameB = modelB?.name || "Model B";

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-bench-text">Capability Profile</h3>
      <p className="text-xs text-bench-muted">
        Based on benchmark scores + scaling-law estimates · 0–100
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#1E2A42" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#8892A4", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            angle={90}
            tick={{ fill: "#8892A4", fontSize: 10 }}
            tickCount={5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name={nameA}
            dataKey="A"
            stroke="#6366F1"
            fill="#6366F1"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          {modelB && (
            <Radar
              name={nameB}
              dataKey="B"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.20}
              strokeWidth={2}
            />
          )}
          {modelB && (
            <Legend
              formatter={(v) => (v === nameA ? nameA : nameB)}
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
