"use client";

import type { AgentFullState } from "@battle-royale/shared";

interface AgentStatsProps {
  agent: AgentFullState | null;
}

function StatBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = Math.min(100, (value / maxValue) * 100);
  return (
    <div className="mb-3" style={{ ["--stat-color" as string]: color, ["--stat-pct" as string]: `${pct}%` }}>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</span>
        <span className="font-mono text-[13px] font-bold tabular-nums [color:var(--stat-color)]">
          {value}/{maxValue}
        </span>
      </div>
      <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-300 w-[var(--stat-pct)] [background:var(--stat-color)]" />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-background rounded-lg border border-border/40 p-3 text-center" style={{ ["--statbox-color" as string]: color }}>
      <div className="font-mono text-lg font-bold tabular-nums mb-0.5 [color:var(--statbox-color)]">
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}

export function AgentStats({ agent }: AgentStatsProps) {
  if (!agent) {
    return (
      <div className="py-8 px-5 text-center text-muted-foreground/60 text-[13px]">
        Select an agent to view stats
      </div>
    );
  }

  const hue = (agent.id * 137) % 360;
  const shield = Math.round(agent.defense * 5);
  const maxShield = 100;

  return (
    <div className="flex flex-col gap-3">
      {/* Agent name header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <div
          className="w-3 h-3 rounded-full bg-[hsl(var(--agent-hue)_70%_60%)] shadow-[0_0_6px_hsl(var(--agent-hue)_70%_60%)]"
          style={{ ["--agent-hue" as string]: hue }}
        />
        <span className="text-sm font-bold text-foreground">
          {agent.name} Stats
        </span>
        <span className="text-[11px] text-muted-foreground/60 italic ml-auto">
          {agent.personality}
        </span>
      </div>

      {/* Health & Shield bars */}
      <StatBar
        label="Health"
        value={agent.hp}
        maxValue={agent.maxHp || 100}
        color={agent.hp > 60 ? "hsl(155 70% 50%)" : agent.hp > 30 ? "hsl(25 100% 50%)" : "hsl(0 84% 60%)"}
      />
      <StatBar
        label="Shield"
        value={shield}
        maxValue={maxShield}
        color="hsl(195 100% 50%)"
      />

      {/* Stat boxes grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="K/D Ratio" value={`${agent.killCount}/${agent.alive ? 0 : 1}`} color="hsl(0 84% 60%)" />
        <StatBox label="Attack" value={agent.attack} color="hsl(25 100% 50%)" />
        <StatBox label="Survival" value={`${Math.min(100, Math.round((agent.hp / (agent.maxHp || 100)) * 100))}%`} color="hsl(155 70% 50%)" />
        <StatBox label="Defense" value={agent.defense} color="hsl(195 100% 50%)" />
      </div>

      {/* Current Action */}
      <div className="p-3 bg-background rounded-lg border-l-2 border-primary">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 mb-1">
          Current Action
        </div>
        <div className="text-xs text-foreground/80">
          {agent.currentAction || "Idle"}
        </div>
      </div>

      {/* Alliances & Enemies */}
      {(agent.alliances.length > 0 || agent.enemies.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {agent.alliances.length > 0 && (
            <div className="text-[11px] px-2 py-1 bg-primary/10 rounded border border-primary/20">
              <span className="text-primary">Allies: </span>
              <span className="text-muted-foreground">
                {agent.alliances.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
          {agent.enemies.length > 0 && (
            <div className="text-[11px] px-2 py-1 bg-destructive/10 rounded border border-destructive/20">
              <span className="text-destructive">Enemies: </span>
              <span className="text-muted-foreground">
                {agent.enemies.map(id => `#${id}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
