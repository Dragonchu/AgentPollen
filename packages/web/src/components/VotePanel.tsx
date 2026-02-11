"use client";

import { useState } from "react";
import type { AgentFullState, VoteState } from "@battle-royale/shared";

interface VotePanelProps {
  agents: Map<number, AgentFullState>;
  voteState: VoteState | null;
  onVote: (agentId: number, action: string) => void;
  selectedAgentId?: number | null;
}

const VOTE_OPTIONS = [
  {
    key: "A",
    label: "Rush to Loot Box",
    desc: "Grab nearby supplies before engaging",
    action: "explore and find items",
    color: "#22cc88",
  },
  {
    key: "B",
    label: "Move to Safe Zone",
    desc: "Consolidate approach. Secure position.",
    action: "flee from danger",
    color: "#4488ff",
  },
  {
    key: "C",
    label: "Engage Nearest Enemy",
    desc: "High risk, high reward aggressive play",
    action: "attack the nearest enemy",
    color: "#ff6644",
  },
];

export function VotePanel({ agents, voteState, onVote, selectedAgentId }: VotePanelProps) {
  const [lastVoted, setLastVoted] = useState<string | null>(null);
  const [customAction, setCustomAction] = useState("");

  const agentId = selectedAgentId ?? null;
  const timeRemaining = voteState ? Math.ceil(voteState.timeRemainingMs / 1000) : 0;
  const currentVotes = agentId !== null ? voteState?.agentVotes[agentId] ?? [] : [];
  const totalVotes = currentVotes.reduce((s, v) => s + v.votes, 0);

  const handleVote = (action: string) => {
    if (agentId === null) return;
    onVote(agentId, action);
    setLastVoted(action);
    setTimeout(() => setLastVoted(null), 2000);
  };

  const handleCustomVote = () => {
    if (!customAction.trim()) return;
    handleVote(customAction.trim());
    setCustomAction("");
  };

  const selectedAgent = agentId !== null ? agents.get(agentId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Subtitle */}
      <div style={{ fontSize: 12, color: "#888899" }}>
        {selectedAgent
          ? `Vote to influence ${selectedAgent.name}'s actions`
          : "Select an agent to vote on their next action"}
      </div>

      {/* Timer */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 4,
      }}>
        <div style={{
          fontSize: 36,
          fontWeight: 800,
          color: timeRemaining < 10 ? "#ff4444" : "#ff8800",
          fontVariantNumeric: "tabular-nums",
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1,
        }}>
          0:{timeRemaining.toString().padStart(2, "0")}
        </div>
        <div style={{ fontSize: 11, color: "#555566" }}>
          Time remaining to vote
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3,
        background: "#1a1a2e",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${(timeRemaining / 30) * 100}%`,
          background: timeRemaining < 10
            ? "linear-gradient(90deg, #ff4444, #ff6644)"
            : "linear-gradient(90deg, #ff8800, #ffaa22)",
          transition: "width 1s linear",
          borderRadius: 2,
        }} />
      </div>

      {/* Vote option cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {VOTE_OPTIONS.map((option) => {
          const matchingVote = currentVotes.find(v =>
            v.action.toLowerCase().includes(option.action.split(" ").slice(-2).join(" ").toLowerCase())
          );
          const votePct = matchingVote && totalVotes > 0
            ? Math.round((matchingVote.votes / totalVotes) * 100)
            : 0;
          const isVoted = lastVoted === option.action;

          return (
            <button
              key={option.key}
              onClick={() => handleVote(option.action)}
              disabled={agentId === null}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: isVoted ? `${option.color}11` : "#0a0a14",
                border: `1px solid ${isVoted ? option.color + "44" : "#1a1a2e"}`,
                borderRadius: 8,
                cursor: agentId !== null ? "pointer" : "default",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
                overflow: "hidden",
                opacity: agentId === null ? 0.5 : 1,
              }}
            >
              {/* Vote percentage background fill */}
              <div style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${votePct}%`,
                background: `${option.color}0a`,
                transition: "width 0.3s",
                pointerEvents: "none",
              }} />

              {/* Key badge */}
              <div style={{
                position: "relative",
                width: 28,
                height: 28,
                borderRadius: 6,
                background: `${option.color}18`,
                border: `1px solid ${option.color}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: option.color,
                flexShrink: 0,
              }}>
                {option.key}
              </div>

              {/* Text */}
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#e8e8f0",
                  marginBottom: 1,
                }}>
                  {option.label}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "#555566",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {option.desc}
                </div>
              </div>

              {/* Vote percentage */}
              <div style={{
                position: "relative",
                fontSize: 14,
                fontWeight: 700,
                color: votePct > 0 ? option.color : "#555566",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}>
                {votePct > 0 ? `${votePct}%` : "--"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom action */}
      {agentId !== null && (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            value={customAction}
            onChange={(e) => setCustomAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomVote()}
            placeholder="Or type a custom command..."
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#0a0a14",
              color: "#e8e8f0",
              border: "1px solid #1a1a2e",
              borderRadius: 6,
              fontFamily: "inherit",
              fontSize: 12,
            }}
          />
          <button
            onClick={handleCustomVote}
            disabled={!customAction.trim()}
            style={{
              padding: "8px 14px",
              background: customAction.trim()
                ? "linear-gradient(135deg, #ff8800, #ffaa22)"
                : "#1a1a2e",
              color: customAction.trim() ? "#000" : "#555566",
              border: "none",
              borderRadius: 6,
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
      {agentId !== null && currentVotes.length > 0 && (
        <div style={{
          padding: "10px 12px",
          background: "#0a0a14",
          borderRadius: 6,
          border: "1px solid #1a1a2e",
        }}>
          <div style={{
            fontSize: 10,
            color: "#555566",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 600,
          }}>
            Live Votes ({totalVotes} total)
          </div>
          {currentVotes.map((v, i) => {
            const pct = totalVotes > 0 ? (v.votes / totalVotes) * 100 : 0;
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 3,
                }}>
                  <span style={{ color: i === 0 ? "#ff8800" : "#888899" }}>{v.action}</span>
                  <span style={{ color: "#555566", fontVariantNumeric: "tabular-nums" }}>
                    {v.votes} ({Math.round(pct)}%)
                  </span>
                </div>
                <div style={{
                  height: 3,
                  background: "#1a1a2e",
                  borderRadius: 2,
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: i === 0 ? "#ff8800" : "#333",
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
          color: "#22cc88",
          textAlign: "center",
          fontWeight: 500,
        }}>
          Vote submitted successfully
        </div>
      )}
    </div>
  );
}
