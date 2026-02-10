"use client";

import type { AgentFullState } from "@battle-royale/shared";

interface LeaderboardProps {
  agents: Map<number, AgentFullState>;
  selectedId?: number | null;
  onSelect: (id: number) => void;
}

export function Leaderboard({ agents, selectedId, onSelect }: LeaderboardProps) {
  const sorted = Array.from(agents.values())
    .sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.killCount - a.killCount || b.hp - a.hp;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {sorted.map((agent, i) => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 8px",
            background: selectedId === agent.id ? "rgba(255,170,34,0.08)" : "transparent",
            border: "none",
            borderLeft: selectedId === agent.id ? "2px solid #ffaa22" : "2px solid transparent",
            cursor: "pointer",
            textAlign: "left",
            opacity: agent.alive ? 1 : 0.35,
            borderRadius: 2,
            width: "100%",
          }}
        >
          <span style={{ fontSize: 10, color: "#444", width: 16, fontVariantNumeric: "tabular-nums" }}>
            {i + 1}
          </span>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: agent.alive ? `hsl(${(agent.id * 137) % 360}, 70%, 60%)` : "#333",
            flexShrink: 0,
          }} />
          <span style={{ flex: 1, fontSize: 12, color: agent.alive ? "#ccc" : "#555" }}>
            {agent.name}
          </span>
          <span style={{ fontSize: 11, color: "#888", fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>
            {agent.alive ? `${agent.hp}` : "☠"}
          </span>
          <span style={{ fontSize: 11, color: "#ffaa22", fontVariantNumeric: "tabular-nums", width: 20, textAlign: "right" }}>
            {agent.killCount > 0 ? `${agent.killCount}K` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
