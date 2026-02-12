"use client";

import type { AgentFullState } from "@battle-royale/shared";

interface AIThinkingProcessProps {
  agent: AgentFullState | null;
}

function StepNumber({ n, completed }: { n: number; completed: boolean }) {
  return (
    <div style={{
      width: 24,
      height: 24,
      borderRadius: "50%",
      background: completed ? "#22cc88" : "#8844ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      color: "#fff",
      flexShrink: 0,
    }}>
      {completed ? "\u2713" : n}
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function AIThinkingProcess({ agent }: AIThinkingProcessProps) {
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

  const thinking = agent.thinkingProcess;
  const hasThinking = !!(thinking?.action && thinking?.reasoning);

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

      {!hasThinking && (
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

      {hasThinking && thinking && (
        <>
          {/* Step 1: AI Decision Output */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}>
              <StepNumber n={1} completed={true} />
              <div style={{
                width: 2,
                flex: 1,
                background: "#1a1a2e",
                borderRadius: 1,
              }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>
                AI Decision Output
              </div>
              <div style={{ fontSize: 12, color: "#888899", marginBottom: 10 }}>
                The action chosen by the AI agent
              </div>
              <div style={{
                background: "#0a0a14",
                borderRadius: 6,
                padding: "12px 14px",
                border: "1px solid #22cc88",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 11,
                    color: "#22cc88",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}>
                    ACTION
                  </span>
                </div>
                <div style={{
                  fontSize: 13,
                  color: "#e8e8f0",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                }}>
                  {thinking.action}
                </div>
                {thinking.timestamp && (
                  <div style={{
                    fontSize: 10,
                    color: "#555566",
                    marginTop: 6,
                  }}>
                    {formatTimestamp(thinking.timestamp)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: AI Reasoning Process */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}>
              <StepNumber n={2} completed={true} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>
                AI Reasoning Process
              </div>
              <div style={{ fontSize: 12, color: "#888899", marginBottom: 10 }}>
                The logic and thought process behind the decision
              </div>
              <div style={{
                background: "#0a0a14",
                borderRadius: 6,
                padding: "12px 14px",
                border: "1px solid #8844ff",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 11,
                    color: "#8844ff",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}>
                    REASONING
                  </span>
                </div>
                <div style={{
                  fontSize: 12,
                  color: "#c8c8d8",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {thinking.reasoning}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
