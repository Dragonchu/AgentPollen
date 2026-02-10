"use client";

import { useGameSocket } from "@/lib/useGameSocket";
import { GameCanvas } from "@/game/GameCanvas";
import { VotePanel } from "@/components/VotePanel";
import { AgentDetail } from "@/components/AgentDetail";
import { EventFeed } from "@/components/EventFeed";
import { Leaderboard } from "@/components/Leaderboard";
import { GamePhase } from "@battle-royale/shared";

export default function Home() {
  const { state, submitVote, inspectAgent, clearSelection } = useGameSocket();
  const { connected, world, agents, events, votes, selectedAgent } = state;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      maxWidth: 1200,
      margin: "0 auto",
      padding: "16px 20px",
    }}>
      {/* Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        padding: "8px 0",
        borderBottom: "1px solid #1a1a2a",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: "#ffaa22" }}>AI</span> Battle Royale
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#555" }}>
            Influence the agents. Shape the outcome.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {world && (
            <>
              <Stat label="TICK" value={world.tick} />
              <Stat label="ALIVE" value={world.aliveCount} color="#44ff66" />
              <Stat label="ZONE" value={world.shrinkBorder} color="#aa44ff" />
            </>
          )}
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "#44ff66" : "#ff4444",
            boxShadow: connected ? "0 0 8px #44ff66" : "0 0 8px #ff4444",
          }} />
        </div>
      </header>

      {/* Game Over Banner */}
      {world?.phase === GamePhase.Finished && (
        <div style={{
          padding: "12px 20px",
          background: "linear-gradient(90deg, rgba(255,204,0,0.08), rgba(255,170,34,0.04))",
          borderRadius: 6,
          border: "1px solid #ffaa22",
          textAlign: "center",
          marginBottom: 16,
          fontSize: 14,
        }}>
          🏆 <strong>Game Over!</strong> Restarting soon...
        </div>
      )}

      {/* Main Layout: 3 columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr 280px",
        gap: 16,
        flex: 1,
      }}>
        {/* Left: Leaderboard */}
        <div style={{
          background: "#0c0c14",
          borderRadius: 6,
          border: "1px solid #1a1a2a",
          padding: 12,
          overflowY: "auto",
          maxHeight: "calc(100vh - 120px)",
        }}>
          <SectionTitle>Agents</SectionTitle>
          <Leaderboard
            agents={agents}
            selectedId={selectedAgent?.id}
            onSelect={inspectAgent}
          />
        </div>

        {/* Center: Game Canvas + Events */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "#0c0c14",
            borderRadius: 6,
            border: "1px solid #1a1a2a",
            padding: 12,
            display: "flex",
            justifyContent: "center",
          }}>
            <GameCanvas
              agents={agents}
              items={[]}
              selectedAgentId={selectedAgent?.id}
              shrinkBorder={world?.shrinkBorder}
              onAgentClick={inspectAgent}
            />
          </div>

          <div style={{
            background: "#0c0c14",
            borderRadius: 6,
            border: "1px solid #1a1a2a",
            padding: 12,
            flex: 1,
          }}>
            <SectionTitle>Events</SectionTitle>
            <EventFeed events={events} />
          </div>
        </div>

        {/* Right: Agent Detail + Voting */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
        }}>
          {/* Agent Detail */}
          <div style={{
            background: "#0c0c14",
            borderRadius: 6,
            border: "1px solid #1a1a2a",
            padding: 12,
          }}>
            <SectionTitle>Agent Intel</SectionTitle>
            {selectedAgent ? (
              <AgentDetail agent={selectedAgent} onClose={clearSelection} />
            ) : (
              <p style={{ fontSize: 12, color: "#444", fontStyle: "italic", margin: 0 }}>
                Click an agent on the map or leaderboard to inspect
              </p>
            )}
          </div>

          {/* Voting */}
          <div style={{
            background: "#0c0c14",
            borderRadius: 6,
            border: "1px solid #1a1a2a",
            padding: 12,
          }}>
            <SectionTitle>🗳 Vote</SectionTitle>
            <VotePanel
              agents={agents}
              voteState={votes}
              onVote={submitVote}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: "#555",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function Stat({ label, value, color = "#888" }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}
