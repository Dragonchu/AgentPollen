"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"

const NAV_ITEMS = [
  { label: "Arena", href: "#arena" },
  { label: "Agents", href: "#agents" },
  { label: "Rules", href: "#rules" },
  { label: "Leaderboard", href: "#leaderboard" },
]

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-md border-b border-border/20" />

      <div className="relative max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-14">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded border border-primary/40 rotate-45 group-hover:border-primary/70 transition-colors" />
            <span
              className="font-mono text-xs font-bold text-primary"
              style={{ textShadow: "0 0 8px hsl(195 100% 50% / 0.6)" }}
            >
              W
            </span>
          </div>
          <span
            className="font-mono text-sm font-bold tracking-[0.3em] uppercase text-foreground"
            style={{ textShadow: "0 0 10px hsl(195 100% 50% / 0.3)" }}
          >
            Whisper
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-3">
          <a
            href="/arena"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded border border-primary/40 bg-primary/5 font-mono text-xs uppercase tracking-wider text-primary hover:bg-primary/10 hover:border-primary/60 transition-all"
            style={{ boxShadow: "0 0 12px hsl(195 100% 50% / 0.15)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-neon" />
            Enter Arena
          </a>

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden relative bg-background/90 backdrop-blur-lg border-b border-border/20">
          <div className="flex flex-col gap-1 px-4 py-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-mono text-sm uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors py-2 border-b border-border/10"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href="/arena"
              className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded border border-primary/40 bg-primary/5 font-mono text-xs uppercase tracking-wider text-primary"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-neon" />
              Enter Arena
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
