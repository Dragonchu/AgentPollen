"use client";

import { useGameSocket } from "@/lib/useGameSocket";
import { GameCanvas } from "@/game/GameCanvas";
import { VotePanel } from "@/components/VotePanel";
import { EventFeed } from "@/components/EventFeed";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { AIThinkingProcess } from "@/components/AIThinkingProcess";
import { AgentStats } from "@/components/AgentStats";
import { GamePhase } from "@battle-royale/shared";

export default function Home() {
  const { state, submitVote, inspectAgent } = useGameSocket();
  const { connected, world, agents, events, votes, selectedAgent, agentPaths, tileMap } = state;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0a0a14",
      color: "#e8e8f0",
      overflow: "hidden",
    }}>
      {/* Header */}
      <Header
        world={world}
        connected={connected}
        aliveCount={world?.aliveCount ?? 0}
      />

      {/* Game Over Banner */}
      {world?.phase === GamePhase.Finished && (
        <div style={{
          padding: "10px 24px",
          background: "linear-gradient(90deg, rgba(255,204,0,0.08), rgba(255,170,34,0.04))",
          borderBottom: "1px solid #ffaa22",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
        }}>
          {"\u{1F3C6}"} Game Over! Restarting soon...
        </div>
      )}

      {/* Main body: Sidebar + Content */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}>
        {/* Sidebar */}
        <Sidebar
          agents={agents}
          selectedId={selectedAgent?.id}
          onSelect={inspectAgent}
        />

        {/* Main Content Area */}
        <main style={{
          flex: 1,
          overflow: "auto",
          padding: 20,
          display: "flex",
          gap: 16,
        }}>
          {/* Left Column: Arena Map + AI Thinking Process */}
          <div style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Arena Map Card */}
            <Card
              title="Arena Map"
              subtitle="Zone Shrinking"
              rightContent={
                <div style={{ display: "flex", gap: 8 }}>
                  <MiniButton label="2D View" active />
                  <MiniButton label="3D View" />
                </div>
              }
            >
              <div style={{
                display: "flex",
                justifyContent: "center",
                padding: "8px 0",
              }}>
                <GameCanvas
                  agents={agents}
                  items={[]}
                  selectedAgentId={selectedAgent?.id}
                  shrinkBorder={world?.shrinkBorder}
                  onAgentClick={inspectAgent}
                  agentPaths={agentPaths}
                  tileMap={tileMap}
                  zoneCenterX={world?.zoneCenterX}
                  zoneCenterY={world?.zoneCenterY}
                />
              </div>
            </Card>

            {/* AI Thinking Process Card */}
            <Card
              title={`AI Thinking Process${selectedAgent ? ` - ${selectedAgent.name}` : ""}`}
            >
              <AIThinkingProcess
                agent={selectedAgent}
              />
            </Card>
          </div>

          {/* Right Column: Vote + Stats + Events */}
          <div style={{
            width: 340,
            minWidth: 340,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Vote for Next Action Card */}
            <Card
              title="Vote for Next Action"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff8800" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              }
            >
              <VotePanel
                agents={agents}
                voteState={votes}
                onVote={submitVote}
                selectedAgentId={selectedAgent?.id}
              />
            </Card>

            {/* Agent Stats Card */}
            <Card
              title={selectedAgent ? `${selectedAgent.name} Stats` : "Agent Stats"}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22cc88" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              }
            >
              <AgentStats agent={selectedAgent} />
            </Card>

            {/* Live Event Feed Card */}
            <Card
              title="Live Event Feed"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8844ff" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
            >
              <EventFeed events={events} />
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---- Shared Card component ---- */

function Card({
  title,
  subtitle,
  icon,
  rightContent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#12121e",
      borderRadius: 10,
      border: "1px solid #1a1a2e",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Card header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0" }}>
            {title}
          </span>
          {subtitle && (
            <>
              <span style={{ color: "#555566", fontSize: 12 }}>-</span>
              <span style={{ fontSize: 12, color: "#8844ff", fontWeight: 500 }}>
                {subtitle}
              </span>
            </>
          )}
        </div>
        {rightContent}
      </div>

      {/* Card content */}
      {children}
    </div>
  );
}

function MiniButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button style={{
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 500,
      color: active ? "#e8e8f0" : "#555566",
      background: active ? "#1a1a2e" : "transparent",
      border: `1px solid ${active ? "#1a1a2e" : "transparent"}`,
      borderRadius: 4,
      cursor: "pointer",
    }}>
      {label}
    </button>
  );
}
