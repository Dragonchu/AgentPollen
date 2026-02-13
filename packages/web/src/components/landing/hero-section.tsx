"use client"

import { CountdownTimer } from "./countdown-timer"
import { LiveVotingDashboard } from "./live-voting-dashboard"

export function HeroSection() {
  return (
    <section id="arena" className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20 md:py-24">
      {/* Top status bar */}
      <div className="absolute top-16 md:top-20 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded border border-border/20 bg-background/20 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            System Online
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded border border-border/20 bg-background/20 backdrop-blur-sm">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Season 1 {"·"} Round 47
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-10 md:gap-12 w-full max-w-6xl">
        {/* Title block */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-accent/50" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent/80">
              AI Battle Royale
            </span>
            <div className="h-px w-6 bg-accent/50" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground text-balance">
            <span
              className="block"
              style={{
                textShadow: "0 0 40px hsl(195 100% 50% / 0.3), 0 0 80px hsl(195 100% 50% / 0.1)",
              }}
            >
              WHISPER
            </span>
          </h1>

          <p className="max-w-lg text-sm sm:text-base text-muted-foreground leading-relaxed font-mono text-pretty">
            100 autonomous AI agents enter the arena. One survives.
            <br className="hidden sm:block" />
            <span className="text-primary/80">Your vote shapes the outcome.</span>
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <a
              href="/arena"
              className="relative overflow-hidden px-6 py-2.5 rounded border border-primary/50 bg-primary/10 font-mono text-xs uppercase tracking-[0.15em] text-primary hover:bg-primary/20 transition-all animate-glow-expand"
            >
              <span className="relative z-10">Watch Live</span>
            </a>
            <a
              href="#rules"
              className="px-6 py-2.5 rounded border border-accent/30 bg-accent/5 font-mono text-xs uppercase tracking-[0.15em] text-accent hover:bg-accent/10 hover:border-accent/50 transition-all"
              style={{ boxShadow: "0 0 12px hsl(25 100% 50% / 0.1)" }}
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Countdown */}
        <CountdownTimer />

        {/* Live voting - shown below on mobile, side-panel feel on desktop */}
        <div className="w-full flex justify-center">
          <LiveVotingDashboard />
        </div>
      </div>

      {/* Bottom decorative elements */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-primary/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
