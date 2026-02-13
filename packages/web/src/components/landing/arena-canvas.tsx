"use client"

import { useEffect, useRef, useCallback } from "react"

interface Agent {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  glowIntensity: number
  glowDirection: number
  hue: number
  alive: boolean
  pulseSpeed: number
  targetX: number
  targetY: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export function ArenaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const agentsRef = useRef<Agent[]>([])
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const initAgents = useCallback((width: number, height: number) => {
    const agents: Agent[] = []
    const centerX = width / 2
    const centerY = height / 2

    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const radius = 120 + Math.random() * Math.min(width, height) * 0.32
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      agents.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 2 + Math.random() * 3,
        glowIntensity: 0.3 + Math.random() * 0.7,
        glowDirection: Math.random() > 0.5 ? 1 : -1,
        hue: Math.random() > 0.65 ? 25 : 195,
        alive: true,
        pulseSpeed: 0.005 + Math.random() * 0.02,
        targetX: x,
        targetY: y,
      })
    }
    agentsRef.current = agents
  }, [])

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 2
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 30 + Math.random() * 40,
        color,
        size: 1 + Math.random() * 2,
      })
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
      initAgents(window.innerWidth, window.innerHeight)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove)

    let animId: number

    const drawGridFloor = (w: number, h: number, time: number) => {
      ctx.save()
      ctx.strokeStyle = `hsla(195, 100%, 50%, ${0.04 + Math.sin(time * 0.001) * 0.01})`
      ctx.lineWidth = 0.5

      const gridSize = 60
      const offsetY = (time * 0.02) % gridSize

      for (let y = -gridSize + offsetY; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      ctx.restore()
    }

    const drawAgent = (agent: Agent, time: number) => {
      if (!agent.alive) return

      const pulse = Math.sin(time * agent.pulseSpeed) * 0.5 + 0.5
      const intensity = agent.glowIntensity * (0.5 + pulse * 0.5)
      const color = agent.hue === 195 ? `hsl(195, 100%, 50%)` : `hsl(25, 100%, 50%)`
      const colorAlpha = agent.hue === 195
        ? `hsla(195, 100%, 50%, ${intensity * 0.6})`
        : `hsla(25, 100%, 50%, ${intensity * 0.6})`

      // Outer glow
      const glowRadius = agent.size * (4 + pulse * 3)
      const gradient = ctx.createRadialGradient(
        agent.x, agent.y, 0,
        agent.x, agent.y, glowRadius
      )
      const midAlpha = agent.hue === 195
        ? `hsla(195, 100%, 50%, ${intensity * 0.3})`
        : `hsla(25, 100%, 50%, ${intensity * 0.3})`

      gradient.addColorStop(0, colorAlpha)
      gradient.addColorStop(0.4, midAlpha)
      gradient.addColorStop(1, "rgba(0,0,0,0)")

      ctx.beginPath()
      ctx.arc(agent.x, agent.y, glowRadius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Silhouette body
      ctx.save()
      ctx.translate(agent.x, agent.y)

      // Head
      ctx.beginPath()
      ctx.arc(0, -agent.size * 2.5, agent.size * 1.2, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${agent.hue}, 80%, 40%, ${intensity * 0.9})`
      ctx.fill()

      // Body
      ctx.beginPath()
      ctx.moveTo(-agent.size * 1.5, -agent.size)
      ctx.lineTo(agent.size * 1.5, -agent.size)
      ctx.lineTo(agent.size * 0.8, agent.size * 2.5)
      ctx.lineTo(-agent.size * 0.8, agent.size * 2.5)
      ctx.closePath()
      ctx.fillStyle = `hsla(${agent.hue}, 70%, 30%, ${intensity * 0.8})`
      ctx.fill()

      // Eye glow
      ctx.beginPath()
      ctx.arc(-agent.size * 0.4, -agent.size * 2.5, agent.size * 0.25, 0, Math.PI * 2)
      ctx.arc(agent.size * 0.4, -agent.size * 2.5, agent.size * 0.25, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      ctx.restore()
    }

    const drawConnectionLines = (agents: Agent[], time: number) => {
      ctx.save()
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const dx = agents[i].x - agents[j].x
          const dy = agents[i].y - agents[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.12 * (Math.sin(time * 0.002 + i) * 0.5 + 0.5)
            ctx.beginPath()
            ctx.moveTo(agents[i].x, agents[i].y)
            ctx.lineTo(agents[j].x, agents[j].y)
            ctx.strokeStyle = `hsla(195, 100%, 50%, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      ctx.restore()
    }

    const animate = (time: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      frameRef.current = time

      // Clear with dark overlay for trail effect
      ctx.fillStyle = "hsla(222, 47%, 3%, 0.92)"
      ctx.fillRect(0, 0, w, h)

      drawGridFloor(w, h, time)

      // Draw radial arena boundary
      ctx.save()
      const arenaRadius = Math.min(w, h) * 0.42
      const arenaGrad = ctx.createRadialGradient(w / 2, h / 2, arenaRadius * 0.8, w / 2, h / 2, arenaRadius)
      arenaGrad.addColorStop(0, "transparent")
      arenaGrad.addColorStop(0.7, `hsla(195, 100%, 50%, ${0.02 + Math.sin(time * 0.001) * 0.01})`)
      arenaGrad.addColorStop(1, `hsla(195, 100%, 50%, ${0.06 + Math.sin(time * 0.0015) * 0.02})`)
      ctx.fillStyle = arenaGrad
      ctx.fillRect(0, 0, w, h)

      // Arena ring
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, arenaRadius, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(195, 100%, 50%, ${0.1 + Math.sin(time * 0.002) * 0.05})`
      ctx.lineWidth = 1
      ctx.stroke()

      // Inner ring
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, arenaRadius * 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(25, 100%, 50%, ${0.06 + Math.sin(time * 0.003) * 0.03})`
      ctx.lineWidth = 0.5
      ctx.stroke()
      ctx.restore()

      // Update and draw agents
      const agents = agentsRef.current
      for (const agent of agents) {
        if (!agent.alive) continue

        // Slowly drift
        agent.x += agent.vx
        agent.y += agent.vy

        // Mouse repulsion
        const mdx = agent.x - mouseRef.current.x
        const mdy = agent.y - mouseRef.current.y
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mDist < 150 && mDist > 0) {
          const force = (150 - mDist) / 150 * 0.3
          agent.vx += (mdx / mDist) * force
          agent.vy += (mdy / mDist) * force
        }

        // Return to general area
        const toDx = agent.targetX - agent.x
        const toDy = agent.targetY - agent.y
        agent.vx += toDx * 0.0003
        agent.vy += toDy * 0.0003

        // Damping
        agent.vx *= 0.98
        agent.vy *= 0.98

        // Boundary wrapping
        if (agent.x < -20) agent.x = w + 20
        if (agent.x > w + 20) agent.x = -20
        if (agent.y < -20) agent.y = h + 20
        if (agent.y > h + 20) agent.y = -20

        // Pulse glow
        agent.glowIntensity += agent.pulseSpeed * agent.glowDirection
        if (agent.glowIntensity >= 1) agent.glowDirection = -1
        if (agent.glowIntensity <= 0.3) agent.glowDirection = 1

        // Random particle emission
        if (Math.random() < 0.003) {
          const c = agent.hue === 195 ? "hsla(195, 100%, 60%, 0.6)" : "hsla(25, 100%, 60%, 0.6)"
          spawnParticles(agent.x, agent.y, c, 2)
        }
      }

      drawConnectionLines(agents, time)

      for (const agent of agents) {
        drawAgent(agent, time)
      }

      // Draw particles
      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 1 / p.maxLife
        p.vx *= 0.98
        p.vy *= 0.98

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.life * 0.6})`)
        ctx.fill()
      }

      // Scanline effect
      ctx.save()
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = "rgba(0,0,0,0.04)"
        ctx.fillRect(0, y, w, 1)
      }
      ctx.restore()

      // Vignette
      const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7)
      vignetteGrad.addColorStop(0, "transparent")
      vignetteGrad.addColorStop(1, "hsla(222, 47%, 2%, 0.7)")
      ctx.fillStyle = vignetteGrad
      ctx.fillRect(0, 0, w, h)

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [initAgents, spawnParticles])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
