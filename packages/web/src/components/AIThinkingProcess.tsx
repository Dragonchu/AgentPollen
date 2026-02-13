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
      <div className="py-10 px-5 text-center text-muted-foreground/60 text-[13px]">
        Select an agent to view their thinking process
      </div>
    );
  }

  const historyToDisplay = thinkingHistory.length > 0 ? thinkingHistory : (agent.thinkingProcess ? [agent.thinkingProcess] : []);
  const hasHistory = historyToDisplay.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Agent Status Bar */}
      <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-border/40">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse-neon ${
              agent.alive ? "bg-emerald-400 shadow-[0_0_6px_hsl(155_70%_50%)]" : "bg-destructive shadow-[0_0_6px_hsl(0_84%_60%)]"
            }`}
          />
          <span className="text-xs text-foreground font-semibold">
            {agent.name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {agent.personality}
          </span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
          HP: {agent.hp}/{agent.maxHp}
        </div>
      </div>

      {!hasHistory && (
        <div className="p-5 text-center text-muted-foreground text-xs bg-background rounded-lg border border-border/40">
          Waiting for AI decision...
        </div>
      )}

      {hasHistory && (
        <div className="flex flex-col gap-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
          {/* Display history count */}
          {historyToDisplay.length > 1 && (
            <div className="font-mono text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              {historyToDisplay.length} Decisions
            </div>
          )}

          {/* Render each thinking process */}
          {historyToDisplay.map((thinking, idx) => (
            <div
              key={`${thinking.timestamp}-${idx}`}
              className={`p-3.5 bg-background rounded-lg border ${
                idx === 0 ? "border-primary" : "border-border/40 opacity-85"
              }`}
            >
              {/* Timestamp */}
              <div className="font-mono text-[10px] text-muted-foreground/60 mb-2 font-semibold">
                {formatTimestamp(thinking.timestamp)}
                {idx === 0 && <span className="text-primary ml-2">· LATEST</span>}
              </div>

              {/* Action */}
              <div className="mb-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent font-bold mb-1 [text-shadow:0_0_8px_hsl(25_100%_50%_/_0.3)]">
                  ACTION
                </div>
                <div className="font-mono text-sm font-semibold text-foreground">
                  {thinking.action}
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary font-bold mb-1 [text-shadow:0_0_8px_hsl(195_100%_50%_/_0.3)]">
                  REASONING
                </div>
                <div className="text-[11px] text-foreground/70 leading-relaxed whitespace-pre-wrap">
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
