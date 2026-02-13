"use client";

import type { WorldSyncState } from "@battle-royale/shared";

interface HeaderProps {
  world: WorldSyncState | null;
  connected: boolean;
  aliveCount: number;
}

export function Header({ world, connected, aliveCount }: HeaderProps) {
  const round = world ? `Round ${Math.floor(world.tick / 30) + 1}/${20}` : "---";
  const ticksRemaining = world ? Math.max(0, 600 - world.tick) : 0;
  const minutes = Math.floor(ticksRemaining / 60);
  const seconds = ticksRemaining % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} remaining`;

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-secondary border-b border-border/30 backdrop-blur-sm min-h-[56px]">
      {/* Left: Logo + LIVE badge */}
      <div className="flex items-center gap-4">
        <h1
          className="m-0 text-lg font-mono font-bold tracking-[0.3em] uppercase text-foreground"
          style={{ textShadow: "0 0 10px hsl(195 100% 50% / 0.3)" }}
        >
          <span className="text-accent">AI</span> Battle Royale
        </h1>
        <div className={`flex items-center gap-1.5 rounded px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
          connected
            ? "bg-emerald-400/10 border border-emerald-400/40 text-emerald-400"
            : "bg-destructive/10 border border-destructive/40 text-destructive"
        }`}>
          <div
            className={`w-1.5 h-1.5 rounded-full animate-pulse-neon ${
              connected ? "bg-emerald-400" : "bg-destructive"
            }`}
            style={{ boxShadow: connected ? "0 0 6px hsl(155 70% 50%)" : "0 0 6px hsl(0 84% 60%)" }}
          />
          LIVE
        </div>
      </div>

      {/* Center: Round + Time + Players */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-foreground font-semibold">{round}</span>
          <span className="text-xs text-muted-foreground/60">{timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="font-semibold text-foreground">{aliveCount}</span>
          Players Alive
        </div>
      </div>

      {/* Right: Buttons */}
      <div className="flex items-center gap-2.5">
        <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/5 border border-border/40 rounded-md font-mono text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground hover:border-border/60 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/20 border border-primary/40 rounded-md font-mono text-xs uppercase tracking-wider text-primary font-semibold cursor-pointer hover:bg-primary/30 transition-colors"
          style={{ boxShadow: "0 0 12px hsl(195 100% 50% / 0.15)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Premium View
        </button>
      </div>
    </header>
  );
}
