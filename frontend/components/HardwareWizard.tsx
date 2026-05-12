"use client";

import { useState } from "react";
import { Cpu, Monitor, MemoryStick, ChevronDown, ScanSearch, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HardwareProfile, HardwarePreset } from "@/lib/types";

interface Props {
  value: HardwareProfile;
  presets: HardwarePreset[];
  onChange: (hw: HardwareProfile) => void;
  onDetect?: (hw: HardwareProfile) => void;
}

export default function HardwareWizard({ value, presets, onChange, onDetect }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"preset" | "custom">("preset");
  const [detected, setDetected] = useState(false);

  function detectHardware() {
    const threads = navigator.hardwareConcurrency || 8;
    const ramGb = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;

    let gpuName: string | undefined;
    let gpuBw: number | undefined;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
      if (gl) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) {
          const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
          gpuName = renderer.replace(/ANGLE \(|\)$/g, "").split(" Direct3D")[0].trim();
          const lower = gpuName.toLowerCase();
          if (lower.includes("4090"))       gpuBw = 1008;
          else if (lower.includes("4080")) gpuBw = 717;
          else if (lower.includes("4070")) gpuBw = 504;
          else if (lower.includes("4060")) gpuBw = 272;
          else if (lower.includes("3090")) gpuBw = 936;
          else if (lower.includes("3080")) gpuBw = 760;
          else if (lower.includes("3070")) gpuBw = 448;
          else if (lower.includes("3060")) gpuBw = 360;
          else if (lower.includes("m4 max"))  gpuBw = 546;
          else if (lower.includes("m4 pro"))  gpuBw = 273;
          else if (lower.includes("m3 max"))  gpuBw = 300;
          else if (lower.includes("m3 pro"))  gpuBw = 150;
          else if (lower.includes("m2 max"))  gpuBw = 400;
          else if (lower.includes("m2 pro"))  gpuBw = 200;
          else if (lower.includes("m1 max"))  gpuBw = 400;
          else if (lower.includes("m1 pro"))  gpuBw = 200;
          else if (lower.includes("rx 7900")) gpuBw = 960;
          else if (lower.includes("rx 7800")) gpuBw = 624;
        }
      }
    } catch { /* WebGL unavailable */ }

    const cpuBw = threads >= 20 ? 76 : threads >= 12 ? 57 : threads >= 8 ? 51 : 38;
    const hw: HardwareProfile = {
      cpu_name: `Detected CPU (${threads} threads)`,
      cpu_threads: threads,
      ram_gb: ramGb,
      gpu_name: gpuName || undefined,
      vram_gb: undefined,
      cpu_memory_bandwidth_gbps: cpuBw,
      gpu_memory_bandwidth_gbps: gpuBw,
    };
    onChange(hw);
    onDetect?.(hw);
    setDetected(true);
    setTimeout(() => setDetected(false), 3000);
    setOpen(false);
  }

  function applyPreset(p: HardwarePreset) {
    onChange({
      cpu_name: p.cpu_name,
      cpu_threads: p.cpu_threads,
      ram_gb: p.ram_gb,
      gpu_name: p.gpu_name ?? undefined,
      vram_gb: p.vram_gb ?? undefined,
      cpu_memory_bandwidth_gbps: p.cpu_memory_bandwidth_gbps,
      gpu_memory_bandwidth_gbps: p.gpu_memory_bandwidth_gbps ?? undefined,
    });
    setOpen(false);
  }

  const categories = [...new Set(presets.map((p) => p.category))];

  return (
    <div className="relative">
      <div className="flex gap-2">
      <button
        onClick={detectHardware}
        title="Auto-detect your CPU, RAM and GPU"
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0",
          detected
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : "border-bench-border bg-bench-card text-bench-muted hover:text-bench-text hover:border-bench-accent/50"
        )}
      >
        {detected ? <CheckCircle2 size={13} /> : <ScanSearch size={13} />}
        {detected ? "Detected!" : "Detect"}
      </button>
      <button
        onClick={() => setOpen(!open)}
        className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bench-border bg-bench-card hover:border-bench-accent/50 transition-all text-sm justify-between"
      >
        <div className="flex items-center gap-2">
          <Monitor size={15} className="text-bench-accent" />
          <span className="text-bench-text font-medium">
            {value.gpu_name
              ? `${value.gpu_name} / ${value.ram_gb}GB RAM`
              : `CPU Only — ${value.ram_gb}GB RAM`}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-bench-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      </div>
      {detected && (
        <p className="text-[10px] text-bench-muted mt-1.5 ml-1">
          ⚠ Detected hardware may be approximate depending on browser support.
        </p>
      )}

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-30 rounded-xl border border-bench-border bg-bench-card shadow-2xl overflow-hidden animate-slide-up">
          {/* Tabs */}
          <div className="flex border-b border-bench-border">
            {(["preset", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium capitalize transition-all",
                  tab === t
                    ? "text-bench-accent border-b-2 border-bench-accent"
                    : "text-bench-muted hover:text-bench-text"
                )}
              >
                {t === "preset" ? "Quick Presets" : "Custom"}
              </button>
            ))}
          </div>

          {tab === "preset" && (
            <div className="p-3 max-h-80 overflow-y-auto space-y-3">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs text-bench-muted uppercase tracking-wider mb-1.5 px-1">
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {presets
                      .filter((p) => p.category === cat)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => applyPreset(p)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-bench-surface transition-all text-sm"
                        >
                          <span className="font-medium text-bench-text">
                            {p.name}
                          </span>
                          <span className="ml-2 text-bench-muted text-xs">
                            {p.vram_gb ? `${p.vram_gb}GB VRAM` : `${p.ram_gb}GB RAM`} ·{" "}
                            {p.gpu_memory_bandwidth_gbps ?? p.cpu_memory_bandwidth_gbps} GB/s BW
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "custom" && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-bench-muted flex items-center gap-1">
                    <MemoryStick size={11} /> RAM (GB)
                  </span>
                  <input
                    type="number"
                    value={value.ram_gb}
                    onChange={(e) =>
                      onChange({ ...value, ram_gb: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-bench-surface border border-bench-border text-bench-text text-sm focus:outline-none focus:border-bench-accent"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-bench-muted flex items-center gap-1">
                    <Monitor size={11} /> VRAM (GB)
                  </span>
                  <input
                    type="number"
                    value={value.vram_gb ?? ""}
                    placeholder="0 = no GPU"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        vram_gb: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-bench-surface border border-bench-border text-bench-text text-sm focus:outline-none focus:border-bench-accent"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <span className="text-xs text-bench-muted flex items-center gap-1">
                    <Cpu size={11} /> CPU Memory Bandwidth (GB/s)
                  </span>
                  <input
                    type="number"
                    value={value.cpu_memory_bandwidth_gbps}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        cpu_memory_bandwidth_gbps: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-bench-surface border border-bench-border text-bench-text text-sm focus:outline-none focus:border-bench-accent"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <span className="text-xs text-bench-muted flex items-center gap-1">
                    <Monitor size={11} /> GPU Memory Bandwidth (GB/s)
                  </span>
                  <input
                    type="number"
                    value={value.gpu_memory_bandwidth_gbps ?? ""}
                    placeholder="Leave blank if no GPU"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        gpu_memory_bandwidth_gbps: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-bench-surface border border-bench-border text-bench-text text-sm focus:outline-none focus:border-bench-accent"
                  />
                </label>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-full py-2 rounded-lg bg-bench-accent text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
