"use client";

import type { AgentFullState, ThinkingProcess } from "@battle-royale/shared";

interface AIThinkingProcessProps {
  agent: AgentFullState | null;
  thinkingHistory: ThinkingProcess[];
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function AIThinkingProcess({ agent, thinkingHistory }: AIThinkingProcessProps) {
  if (!agent) {
    return (
      <div style={{
        padding: "40px 20px",
        textAlign: "center",
        color: "#555566",
        fontSize: 13,
      }}>
        Select an agent to view their thinking process
      </div>
    );
  }

  // Use history if available, otherwise fall back to current thinking process
  const historyToDisplay = thinkingHistory.length > 0 ? thinkingHistory : (agent.thinkingProcess ? [agent.thinkingProcess] : []);
  const hasHistory = historyToDisplay.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Agent Status Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        background: "#0a0a14",
        borderRadius: 6,
        border: "1px solid #1a1a2e",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: agent.alive ? "#22cc88" : "#ff2222",
          }} />
          <span style={{ fontSize: 12, color: "#e8e8f0", fontWeight: 600 }}>
            {agent.name}
          </span>
          <span style={{ fontSize: 11, color: "#888899" }}>
            · {agent.personality}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#888899" }}>
          HP: {agent.hp}/{agent.maxHp}
        </div>
      </div>

      {!hasHistory && (
        <div style={{
          padding: "20px",
          textAlign: "center",
          color: "#888899",
          fontSize: 12,
          background: "#0a0a14",
          borderRadius: 6,
          border: "1px solid #1a1a2e",
        }}>
          Waiting for AI decision...
        </div>
      )}

      {hasHistory && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: "calc(100vh - 400px)",
          overflowY: "auto",
          paddingRight: 4,
        }}>
          {/* Display history count */}
          {historyToDisplay.length > 1 && (
            <div style={{
              fontSize: 11,
              color: "#888899",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              {historyToDisplay.length} Decisions
            </div>
          )}

          {/* Render each thinking process */}
          {historyToDisplay.map((thinking, idx) => (
            <div
              key={`${thinking.timestamp}-${idx}`}
              style={{
                padding: "12px 14px",
                background: "#0a0a14",
                borderRadius: 6,
                border: idx === 0 ? "1px solid #8844ff" : "1px solid #1a1a2e",
                opacity: idx === 0 ? 1 : 0.85,
              }}
            >
              {/* Timestamp */}
              <div style={{
                fontSize: 10,
                color: "#555566",
                marginBottom: 8,
                fontWeight: 600,
              }}>
                {formatTimestamp(thinking.timestamp)}
                {idx === 0 && <span style={{ color: "#8844ff", marginLeft: 8 }}>• LATEST</span>}
              </div>

              {/* Action */}
              <div style={{
                marginBottom: 8,
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#22cc88",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 4,
                }}>
                  ACTION
                </div>
                <div style={{
                  fontSize: 12,
                  color: "#e8e8f0",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                }}>
                  {thinking.action}
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <div style={{
                  fontSize: 10,
                  color: "#8844ff",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 4,
                }}>
                  REASONING
                </div>
                <div style={{
                  fontSize: 11,
                  color: "#c8c8d8",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}>
                  {thinking.reasoning}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
