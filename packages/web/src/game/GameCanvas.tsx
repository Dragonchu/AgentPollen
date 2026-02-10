"use client";

import { useEffect, useRef } from "react";
import type { AgentFullState, AgentSyncState, ItemState } from "@battle-royale/shared";

const CELL_SIZE = 24;
const GRID_SIZE = 20;
const CANVAS_SIZE = CELL_SIZE * GRID_SIZE;

/**
 * Phaser-ready game canvas.
 *
 * MVP: Uses Canvas 2D directly for simplicity.
 * Extension: Replace with Phaser scenes for sprite animations,
 * tilemap rendering, particle effects, etc.
 *
 * To migrate to Phaser:
 * 1. Create a Phaser.Game in useEffect
 * 2. Create scenes: BootScene, GameScene, UIScene
 * 3. Pass agent data via Phaser events or registry
 * 4. Use sprite sheets instead of colored circles
 */
interface GameCanvasProps {
  agents: Map<number, AgentFullState>;
  items?: ItemState[];
  selectedAgentId?: number | null;
  shrinkBorder?: number;
  onAgentClick?: (agentId: number) => void;
}

export function GameCanvas({
  agents,
  items = [],
  selectedAgentId,
  shrinkBorder = GRID_SIZE,
  onAgentClick,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef(agents);
  const itemsRef = useRef(items);
  const selectedRef = useRef(selectedAgentId);
  const borderRef = useRef(shrinkBorder);

  agentsRef.current = agents;
  itemsRef.current = items;
  selectedRef.current = selectedAgentId;
  borderRef.current = shrinkBorder;

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const agents = agentsRef.current;
      const items = itemsRef.current;
      const selected = selectedRef.current;
      const border = borderRef.current;

      // Clear
      ctx.fillStyle = "#0c0c14";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Grid lines
      ctx.strokeStyle = "#1a1a2a";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
      }

      // Safe zone
      if (border < GRID_SIZE) {
        const half = border / 2;
        const cx = GRID_SIZE / 2;
        const cy = GRID_SIZE / 2;
        // Danger zone overlay
        ctx.fillStyle = "rgba(255, 40, 40, 0.08)";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        // Clear safe zone
        ctx.clearRect(
          (cx - half) * CELL_SIZE,
          (cy - half) * CELL_SIZE,
          border * CELL_SIZE,
          border * CELL_SIZE,
        );
        // Redraw safe zone background
        ctx.fillStyle = "#0c0c14";
        ctx.fillRect(
          (cx - half) * CELL_SIZE,
          (cy - half) * CELL_SIZE,
          border * CELL_SIZE,
          border * CELL_SIZE,
        );
        // Safe zone border
        ctx.strokeStyle = "rgba(255, 60, 60, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          (cx - half) * CELL_SIZE,
          (cy - half) * CELL_SIZE,
          border * CELL_SIZE,
          border * CELL_SIZE,
        );
      }

      // Items
      for (const item of items) {
        ctx.fillStyle = "#ffaa22";
        ctx.globalAlpha = 0.6;
        ctx.fillRect(
          item.x * CELL_SIZE + CELL_SIZE * 0.3,
          item.y * CELL_SIZE + CELL_SIZE * 0.3,
          CELL_SIZE * 0.4,
          CELL_SIZE * 0.4,
        );
        ctx.globalAlpha = 1;
      }

      // Alliance lines for selected agent
      const selectedAgent = selected != null ? agents.get(selected) : null;
      if (selectedAgent?.alliances) {
        ctx.strokeStyle = "rgba(68, 170, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        for (const allyId of selectedAgent.alliances) {
          const ally = agents.get(allyId);
          if (ally?.alive) {
            ctx.beginPath();
            ctx.moveTo(
              (selectedAgent.x + 0.5) * CELL_SIZE,
              (selectedAgent.y + 0.5) * CELL_SIZE,
            );
            ctx.lineTo((ally.x + 0.5) * CELL_SIZE, (ally.y + 0.5) * CELL_SIZE);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
      }

      // Agents
      /**
       * Extension point: replace this with sprite rendering.
       * Each agent has a `color` and `personality` that can map to sprite sheets.
       * For Phaser migration, create a SpriteRenderer class.
       */
      for (const [, agent] of agents) {
        if (!agent.alive) continue;

        const cx = agent.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = agent.y * CELL_SIZE + CELL_SIZE / 2;
        const radius = CELL_SIZE * 0.35;

        // Glow
        ctx.shadowColor = `hsl(${(agent.id * 137) % 360}, 70%, 60%)`;
        ctx.shadowBlur = selected === agent.id ? 12 : 4;

        // Agent body
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${(agent.id * 137) % 360}, 70%, 60%)`;
        ctx.fill();

        // Selection ring
        if (selected === agent.id) {
          ctx.strokeStyle = "#ffaa22";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // HP bar
        const barWidth = CELL_SIZE * 0.8;
        const barHeight = 3;
        const barX = cx - barWidth / 2;
        const barY = cy - radius - 6;
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const hpPct = agent.hp / (agent.maxHp || 100);
        ctx.fillStyle = hpPct > 0.6 ? "#44ff66" : hpPct > 0.3 ? "#ffaa22" : "#ff2222";
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Click handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE);

    // Find closest agent to click
    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of agentsRef.current) {
      if (!agent.alive) continue;
      const dist = Math.abs(agent.x - x) + Math.abs(agent.y - y);
      if (dist <= 1 && (!closest || dist < closest.dist)) {
        closest = { id: agent.id, dist };
      }
    }
    if (closest) onAgentClick?.(closest.id);
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={handleClick}
      style={{
        width: "100%",
        maxWidth: CANVAS_SIZE,
        aspectRatio: "1",
        borderRadius: 8,
        cursor: "pointer",
        border: "1px solid #1e1e2e",
      }}
    />
  );
}
