"use client";

import type { AgentFullState } from "@battle-royale/shared";

interface AIThinkingProcessProps {
  agent: AgentFullState | null;
  agents: Map<number, AgentFullState>;
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

function getThinkingData(agent: AgentFullState, agents: Map<number, AgentFullState>) {
  const nearbyNames = Array.from(agents.values())
    .filter(a => a.alive && a.id !== agent.id)
    .slice(0, 3)
    .map(a => a.name);

  const strategies = [
    {
      label: "Rush to Loot Box",
      desc: "Grab nearby supplies before engaging",
      probability: 45,
      color: "#22cc88",
    },
    {
      label: "Move to Safe Zone",
      desc: "Consolidate approach. Secure position first.",
      probability: 35,
      color: "#4488ff",
    },
    {
      label: `Engage ${nearbyNames[0] ?? "Nearest Enemy"}`,
      desc: "High risk, high reward aggressive play",
      probability: 20,
      color: "#ff6644",
    },
  ];

  return {
    context: {
      health: `Health: ${agent.hp}/${agent.maxHp}`,
      status: `Status: ${agent.alive ? "Active" : "Eliminated"}`,
      nearby: `Nearby: ${nearbyNames.join(", ") || "None detected"}`,
      position: `Position: (${agent.x}, ${agent.y})`,
      threat: `Threat Level: ${agent.hp < 50 ? "HIGH" : agent.hp < 80 ? "Medium" : "Low"}`,
      resources: `Resources: ${agent.weapon}`,
      zone: "Zone: Closing",
    },
    strategies,
  };
}

export function AIThinkingProcess({ agent, agents }: AIThinkingProcessProps) {
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

  const data = getThinkingData(agent, agents);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Agent indicator chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Array.from(agents.values()).filter(a => a.alive).slice(0, 5).map((a) => {
          const hue = (a.id * 137) % 360;
          const isActive = a.id === agent.id;
          return (
            <div key={a.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 12,
              background: isActive ? `hsla(${hue}, 70%, 60%, 0.15)` : "#1a1a2e",
              border: `1px solid ${isActive ? `hsl(${hue}, 70%, 60%)` : "#1a1a2e"}`,
              fontSize: 11,
              color: isActive ? `hsl(${hue}, 70%, 75%)` : "#888899",
              fontWeight: isActive ? 600 : 400,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: `hsl(${hue}, 70%, 60%)`,
              }} />
              {a.name}
            </div>
          );
        })}
      </div>

      {/* Step 1: Analyzing Current Situation */}
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
            Analyzing Current Situation
          </div>
          <div style={{ fontSize: 12, color: "#888899", marginBottom: 10 }}>
            Evaluating health, resource availability, and zone position...
          </div>
          <div style={{
            background: "#0a0a14",
            borderRadius: 6,
            padding: "10px 12px",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}>
            {Object.entries(data.context).map(([key, value]) => (
              <div key={key} style={{
                fontSize: 11,
                color: key === "threat" && agent.hp < 50 ? "#ff6644" : "#888899",
                fontFamily: "'JetBrains Mono', monospace",
                padding: "2px 8px",
                background: "#12121e",
                borderRadius: 3,
                border: "1px solid #1a1a2e",
              }}>
                {value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: Strategy Options */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}>
          <StepNumber n={2} completed={true} />
          <div style={{
            width: 2,
            flex: 1,
            background: "#1a1a2e",
            borderRadius: 1,
          }} />
        </div>
        <div style={{ flex: 1, paddingBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>
            Strategy Options Generated
          </div>
          <div style={{ fontSize: 12, color: "#888899", marginBottom: 10 }}>
            AI has calculated 3 possible strategies with success probabilities
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.strategies.map((strategy, i) => (
              <div key={i} style={{
                background: "#0a0a14",
                borderRadius: 6,
                padding: "10px 14px",
                border: `1px solid ${i === 0 ? strategy.color + "33" : "#1a1a2e"}`,
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: strategy.color,
                    }}>
                      Option {String.fromCharCode(65 + i)}: {strategy.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: strategy.color,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {strategy.probability}% Success
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#888899", marginBottom: 8 }}>
                  {strategy.desc}
                </div>
                <div style={{
                  height: 4,
                  background: "#1a1a2e",
                  borderRadius: 2,
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${strategy.probability}%`,
                    background: strategy.color,
                    borderRadius: 2,
                    opacity: 0.7,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3: Waiting for Community Vote */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <StepNumber n={3} completed={false} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>
            Waiting for Community Vote
          </div>
          <div style={{ fontSize: 12, color: "#888899" }}>
            The community will decide the next move in 15 seconds...
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff8800",
              animation: "pulse 1.5s infinite",
            }} />
            <span style={{ fontSize: 11, color: "#ff8800", fontWeight: 500 }}>
              Awaiting votes...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
