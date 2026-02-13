"use client"

import { useState, useEffect } from "react"

interface TimeBlock {
  value: string
  label: string
}

function TimeUnit({ value, label }: TimeBlock) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        {/* Outer glow */}
        <div className="absolute -inset-1 rounded-lg bg-primary/20 blur-md animate-pulse-neon" />

        {/* Main display */}
        <div className="relative flex items-center justify-center w-16 h-20 sm:w-20 sm:h-24 md:w-28 md:h-32 rounded-lg border border-primary/30 bg-background/80 backdrop-blur-sm overflow-hidden">
          {/* Inner scan line */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsla(195, 100%, 50%, 0.05) 2px, hsla(195, 100%, 50%, 0.05) 4px)",
            }}
          />

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/60" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/60" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary/60" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary/60" />

          <span
            className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-primary tracking-wider"
            style={{
              textShadow: "0 0 10px hsl(195 100% 50% / 0.8), 0 0 30px hsl(195 100% 50% / 0.4), 0 0 60px hsl(195 100% 50% / 0.2)",
            }}
          >
            {value}
          </span>
        </div>
      </div>
      <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    </div>
  )
}

function Separator() {
  return (
    <div className="flex flex-col gap-3 pb-6">
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-neon" />
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-neon" style={{ animationDelay: "0.5s" }} />
    </div>
  )
}

export function CountdownTimer() {
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 7)
    targetDate.setHours(0, 0, 0, 0)

    const updateTimer = () => {
      const now = new Date().getTime()
      const distance = targetDate.getTime() - now

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [mounted])

  const pad = (n: number) => n.toString().padStart(2, "0")

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Title */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px w-8 sm:w-12 bg-primary/40" />
        <span
          className="font-mono text-xs sm:text-sm uppercase tracking-[0.3em] text-primary/80"
          style={{
            textShadow: "0 0 8px hsl(195 100% 50% / 0.5)",
          }}
        >
          Arena Opens In
        </span>
        <div className="h-px w-8 sm:w-12 bg-primary/40" />
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        <TimeUnit value={pad(timeLeft.days)} label="Days" />
        <Separator />
        <TimeUnit value={pad(timeLeft.hours)} label="Hours" />
        <Separator />
        <TimeUnit value={pad(timeLeft.minutes)} label="Mins" />
        <Separator />
        <TimeUnit value={pad(timeLeft.seconds)} label="Secs" />
      </div>

      {/* Bottom decoration */}
      <div className="flex items-center gap-2 mt-2">
        <div className="w-2 h-2 rotate-45 border border-accent/40" />
        <div className="h-px w-20 sm:w-32 bg-accent/20" />
        <div
          className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-neon"
          style={{
            animationDuration: "1.5s",
            boxShadow: "0 0 6px hsl(25 100% 50% / 0.6)",
          }}
        />
        <div className="h-px w-20 sm:w-32 bg-accent/20" />
        <div className="w-2 h-2 rotate-45 border border-accent/40" />
      </div>
    </div>
  )
}
