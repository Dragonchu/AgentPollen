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
  const { connected, world, agents, items, events, votes, selectedAgent, agentPaths, tileMap, thinkingHistory } = state;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <Header
        world={world}
        connected={connected}
        aliveCount={world?.aliveCount ?? 0}
      />

      {/* Game Over Banner */}
      {world?.phase === GamePhase.Finished && (
        <div className="px-6 py-2.5 bg-gradient-to-r from-accent/10 to-accent/5 border-b border-accent text-center text-sm font-semibold text-accent"
          style={{ textShadow: "0 0 10px hsl(25 100% 50% / 0.5)" }}
        >
          {"\u{1F3C6}"} Game Over! Restarting soon...
        </div>
      )}

      {/* Main body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          agents={agents}
          selectedId={selectedAgent?.id}
          onSelect={inspectAgent}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-5 flex gap-4">
          {/* Left Column: Arena Map + AI Thinking Process */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Arena Map Card */}
            <Card
              title="Arena Map"
              subtitle="Zone Shrinking"
              rightContent={
                <div className="flex gap-2">
                  <MiniButton label="2D View" active />
                  <MiniButton label="3D View" />
                </div>
              }
            >
              <div className="flex justify-center py-2">
                <GameCanvas
                  agents={agents}
                  items={items}
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
                thinkingHistory={selectedAgent ? thinkingHistory.get(selectedAgent.id) ?? [] : []}
              />
            </Card>
          </div>

          {/* Right Column: Vote + Stats + Events */}
          <div className="w-[340px] min-w-[340px] flex flex-col gap-4">
            {/* Vote for Next Action Card */}
            <Card
              title="Vote for Next Action"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent))" strokeWidth="2">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2">
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
    <div className="bg-card rounded-lg border border-border/40 p-4 flex flex-col gap-3">
      {/* Card header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {icon}
          <span
            className="font-mono text-xs uppercase tracking-[0.15em] font-bold text-foreground"
            style={{ textShadow: "0 0 8px hsl(195 100% 50% / 0.3)" }}
          >
            {title}
          </span>
          {subtitle && (
            <>
              <span className="text-muted-foreground/60 text-xs">-</span>
              <span className="text-xs text-primary font-medium">
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
    <button className={`px-2.5 py-1 font-mono text-[11px] font-medium rounded cursor-pointer transition-colors ${
      active
        ? "text-foreground bg-secondary border border-border/40"
        : "text-muted-foreground/60 bg-transparent border border-transparent hover:text-muted-foreground"
    }`}>
      {label}
    </button>
  );
}
