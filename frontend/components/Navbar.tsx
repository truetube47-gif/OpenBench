"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart2, Search, Trophy, Zap, Badge, Sun, Moon, Users, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/run-check",   label: "Run Check",   icon: Zap        },
  { href: "/compare",     label: "Compare",     icon: BarChart2  },
  { href: "/analyze",     label: "Analyze",     icon: Search     },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy     },
  { href: "/community",   label: "Community",   icon: Users      },
  { href: "/badge",       label: "Publish",     icon: Badge      },
];

const GITHUB_URL = "https://github.com/openbench-ai/openbench";

function OwlLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="OpenBench owl logo">
      {/* Body */}
      <ellipse cx="16" cy="20" rx="9" ry="10" fill="#1e1e2e" stroke="#6366f1" strokeWidth="1.2"/>
      {/* Head */}
      <ellipse cx="16" cy="10" rx="8" ry="7.5" fill="#1e1e2e" stroke="#6366f1" strokeWidth="1.2"/>
      {/* Left ear tuft */}
      <path d="M9 5 L7 1 L11 4Z" fill="#6366f1"/>
      {/* Right ear tuft */}
      <path d="M23 5 L25 1 L21 4Z" fill="#6366f1"/>
      {/* Left eye outer */}
      <circle cx="12.5" cy="10.5" r="3" fill="#6366f1" opacity="0.9"/>
      {/* Right eye outer */}
      <circle cx="19.5" cy="10.5" r="3" fill="#6366f1" opacity="0.9"/>
      {/* Left eye inner */}
      <circle cx="12.5" cy="10.5" r="1.5" fill="#c4b5fd"/>
      {/* Right eye inner */}
      <circle cx="19.5" cy="10.5" r="1.5" fill="#c4b5fd"/>
      {/* Left pupil */}
      <circle cx="13" cy="10" r="0.7" fill="#0f0f1a"/>
      {/* Right pupil */}
      <circle cx="20" cy="10" r="0.7" fill="#0f0f1a"/>
      {/* Beak */}
      <path d="M14.5 13.5 L16 15.5 L17.5 13.5Z" fill="#f59e0b"/>
      {/* Chest feather lines */}
      <path d="M11 18 Q16 16 21 18" stroke="#313244" strokeWidth="1" strokeLinecap="round"/>
      <path d="M11 21 Q16 19 21 21" stroke="#313244" strokeWidth="1" strokeLinecap="round"/>
      {/* Perch bar */}
      <rect x="5" y="28.5" width="22" height="2" rx="1" fill="#4b5563"/>
      {/* Left talon */}
      <path d="M12 28.5 L10 31 M12 28.5 L12 31 M12 28.5 L14 31" stroke="#4b5563" strokeWidth="1" strokeLinecap="round"/>
      {/* Right talon */}
      <path d="M20 28.5 L18 31 M20 28.5 L20 31 M20 28.5 L22 31" stroke="#4b5563" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export default function Navbar() {
  const path = usePathname();
  const [dark, setDark] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("openbench-theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("openbench-theme", next ? "dark" : "light");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-bench-border bg-bench-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bench-accent to-bench-accent2 flex items-center justify-center">
            <OwlLogo size={20} />
          </div>
          <span className="font-bold text-lg text-bench-text group-hover:text-bench-accent transition-colors">
            OpenBench
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                path === href || (href !== "/" && path?.startsWith(href))
                  ? "bg-bench-accent/15 text-bench-accent"
                  : "text-bench-muted hover:text-bench-text hover:bg-bench-card"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right slot */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-bench-muted hover:text-bench-text hover:bg-bench-card transition-all"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block text-bench-muted hover:text-bench-text transition-colors text-sm"
          >
            GitHub
          </a>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg text-bench-muted hover:text-bench-text hover:bg-bench-card transition-all"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-bench-border bg-bench-bg/95 backdrop-blur-md px-4 py-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                path === href || (href !== "/" && path?.startsWith(href))
                  ? "bg-bench-accent/15 text-bench-accent"
                  : "text-bench-muted hover:text-bench-text hover:bg-bench-card"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-bench-muted hover:text-bench-text hover:bg-bench-card transition-all"
          >
            GitHub ↗
          </a>
        </div>
      )}
    </header>
  );
}
