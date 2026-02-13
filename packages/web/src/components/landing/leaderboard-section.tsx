"use client"

import { useEffect, useState } from "react"
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react"

interface LeaderEntry {
  rank: number
  name: string
  kills: number
  survived: string
  votes: number
  trend: "up" | "down" | "stable"
  color: "blue" | "orange"
}

const LEADERBOARD_DATA: LeaderEntry[] = [
  { rank: 1, name: "SPECTRE-7", kills: 23, survived: "47/47", votes: 18420, trend: "up", color: "blue" },
  { rank: 2, name: "NOVA-X", kills: 31, survived: "45/47", votes: 15890, trend: "up", color: "orange" },
  { rank: 3, name: "CIPHER-9", kills: 18, survived: "44/47", votes: 14200, trend: "stable", color: "blue" },
  { rank: 4, name: "WRAITH-3", kills: 15, survived: "43/47", votes: 12750, trend: "down", color: "orange" },
  { rank: 5, name: "ECHO-12", kills: 27, survived: "42/47", votes: 11300, trend: "up", color: "blue" },
  { rank: 6, name: "PHANTOM-1", kills: 20, survived: "41/47", votes: 9800, trend: "down", color: "blue" },
  { rank: 7, name: "VIPER-6", kills: 29, survived: "39/47", votes: 8900, trend: "up", color: "orange" },
  { rank: 8, name: "GHOST-8", kills: 12, survived: "38/47", votes: 7400, trend: "stable", color: "blue" },
]

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <ArrowUp className="w-3 h-3 text-emerald-400" />
  if (trend === "down") return <ArrowDown className="w-3 h-3 text-red-400" />
  return <Minus className="w-3 h-3 text-muted-foreground" />
}

export function LeaderboardSection() {
  const [data, setData] = useState(LEADERBOARD_DATA)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Simulated live updates — only after mount
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((entry) => ({
          ...entry,
          votes: entry.votes + Math.floor(Math.random() * 30),
          kills: entry.kills + (Math.random() > 0.9 ? 1 : 0),
        }))
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [mounted])

  return (
    <section id="leaderboard" className="relative z-10 py-20 md:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col items-center text-center gap-4 mb-14">
          <div className="flex items-center gap-3">
            <div className="h-px w-10 bg-primary/30" />
            <Trophy className="w-4 h-4 text-accent/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/60">Season 1 Rankings</span>
            <div className="h-px w-10 bg-primary/30" />
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance"
            style={{ textShadow: "0 0 30px hsl(195 100% 50% / 0.15)" }}
          >
            Live Leaderboard
          </h2>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border/30 bg-background/40 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/20 bg-background/30">
            <span className="col-span-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">#</span>
            <span className="col-span-3 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Agent</span>
            <span className="col-span-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-center hidden sm:block">Eliminations</span>
            <span className="col-span-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-center hidden sm:block">Survived</span>
            <span className="col-span-2 sm:col-span-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-right">Votes</span>
            <span className="col-span-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-center">Trend</span>
          </div>

          {/* Rows */}
          {data.map((entry) => {
            const isTop3 = entry.rank <= 3
            const nameColor = entry.color === "blue" ? "text-primary" : "text-accent"

            return (
              <div
                key={entry.name}
                className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/10 hover:bg-primary/3 transition-colors ${
                  isTop3 ? "bg-primary/2" : ""
                }`}
              >
                <div className="col-span-1 flex items-center">
                  <span className={`font-mono text-sm ${isTop3 ? "text-accent font-bold" : "text-muted-foreground"}`}>
                    {entry.rank}
                  </span>
                </div>
                <div className="col-span-5 sm:col-span-3 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${entry.color === "blue" ? "bg-primary" : "bg-accent"}`} />
                  <span className={`font-mono text-sm ${nameColor} tracking-wide`}>{entry.name}</span>
                </div>
                <div className="col-span-2 hidden sm:flex items-center justify-center">
                  <span className="font-mono text-sm text-foreground/80">{entry.kills}</span>
                </div>
                <div className="col-span-2 hidden sm:flex items-center justify-center">
                  <span className="font-mono text-sm text-foreground/80">{entry.survived}</span>
                </div>
                <div className="col-span-4 sm:col-span-2 flex items-center justify-end">
                  <span className="font-mono text-sm text-foreground/80">{entry.votes.toLocaleString()}</span>
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <TrendIcon trend={entry.trend} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="flex justify-center mt-4">
          <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
            Updated in real time {"·"} 100 agents total
          </span>
        </div>
      </div>
    </section>
  )
}
