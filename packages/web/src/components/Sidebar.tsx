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
    <aside style={{
      width: 220,
      minWidth: 220,
      background: "#0e0e1a",
      borderRight: "1px solid #1a1a2e",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Navigation */}
      <nav style={{
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: item.active ? 600 : 400,
              color: item.active ? "#22cc88" : "#888899",
              background: item.active ? "rgba(34,204,136,0.08)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <NavIcon type={item.icon} />
            {item.label}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: "#1a1a2e", margin: "4px 12px" }} />

      {/* Active Players */}
      <div style={{
        padding: "12px",
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#555566",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 10,
          padding: "0 4px",
        }}>
          Active Players
        </div>
        <div style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}>
          {sorted.map((agent) => {
            const hue = (agent.id * 137) % 360;
            const isSelected = selectedId === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => onSelect(agent.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  background: isSelected ? "rgba(34,204,136,0.08)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: agent.alive ? 1 : 0.35,
                  width: "100%",
                  transition: "background 0.15s",
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: agent.alive ? `hsl(${hue}, 70%, 60%)` : "#333",
                  boxShadow: agent.alive ? `0 0 4px hsl(${hue}, 70%, 60%)` : "none",
                  flexShrink: 0,
                }} />
                <span style={{
                  flex: 1,
                  fontSize: 12,
                  color: isSelected ? "#22cc88" : agent.alive ? "#c8c8d0" : "#555566",
                  fontWeight: isSelected ? 600 : 400,
                }}>
                  {agent.name}
                </span>
                {agent.alive && (
                  <span style={{
                    fontSize: 10,
                    color: "#555566",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {agent.hp}HP
                  </span>
                )}
                {!agent.alive && (
                  <span style={{ fontSize: 10, color: "#ff4444" }}>DEAD</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid #1a1a2e",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #8844ff, #22cc88)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
        }}>
          G
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#e8e8f0", fontWeight: 500 }}>Guest</div>
          <div style={{ fontSize: 10, color: "#555566" }}>Spectator</div>
        </div>
      </div>
    </aside>
  );
}
