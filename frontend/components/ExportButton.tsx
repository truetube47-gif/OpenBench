"use client";

import { useState } from "react";
import { Download, Image, FileText, Loader2, ChevronDown } from "lucide-react";

interface Props {
  targetId: string;
  filename?: string;
}

export default function ExportButton({ targetId, filename = "openbench-export" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"png" | "pdf" | null>(null);

  async function capture(): Promise<HTMLCanvasElement> {
    const { default: html2canvas } = await import("html2canvas");
    const el = document.getElementById(targetId);
    if (!el) throw new Error("Export target not found");
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0f1117",
      logging: false,
    });
  }

  async function exportPng() {
    setLoading("png");
    setOpen(false);
    try {
      const canvas = await capture();
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("PNG export failed", e);
    } finally {
      setLoading(null);
    }
  }

  async function exportPdf() {
    setLoading("pdf");
    setOpen(false);
    try {
      const canvas = await capture();
      const { jsPDF } = await import("jspdf");
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${filename}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bench-surface border border-bench-border text-bench-muted hover:text-bench-text hover:border-bench-accent/40 transition-all text-sm disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {loading ? `Exporting ${loading.toUpperCase()}…` : "Export"}
        {!loading && <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />}
      </button>

      {open && !loading && (
        <div className="absolute top-full mt-2 right-0 z-40 w-44 rounded-xl border border-bench-border bg-bench-card shadow-2xl overflow-hidden animate-slide-up">
          <button
            onClick={exportPng}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-bench-muted hover:text-bench-text hover:bg-bench-surface transition-all"
          >
            <Image size={14} className="text-indigo-400" />
            Export as PNG
          </button>
          <button
            onClick={exportPdf}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-bench-muted hover:text-bench-text hover:bg-bench-surface transition-all border-t border-bench-border"
          >
            <FileText size={14} className="text-rose-400" />
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
