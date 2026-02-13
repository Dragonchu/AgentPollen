"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Zap, TrendingUp, Users, Activity } from "lucide-react"

interface AgentVote {
  id: string
  name: string
  votes: number
  color: "blue" | "orange"
  trend: number
}

interface DataStream {
  id: number
  x: number
  y: number
  progress: number
}

interface VoteRipple {
  id: number
  x: number
  y: number
  progress: number
}

const AGENT_NAMES = [
  "SPECTRE-7", "NOVA-X", "CIPHER-9", "WRAITH-3",
  "ECHO-12", "PHANTOM-1", "VIPER-6", "GHOST-8",
]

const INITIAL_VOTES = [4200, 3800, 3500, 2900, 2600, 2100, 1800, 1400]
const INITIAL_TRENDS = [8.2, 5.1, 3.7, -1.2, 6.4, -3.1, 2.8, -0.5]

function generateInitialAgents(): AgentVote[] {
  return AGENT_NAMES.map((name, i) => ({
    id: `agent-${i}`,
    name,
    votes: INITIAL_VOTES[i],
    color: i % 3 === 0 ? "orange" : "blue",
    trend: INITIAL_TRENDS[i],
  }))
}

function VoteBar({ agent, maxVotes, onVote }: { agent: AgentVote; maxVotes: number; onVote: (id: string) => void }) {
  const percentage = (agent.votes / maxVotes) * 100
  const barColor = agent.color === "blue"
    ? "from-primary/80 to-primary"
    : "from-accent/80 to-accent"
  const glowColor = agent.color === "blue"
    ? "shadow-[0_0_12px_hsl(195,100%,50%,0.3)]"
    : "shadow-[0_0_12px_hsl(25,100%,50%,0.3)]"

  return (
    <button
      onClick={() => onVote(agent.id)}
      className={`group w-full text-left px-3 py-2.5 rounded border border-border/50 bg-background/40 backdrop-blur-sm hover:border-primary/40 transition-all cursor-pointer ${glowColor}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${agent.color === "blue" ? "bg-primary" : "bg-accent"} animate-pulse-neon`} />
          <span className="font-mono text-xs text-foreground tracking-wide">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${agent.trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {agent.trend > 0 ? "+" : ""}{agent.trend.toFixed(1)}%
          </span>
          <span className="font-mono text-xs text-muted-foreground">{agent.votes.toLocaleString()}</span>
        </div>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
        {/* Shimmer */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </button>
  )
}

function StatBox({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded border border-border/30 bg-background/30 backdrop-blur-sm">
      <Icon className="w-3.5 h-3.5 text-primary/60" />
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  )
}

export function LiveVotingDashboard() {
  const [mounted, setMounted] = useState(false)
  const [agents, setAgents] = useState<AgentVote[]>(generateInitialAgents)
  const [totalVotes, setTotalVotes] = useState(() => INITIAL_VOTES.reduce((a, b) => a + b, 0))
  const [viewerCount, setViewerCount] = useState(42850)
  const [dataStreams, setDataStreams] = useState<DataStream[]>([])
  const [ripples, setRipples] = useState<VoteRipple[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const streamIdRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Simulated live updates — only after mount
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((agent) => ({
          ...agent,
          votes: agent.votes + Math.floor(Math.random() * 15),
          trend: agent.trend + (Math.random() - 0.48) * 0.5,
        }))
      )
      setTotalVotes((prev) => prev + Math.floor(Math.random() * 80) + 10)
      setViewerCount((prev) => prev + Math.floor(Math.random() * 20) - 8)
    }, 2000)

    return () => clearInterval(interval)
  }, [mounted])

  // Animate streams and ripples using progress-based approach (no Date.now in render)
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setDataStreams((prev) =>
        prev
          .map((s) => ({ ...s, progress: s.progress + 0.1 }))
          .filter((s) => s.progress < 1)
      )
      setRipples((prev) =>
        prev
          .map((r) => ({ ...r, progress: r.progress + 0.25 }))
          .filter((r) => r.progress < 1)
      )
    }, 100)
    return () => clearInterval(interval)
  }, [mounted])

  const handleVote = useCallback((agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, votes: a.votes + Math.floor(Math.random() * 50) + 10, trend: a.trend + 0.5 }
          : a
      )
    )
    setTotalVotes((prev) => prev + Math.floor(Math.random() * 50) + 10)

    // Generate data streams on click
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      const newStreams: DataStream[] = []
      for (let i = 0; i < 5; i++) {
        newStreams.push({
          id: streamIdRef.current++,
          x: Math.random() * rect.width,
          y: rect.height,
          progress: i * 0.05,
        })
      }
      setDataStreams((prev) => [...prev, ...newStreams])

      // Add ripple
      setRipples((prev) => [
        ...prev,
        {
          id: streamIdRef.current++,
          x: Math.random() * rect.width,
          y: Math.random() * rect.height * 0.5,
          progress: 0,
        },
      ])
    }
  }, [])

  const sortedAgents = [...agents].sort((a, b) => b.votes - a.votes)
  const maxVotes = Math.max(...agents.map((a) => a.votes), 1)

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-sm md:max-w-md rounded-lg border border-border/40 bg-background/60 backdrop-blur-md overflow-hidden"
    >
      {/* Data streams */}
      {dataStreams.map((stream) => {
        const streamColor = stream.id % 2 === 0 ? "hsl(195, 100%, 50%)" : "hsl(25, 100%, 50%)"
        return (
          <div
            key={stream.id}
            className="absolute w-px pointer-events-none"
            style={{
              left: stream.x,
              bottom: 0,
              height: "100%",
              background: `linear-gradient(to top, transparent, ${streamColor}, transparent)`,
              opacity: Math.max(0, 0.4 * (1 - stream.progress)),
              transform: `translateY(${-stream.progress * 200}px)`,
            }}
          />
        )
      })}

      {/* Vote ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full border border-primary/40 pointer-events-none"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
            transform: `scale(${0.8 + ripple.progress * 1.5})`,
            opacity: 1 - ripple.progress,
          }}
        />
      ))}

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <span className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-foreground">Live Voting</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{viewerCount.toLocaleString()} watching</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-border/20">
        <StatBox icon={Zap} label="Votes" value={totalVotes.toLocaleString()} />
        <StatBox icon={Users} label="Agents" value="100" />
        <StatBox icon={Activity} label="Active" value={`${agents.filter((a) => a.trend > 0).length * 12 + 4}`} />
      </div>

      {/* Agent votes */}
      <div className="p-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Top Contenders</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="font-mono text-[10px] text-emerald-400">Trending</span>
          </div>
        </div>
        {sortedAgents.map((agent) => (
          <VoteBar key={agent.id} agent={agent} maxVotes={maxVotes} onVote={handleVote} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/20 flex items-center justify-center">
        <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">
          Click to vote {"·"} Influence AI behavior
        </span>
      </div>
    </div>
  )
}
