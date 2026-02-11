"use client";

import type { AgentFullState } from "@battle-royale/shared";

interface AgentStatsProps {
  agent: AgentFullState | null;
}

function StatBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = Math.min(100, (value / maxValue) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 12, color: "#888899", fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {value}/{maxValue}
        </span>
      </div>
      <div style={{
        height: 6,
        background: "#1a1a2e",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.3s",
        }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: "#0a0a14",
      borderRadius: 6,
      padding: "10px 12px",
      textAlign: "center",
      border: "1px solid #1a1a2e",
    }}>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        color,
        fontVariantNumeric: "tabular-nums",
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 2,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10,
        color: "#555566",
        textTransform: "uppercase",
        letterSpacing: 1,
        fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  );
}

export function AgentStats({ agent }: AgentStatsProps) {
  if (!agent) {
    return (
      <div style={{
        padding: "30px 20px",
        textAlign: "center",
        color: "#555566",
        fontSize: 13,
      }}>
        Select an agent to view stats
      </div>
    );
  }

  const hue = (agent.id * 137) % 360;
  const shield = Math.round(agent.defense * 5); // derive shield from defense stat
  const maxShield = 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Agent name header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 8,
        borderBottom: "1px solid #1a1a2e",
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: `hsl(${hue}, 70%, 60%)`,
          boxShadow: `0 0 6px hsl(${hue}, 70%, 60%)`,
        }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0" }}>
          {agent.name} Stats
        </span>
        <span style={{
          fontSize: 11,
          color: "#555566",
          fontStyle: "italic",
          marginLeft: "auto",
        }}>
          {agent.personality}
        </span>
      </div>

      {/* Health & Shield bars */}
      <StatBar
        label="Health"
        value={agent.hp}
        maxValue={agent.maxHp || 100}
        color={agent.hp > 60 ? "#22cc88" : agent.hp > 30 ? "#ff8800" : "#ff4444"}
      />
      <StatBar
        label="Shield"
        value={shield}
        maxValue={maxShield}
        color="#4488ff"
      />

      {/* Stat boxes grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}>
        <StatBox label="K/D Ratio" value={`${agent.killCount}/${agent.alive ? 0 : 1}`} color="#ff6644" />
        <StatBox label="Attack" value={agent.attack} color="#ffaa22" />
        <StatBox label="Survival" value={`${Math.min(100, Math.round((agent.hp / (agent.maxHp || 100)) * 100))}%`} color="#22cc88" />
        <StatBox label="Defense" value={agent.defense} color="#4488ff" />
      </div>

      {/* Current Action */}
      <div style={{
        padding: "10px 12px",
        background: "#0a0a14",
        borderRadius: 6,
        borderLeft: `3px solid hsl(${hue}, 70%, 60%)`,
      }}>
        <div style={{
          fontSize: 10,
          color: "#555566",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 4,
        }}>
          Current Action
        </div>
        <div style={{ fontSize: 12, color: "#c8c8d0" }}>
          {agent.currentAction || "Idle"}
        </div>
      </div>

      {/* Alliances & Enemies */}
      {(agent.alliances.length > 0 || agent.enemies.length > 0) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {agent.alliances.length > 0 && (
            <div style={{
              fontSize: 11,
              padding: "4px 8px",
              background: "rgba(68,136,255,0.08)",
              borderRadius: 4,
              border: "1px solid rgba(68,136,255,0.2)",
            }}>
              <span style={{ color: "#4488ff" }}>Allies: </span>
              <span style={{ color: "#888899" }}>
                {agent.alliances.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
          {agent.enemies.length > 0 && (
            <div style={{
              fontSize: 11,
              padding: "4px 8px",
              background: "rgba(255,68,68,0.08)",
              borderRadius: 4,
              border: "1px solid rgba(255,68,68,0.2)",
            }}>
              <span style={{ color: "#ff4444" }}>Enemies: </span>
              <span style={{ color: "#888899" }}>
                {agent.enemies.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
