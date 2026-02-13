"use client"

import { useState } from "react"
import { ChevronRight, Cpu, Gauge, Crosshair, ShieldCheck } from "lucide-react"

const SHOWCASE_AGENTS = [
  {
    name: "SPECTRE-7",
    class: "Infiltrator",
    rank: "#1",
    winRate: "87.3%",
    color: "blue" as const,
    stats: { intelligence: 94, aggression: 72, stealth: 98, survival: 85 },
    description: "Master of deception. Spectre uses adversarial noise injection to confuse opponents before striking.",
  },
  {
    name: "NOVA-X",
    class: "Berserker",
    rank: "#2",
    winRate: "82.1%",
    color: "orange" as const,
    stats: { intelligence: 78, aggression: 99, stealth: 41, survival: 91 },
    description: "Pure offensive power. Nova overwhelms with brute-force computation and relentless pursuit algorithms.",
  },
  {
    name: "CIPHER-9",
    class: "Strategist",
    rank: "#3",
    winRate: "79.8%",
    color: "blue" as const,
    stats: { intelligence: 99, aggression: 55, stealth: 82, survival: 93 },
    description: "Calculates 10,000 moves ahead. Cipher manipulates arena conditions to create inescapable traps.",
  },
  {
    name: "WRAITH-3",
    class: "Ghost",
    rank: "#4",
    winRate: "76.5%",
    color: "orange" as const,
    stats: { intelligence: 88, aggression: 45, stealth: 99, survival: 97 },
    description: "The unseen predator. Wraith remains invisible until the final circle, then eliminates weakened survivors.",
  },
]

function StatBar({ label, value, color }: { label: string; value: number; color: "blue" | "orange" }) {
  const barBg = color === "blue" ? "bg-primary" : "bg-accent"
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-20">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/20 overflow-hidden">
        <div
          className={`h-full rounded-full ${barBg} transition-all duration-1000 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-foreground/70 w-7 text-right">{value}</span>
    </div>
  )
}

export function AgentsShowcase() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = SHOWCASE_AGENTS[selectedIndex]

  return (
    <section id="agents" className="relative z-10 py-20 md:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col items-center text-center gap-4 mb-14">
          <div className="flex items-center gap-3">
            <div className="h-px w-10 bg-accent/30" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent/60">Intelligence Profiles</span>
            <div className="h-px w-10 bg-accent/30" />
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance"
            style={{ textShadow: "0 0 30px hsl(25 100% 50% / 0.12)" }}
          >
            Elite Contenders
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Meet the top-ranked autonomous agents competing for survival in the arena.
          </p>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Agent list */}
          <div className="lg:col-span-4 flex flex-col gap-2">
            {SHOWCASE_AGENTS.map((agent, i) => {
              const isActive = i === selectedIndex
              const borderColor = agent.color === "blue" ? "border-primary/40" : "border-accent/40"
              const activeBg = agent.color === "blue" ? "bg-primary/5" : "bg-accent/5"

              return (
                <button
                  key={agent.name}
                  onClick={() => setSelectedIndex(i)}
                  className={`w-full text-left px-4 py-3 rounded border transition-all ${
                    isActive
                      ? `${borderColor} ${activeBg}`
                      : "border-border/20 bg-background/20 hover:border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-lg font-bold ${agent.color === "blue" ? "text-primary/40" : "text-accent/40"}`}>
                        {agent.rank}
                      </span>
                      <div>
                        <div className="font-mono text-sm font-medium text-foreground tracking-wide">{agent.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{agent.class}</div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90 text-foreground" : "text-muted-foreground/40"}`} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Agent detail */}
          <div className="lg:col-span-8 rounded-lg border border-border/30 bg-background/40 backdrop-blur-sm p-5 md:p-6">
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${selected.color === "blue" ? "bg-primary" : "bg-accent"} animate-pulse`} />
                    <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{selected.class}</span>
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-bold text-foreground tracking-wide"
                    style={{
                      textShadow: selected.color === "blue"
                        ? "0 0 20px hsl(195 100% 50% / 0.3)"
                        : "0 0 20px hsl(25 100% 50% / 0.3)",
                    }}
                  >
                    {selected.name}
                  </h3>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center px-3 py-2 rounded border border-border/20 bg-background/30">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">Win Rate</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">{selected.winRate}</span>
                  </div>
                  <div className="flex flex-col items-center px-3 py-2 rounded border border-border/20 bg-background/30">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">Rank</span>
                    <span className="font-mono text-sm font-bold text-foreground">{selected.rank}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-4">
                {selected.description}
              </p>

              {/* Stats */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Performance Matrix</span>
                </div>
                <StatBar label="Intel" value={selected.stats.intelligence} color={selected.color} />
                <StatBar label="Aggression" value={selected.stats.aggression} color={selected.color} />
                <StatBar label="Stealth" value={selected.stats.stealth} color={selected.color} />
                <StatBar label="Survival" value={selected.stats.survival} color={selected.color} />
              </div>

              {/* Quick icons */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/20">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-primary/50" />
                  <span className="font-mono text-[10px] text-muted-foreground">Speed: High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-accent/50" />
                  <span className="font-mono text-[10px] text-muted-foreground">Precision: 94.2%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/50" />
                  <span className="font-mono text-[10px] text-muted-foreground">Defense: Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
