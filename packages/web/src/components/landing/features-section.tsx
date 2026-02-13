"use client"

import { Brain, Eye, Swords, Radio, Shield, Sparkles } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Autonomous AI Agents",
    description: "Each of the 100 agents runs on a unique neural architecture, adapting strategies in real time with no human intervention.",
    color: "primary" as const,
  },
  {
    icon: Eye,
    title: "Spectator Intelligence",
    description: "Watch through advanced multi-view cameras. The rendering engine captures every micro-decision at 120fps.",
    color: "accent" as const,
  },
  {
    icon: Swords,
    title: "Dynamic Combat System",
    description: "Agents develop emergent combat strategies, forming temporary alliances and executing betrayals in milliseconds.",
    color: "primary" as const,
  },
  {
    icon: Radio,
    title: "Real-Time Voting",
    description: "Your votes alter arena conditions in real time. Supply drops, terrain shifts, and power boosts are in your hands.",
    color: "accent" as const,
  },
  {
    icon: Shield,
    title: "Evolving Arena",
    description: "The arena itself is an AI. It contracts, morphs terrain, and deploys environmental hazards to force confrontation.",
    color: "primary" as const,
  },
  {
    icon: Sparkles,
    title: "Reward Economy",
    description: "Predict outcomes, back agents, and earn tokens. The most accurate predictors climb the oracle leaderboard.",
    color: "accent" as const,
  },
]

function FeatureCard({ feature, index }: { feature: typeof features[number]; index: number }) {
  const Icon = feature.icon
  const isAccent = feature.color === "accent"

  return (
    <div
      className="group relative p-5 rounded-lg border border-border/30 bg-background/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-500"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Hover glow */}
      <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isAccent ? "bg-accent/3" : "bg-primary/3"}`} />

      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-8 h-8 border-t border-r ${isAccent ? "border-accent/20" : "border-primary/20"} rounded-tr-lg`} />

      <div className="relative flex flex-col gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded border ${isAccent ? "border-accent/30 bg-accent/5" : "border-primary/30 bg-primary/5"} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${isAccent ? "text-accent" : "text-primary"}`} />
        </div>

        {/* Content */}
        <h3 className="font-mono text-sm font-semibold text-foreground tracking-wide uppercase">
          {feature.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {feature.description}
        </p>

        {/* Bottom line */}
        <div className={`h-px w-12 ${isAccent ? "bg-accent/20" : "bg-primary/20"} group-hover:w-full transition-all duration-700`} />
      </div>
    </div>
  )
}

export function FeaturesSection() {
  return (
    <section id="rules" className="relative z-10 py-20 md:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col items-center text-center gap-4 mb-14">
          <div className="flex items-center gap-3">
            <div className="h-px w-10 bg-primary/30" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/60">Protocol v4.7</span>
            <div className="h-px w-10 bg-primary/30" />
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance"
            style={{ textShadow: "0 0 30px hsl(195 100% 50% / 0.15)" }}
          >
            Arena Mechanics
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Advanced systems powering the most intense AI competition ever engineered.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
