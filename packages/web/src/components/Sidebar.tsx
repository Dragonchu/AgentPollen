"use client";

import type { AgentFullState } from "@battle-royale/shared";

interface SidebarProps {
  agents: Map<number, AgentFullState>;
  selectedId?: number | null;
  onSelect: (id: number) => void;
}

const NAV_ITEMS = [
  { label: "Live Arena", icon: "arena", active: true },
  { label: "Leaderboard", icon: "leaderboard", active: false },
  { label: "Match History", icon: "history", active: false },
];

function NavIcon({ type }: { type: string }) {
  switch (type) {
    case "arena":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="14" width="4" height="8" />
          <rect x="10" y="6" width="4" height="16" />
          <rect x="16" y="10" width="4" height="12" />
        </svg>
      );
    case "history":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar({ agents, selectedId, onSelect }: SidebarProps) {
  const sorted = Array.from(agents.values())
    .sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.killCount - a.killCount || b.hp - a.hp;
    });

  return (
    <aside className="w-[220px] min-w-[220px] bg-secondary border-r border-border/30 flex flex-col h-full overflow-hidden">
      {/* Navigation */}
      <nav className="p-4 px-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-xs uppercase tracking-[0.15em] cursor-pointer transition-all ${
              item.active
                ? "font-semibold text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
            }`}
          >
            <NavIcon type={item.icon} />
            {item.label}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="h-px bg-border/20 mx-3" />

      {/* Active Players */}
      <div className="p-3 flex-1 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-bold mb-2.5 px-1">
          Active Players
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-px">
          {sorted.map((agent) => {
            const hue = (agent.id * 137) % 360;
            const isSelected = selectedId === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => onSelect(agent.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 border-none rounded cursor-pointer text-left w-full transition-colors ${
                  isSelected ? "bg-primary/10" : "bg-transparent hover:bg-primary/5"
                } ${agent.alive ? "opacity-100" : "opacity-35"}`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: agent.alive ? `hsl(${hue}, 70%, 60%)` : "#333",
                    boxShadow: agent.alive ? `0 0 4px hsl(${hue}, 70%, 60%)` : "none",
                  }}
                />
                <span className={`flex-1 text-xs ${
                  isSelected ? "text-primary font-semibold" : agent.alive ? "text-foreground/80" : "text-muted-foreground/60"
                }`}>
                  {agent.name}
                </span>
                {agent.alive && (
                  <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                    {agent.hp}HP
                  </span>
                )}
                {!agent.alive && (
                  <span className="font-mono text-[10px] text-destructive font-bold">DEAD</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-foreground"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
        >
          G
        </div>
        <div>
          <div className="text-xs text-foreground font-medium">Guest</div>
          <div className="font-mono text-[10px] text-muted-foreground/60">Spectator</div>
        </div>
      </div>
    </aside>
  );
}
