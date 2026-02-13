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
    twColor: "emerald",
  },
  {
    key: "B",
    label: "Move to Safe Zone",
    desc: "Consolidate approach. Secure position.",
    action: "flee from danger",
    twColor: "primary",
  },
  {
    key: "C",
    label: "Engage Nearest Enemy",
    desc: "High risk, high reward aggressive play",
    action: "attack the nearest enemy",
    twColor: "destructive",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  emerald: {
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    text: "text-emerald-400",
    fill: "bg-emerald-400",
  },
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    fill: "bg-primary",
  },
  destructive: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    fill: "bg-destructive",
  },
};

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
    <div className="flex flex-col gap-3.5">
      {/* Subtitle */}
      <div className="text-xs text-muted-foreground">
        {selectedAgent
          ? `Vote to influence ${selectedAgent.name}'s actions`
          : "Select an agent to vote on their next action"}
      </div>

      {/* Timer */}
      <div className="flex justify-center items-center flex-col gap-1">
        <div
          className={`font-mono text-4xl font-bold tabular-nums leading-none ${
            timeRemaining < 10 ? "text-destructive" : "text-accent"
          }`}
          style={{ textShadow: timeRemaining < 10
            ? "0 0 12px hsl(0 84% 60% / 0.5)"
            : "0 0 12px hsl(25 100% 50% / 0.5)"
          }}
        >
          0:{timeRemaining.toString().padStart(2, "0")}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Time remaining to vote
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-border/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 linear ${
            timeRemaining < 10 ? "bg-destructive" : "bg-accent"
          }`}
          style={{ width: `${(timeRemaining / 30) * 100}%` }}
        />
      </div>

      {/* Vote option cards */}
      <div className="flex flex-col gap-2">
        {VOTE_OPTIONS.map((option) => {
          const colors = COLOR_MAP[option.twColor];
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
              className={`relative flex items-center gap-3 px-3.5 py-3 rounded-lg text-left w-full transition-all overflow-hidden ${
                agentId === null ? "opacity-50 cursor-default" : "cursor-pointer hover:border-border/60"
              } ${
                isVoted
                  ? `${colors.bg} border ${colors.border}`
                  : "bg-background border border-border/40"
              }`}
            >
              {/* Vote percentage background fill */}
              <div
                className={`absolute left-0 top-0 bottom-0 ${colors.bg} pointer-events-none transition-[width] duration-300`}
                style={{ width: `${votePct}%`, opacity: 0.5 }}
              />

              {/* Key badge */}
              <div className={`relative w-7 h-7 rounded-md ${colors.bg} border ${colors.border} flex items-center justify-center font-mono text-[13px] font-bold ${colors.text} shrink-0`}>
                {option.key}
              </div>

              {/* Text */}
              <div className="relative flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground mb-px">
                  {option.label}
                </div>
                <div className="text-[11px] text-muted-foreground/60 truncate">
                  {option.desc}
                </div>
              </div>

              {/* Vote percentage */}
              <div className={`relative font-mono text-sm font-bold tabular-nums shrink-0 ${
                votePct > 0 ? colors.text : "text-muted-foreground/60"
              }`}>
                {votePct > 0 ? `${votePct}%` : "--"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom action */}
      {agentId !== null && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customAction}
            onChange={(e) => setCustomAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomVote()}
            placeholder="Or type a custom command..."
            className="flex-1 px-3 py-2 bg-background text-foreground border border-border/40 rounded-md font-mono text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
          <button
            onClick={handleCustomVote}
            disabled={!customAction.trim()}
            className={`px-3.5 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
              customAction.trim()
                ? "bg-accent/20 border border-accent/40 text-accent cursor-pointer hover:bg-accent/30"
                : "bg-border/20 border border-border/20 text-muted-foreground/40 cursor-default"
            }`}
          >
            Vote
          </button>
        </div>
      )}

      {/* Live vote tallies */}
      {agentId !== null && currentVotes.length > 0 && (
        <div className="p-3 bg-background rounded-md border border-border/40">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-2">
            Live Votes ({totalVotes} total)
          </div>
          {currentVotes.map((v, i) => {
            const pct = totalVotes > 0 ? (v.votes / totalVotes) * 100 : 0;
            return (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className={i === 0 ? "text-accent" : "text-muted-foreground"}>{v.action}</span>
                  <span className="text-muted-foreground/60 tabular-nums font-mono">
                    {v.votes} ({Math.round(pct)}%)
                  </span>
                </div>
                <div className="h-[3px] bg-border/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      i === 0 ? "bg-accent" : "bg-muted-foreground/30"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback */}
      {lastVoted && (
        <div className="text-[11px] text-emerald-400 text-center font-medium">
          Vote submitted successfully
        </div>
      )}
    </div>
  );
}
