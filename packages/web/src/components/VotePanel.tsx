"use client";

import { useState } from "react";
import type { AgentFullState, VoteState } from "@battle-royale/shared";

/**
 * Voting panel - the core player interaction point.
 *
 * Extension points:
 * - Add preset vote buttons (Attack/Flee/Ally)
 * - Add vote history
 * - Add vote weighting UI
 * - Add cooldown indicator
 * - Add chat/discussion alongside voting
 */
interface VotePanelProps {
  agents: Map<number, AgentFullState>;
  voteState: VoteState | null;
  onVote: (agentId: number, action: string) => void;
}

const QUICK_ACTIONS = [
  { label: "⚔️ Attack", value: "attack the nearest enemy" },
  { label: "🏃 Flee", value: "flee from danger" },
  { label: "🤝 Ally", value: "seek an alliance" },
  { label: "🗡️ Betray", value: "betray your weakest ally" },
  { label: "🔍 Explore", value: "explore and find items" },
];

export function VotePanel({ agents, voteState, onVote }: VotePanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [customAction, setCustomAction] = useState("");
  const [lastVoted, setLastVoted] = useState<string | null>(null);

  const aliveAgents = Array.from(agents.values())
    .filter((a) => a.alive)
    .sort((a, b) => b.killCount - a.killCount);

  const handleVote = (action: string) => {
    if (selectedAgent === null) return;
    onVote(selectedAgent, action);
    setLastVoted(action);
    setTimeout(() => setLastVoted(null), 2000);
  };

  const handleCustomVote = () => {
    if (!customAction.trim()) return;
    handleVote(customAction.trim());
    setCustomAction("");
  };

  const timeRemaining = voteState ? Math.ceil(voteState.timeRemainingMs / 1000) : 0;
  const currentVotes = selectedAgent !== null ? voteState?.agentVotes[selectedAgent] ?? [] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Timer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>
          Vote Window
        </span>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: timeRemaining < 10 ? "#ff4444" : "#ffaa22",
          fontVariantNumeric: "tabular-nums",
        }}>
          {timeRemaining}s
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1a1a2a", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${(timeRemaining / 30) * 100}%`,
          background: timeRemaining < 10 ? "#ff4444" : "#ffaa22",
          transition: "width 1s linear",
          borderRadius: 2,
        }} />
      </div>

      {/* Agent selector */}
      <select
        value={selectedAgent ?? ""}
        onChange={(e) => setSelectedAgent(e.target.value ? Number(e.target.value) : null)}
        style={{
          padding: "8px 10px",
          background: "#0a0a0f",
          color: "#e0e0e0",
          border: "1px solid #1e1e2e",
          borderRadius: 4,
          fontFamily: "inherit",
          fontSize: 13,
        }}
      >
        <option value="">Select an agent to influence...</option>
        {aliveAgents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.hp}HP · {a.killCount}K · {a.personality})
          </option>
        ))}
      </select>

      {/* Quick action buttons */}
      {selectedAgent !== null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.value}
              onClick={() => handleVote(action.value)}
              style={{
                padding: "6px 12px",
                background: lastVoted === action.value ? "#2a4a2a" : "#12121e",
                color: "#ddd",
                border: "1px solid #1e1e2e",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => { (e.target as HTMLElement).style.background = "#1e1e3a"; }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.background = lastVoted === action.value ? "#2a4a2a" : "#12121e"; }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom action input */}
      {selectedAgent !== null && (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            value={customAction}
            onChange={(e) => setCustomAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomVote()}
            placeholder="Or type a custom command..."
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "#0a0a0f",
              color: "#e0e0e0",
              border: "1px solid #1e1e2e",
              borderRadius: 4,
              fontFamily: "inherit",
              fontSize: 12,
            }}
          />
          <button
            onClick={handleCustomVote}
            disabled={!customAction.trim()}
            style={{
              padding: "8px 14px",
              background: customAction.trim() ? "#ffaa22" : "#1a1a2a",
              color: customAction.trim() ? "#000" : "#444",
              border: "none",
              borderRadius: 4,
              cursor: customAction.trim() ? "pointer" : "default",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Vote
          </button>
        </div>
      )}

      {/* Live vote tallies */}
      {selectedAgent !== null && currentVotes.length > 0 && (
        <div style={{
          padding: 10,
          background: "#0a0a12",
          borderRadius: 4,
          border: "1px solid #1a1a2a",
        }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Live Votes
          </div>
          {currentVotes.map((v, i) => {
            const total = currentVotes.reduce((s, v) => s + v.votes, 0);
            const pct = total > 0 ? (v.votes / total) * 100 : 0;
            return (
              <div key={i} style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: i === 0 ? "#ffaa22" : "#888" }}>{v.action}</span>
                  <span style={{ color: "#666", fontVariantNumeric: "tabular-nums" }}>{v.votes}</span>
                </div>
                <div style={{ height: 3, background: "#1a1a2a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: i === 0 ? "#ffaa22" : "#333",
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback */}
      {lastVoted && (
        <div style={{
          fontSize: 11,
          color: "#4caf50",
          textAlign: "center",
          animation: "fadeIn 0.2s",
        }}>
          ✓ Vote submitted
        </div>
      )}
    </div>
  );
}
