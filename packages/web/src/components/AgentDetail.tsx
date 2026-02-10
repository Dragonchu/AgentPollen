"use client";

import type { AgentFullState, MemoryType } from "@battle-royale/shared";

interface AgentDetailProps {
  agent: AgentFullState;
  onClose: () => void;
}

const MEMORY_TYPE_COLORS: Record<string, string> = {
  observation: "#888",
  reflection: "#aa88ff",
  plan: "#44aaff",
  inner_voice: "#ffaa22",
};

const MEMORY_TYPE_ICONS: Record<string, string> = {
  observation: "👁",
  reflection: "💭",
  plan: "📋",
  inner_voice: "🗣️",
};

export function AgentDetail({ agent, onClose }: AgentDetailProps) {
  const hpPct = agent.hp / (agent.maxHp || 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: `hsl(${(agent.id * 137) % 360}, 70%, 60%)`,
              boxShadow: `0 0 6px hsl(${(agent.id * 137) % 360}, 70%, 60%)`,
            }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#eee" }}>{agent.name}</span>
          </div>
          <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
            {agent.personality} · {agent.weapon}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: 16,
            padding: 2,
          }}
        >
          ✕
        </button>
      </div>

      {/* HP bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 3 }}>
          <span>HP</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{agent.hp}/{agent.maxHp}</span>
        </div>
        <div style={{ height: 6, background: "#1a1a2a", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${hpPct * 100}%`,
            background: hpPct > 0.6 ? "#44ff66" : hpPct > 0.3 ? "#ffaa22" : "#ff2222",
            borderRadius: 3,
            transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[
          { label: "ATK", value: agent.attack, color: "#ff6644" },
          { label: "DEF", value: agent.defense, color: "#4488ff" },
          { label: "KILLS", value: agent.killCount, color: "#ffaa22" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#0a0a12",
            borderRadius: 4,
            padding: "6px 8px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>{stat.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: stat.color, fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Current action */}
      <div style={{
        padding: 8,
        background: "#0a0a12",
        borderRadius: 4,
        borderLeft: "3px solid #ffaa22",
      }}>
        <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
          Current Action
        </div>
        <div style={{ fontSize: 13, color: "#ddd" }}>{agent.currentAction}</div>
      </div>

      {/* Alliances & Enemies */}
      {(agent.alliances.length > 0 || agent.enemies.length > 0) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {agent.alliances.length > 0 && (
            <div style={{ fontSize: 11 }}>
              <span style={{ color: "#4488ff" }}>Allies: </span>
              <span style={{ color: "#888" }}>
                {agent.alliances.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
          {agent.enemies.length > 0 && (
            <div style={{ fontSize: 11 }}>
              <span style={{ color: "#ff4444" }}>Enemies: </span>
              <span style={{ color: "#888" }}>
                {agent.enemies.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Memory stream */}
      <div>
        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Memory Stream
        </div>
        <div style={{
          maxHeight: 200,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          {agent.memories.length === 0 && (
            <div style={{ fontSize: 12, color: "#444", fontStyle: "italic" }}>No memories yet...</div>
          )}
          {[...agent.memories].reverse().map((mem, i) => (
            <div key={i} style={{
              padding: "4px 8px",
              background: "#08080e",
              borderRadius: 3,
              borderLeft: `2px solid ${MEMORY_TYPE_COLORS[mem.type] ?? "#444"}`,
              fontSize: 11,
              color: "#aaa",
              lineHeight: 1.4,
            }}>
              <span style={{ marginRight: 4 }}>{MEMORY_TYPE_ICONS[mem.type] ?? "·"}</span>
              {mem.text}
              <span style={{ float: "right", color: "#444", fontSize: 10 }}>
                ★{mem.importance}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
