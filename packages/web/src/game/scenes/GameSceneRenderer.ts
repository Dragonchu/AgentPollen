import type { AgentFullState } from "@battle-royale/shared";
import * as Phaser from "phaser";
import type { AgentDisplayState } from "./types";
import { CANVAS_SIZE, CELL_SIZE, GRID_SIZE } from "./gameConstants";

/** 绘制所需的状态（安全区、代理、选中等） */
export interface GameSceneRenderState {
  agents: Map<number, AgentFullState>;
  agentDisplayStates: Map<number, AgentDisplayState>;
  selectedAgentId: number | null;
  shrinkBorder: number;
  zoneCenterX: number;
  zoneCenterY: number;
}

export interface GameSceneGraphics {
  grid: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Graphics;
  connection: Phaser.GameObjects.Graphics;
  alliance: Phaser.GameObjects.Graphics;
  agent: Phaser.GameObjects.Graphics;
}

/**
 * 负责游戏场景中所有基于 Graphics 的绘制
 * 网格、安全区、连接线、同盟线、代理几何体
 */
export class GameSceneRenderer {
  constructor(private readonly graphics: GameSceneGraphics) {}

  drawGrid(): void {
    const g = this.graphics.grid;
    g.clear();
    g.lineStyle(0.5, 0x111122, 0.5);
    for (let i = 0; i <= GRID_SIZE; i++) {
      g.lineBetween(i * CELL_SIZE, 0, i * CELL_SIZE, CANVAS_SIZE);
      g.lineBetween(0, i * CELL_SIZE, CANVAS_SIZE, i * CELL_SIZE);
    }
  }

  drawZone(state: Pick<GameSceneRenderState, "shrinkBorder" | "zoneCenterX" | "zoneCenterY">): void {
    const g = this.graphics.zone;
    g.clear();
    if (state.shrinkBorder >= GRID_SIZE) return;

    const half = state.shrinkBorder / 2;
    const zoneX = (state.zoneCenterX - half) * CELL_SIZE;
    const zoneY = (state.zoneCenterY - half) * CELL_SIZE;
    const zoneW = state.shrinkBorder * CELL_SIZE;
    const zoneH = state.shrinkBorder * CELL_SIZE;

    g.fillStyle(0x8844ff, 0.05);
    g.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    g.fillStyle(0x0a0a14, 0.3);
    g.fillRect(zoneX, zoneY, zoneW, zoneH);
    g.lineStyle(2, 0x8844ff, 0.6);
    g.strokeRect(zoneX, zoneY, zoneW, zoneH);
    g.lineStyle(4, 0x8844ff, 0.15);
    g.strokeRect(zoneX - 2, zoneY - 2, zoneW + 4, zoneH + 4);
  }

  drawConnections(state: Pick<GameSceneRenderState, "agents" | "agentDisplayStates">): void {
    const g = this.graphics.connection;
    g.clear();
    const alive = Array.from(state.agents.values()).filter((a) => a.alive);

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const aDisplay = state.agentDisplayStates.get(a.id);
        const bDisplay = state.agentDisplayStates.get(b.id);
        const ax = aDisplay ? aDisplay.displayX : a.x;
        const ay = aDisplay ? aDisplay.displayY : a.y;
        const bx = bDisplay ? bDisplay.displayX : b.x;
        const by = bDisplay ? bDisplay.displayY : b.y;
        const dx = ax - bx;
        const dy = ay - by;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 5) {
          const alpha = Math.max(0.03, 0.12 - dist * 0.02);
          g.lineStyle(1, 0x8844ff, alpha);
          g.lineBetween(
            (ax + 0.5) * CELL_SIZE,
            (ay + 0.5) * CELL_SIZE,
            (bx + 0.5) * CELL_SIZE,
            (by + 0.5) * CELL_SIZE
          );
        }
      }
    }
  }

  drawAlliances(state: GameSceneRenderState): void {
    const g = this.graphics.alliance;
    g.clear();
    if (state.selectedAgentId == null) return;

    const selected = state.agents.get(state.selectedAgentId);
    if (!selected?.alliances) return;

    const selectedDisplay = state.agentDisplayStates.get(selected.id);
    const selectedX = selectedDisplay ? selectedDisplay.displayX : selected.x;
    const selectedY = selectedDisplay ? selectedDisplay.displayY : selected.y;

    g.lineStyle(1.5, 0x44aaff, 0.5);
    for (const allyId of selected.alliances) {
      const ally = state.agents.get(allyId);
      if (!ally?.alive) continue;
      const allyDisplay = state.agentDisplayStates.get(allyId);
      const allyX = allyDisplay ? allyDisplay.displayX : ally.x;
      const allyY = allyDisplay ? allyDisplay.displayY : ally.y;
      this.drawDashedLine(
        g,
        (selectedX + 0.5) * CELL_SIZE,
        (selectedY + 0.5) * CELL_SIZE,
        (allyX + 0.5) * CELL_SIZE,
        (allyY + 0.5) * CELL_SIZE,
        4,
        4
      );
    }

    if (selected.enemies) {
      g.lineStyle(1.5, 0xff4444, 0.3);
      for (const enemyId of selected.enemies) {
        const enemy = state.agents.get(enemyId);
        if (!enemy?.alive) continue;
        const enemyDisplay = state.agentDisplayStates.get(enemyId);
        const enemyX = enemyDisplay ? enemyDisplay.displayX : enemy.x;
        const enemyY = enemyDisplay ? enemyDisplay.displayY : enemy.y;
        this.drawDashedLine(
          g,
          (selectedX + 0.5) * CELL_SIZE,
          (selectedY + 0.5) * CELL_SIZE,
          (enemyX + 0.5) * CELL_SIZE,
          (enemyY + 0.5) * CELL_SIZE,
          3,
          5
        );
      }
    }
  }

  drawAgents(state: GameSceneRenderState): void {
    const g = this.graphics.agent;
    g.clear();
    const AGENT_SIZE = 5;
    const glowRadius = AGENT_SIZE * 5.5;

    for (const [_id, agent] of state.agents) {
      if (!agent.alive) continue;

      const displayState = state.agentDisplayStates.get(agent.id);
      const renderX = displayState ? displayState.displayX : agent.x;
      const renderY = displayState ? displayState.displayY : agent.y;
      const cx = renderX * CELL_SIZE + CELL_SIZE / 2;
      const cy = renderY * CELL_SIZE + CELL_SIZE / 2;

      const hue = (agent.id * 137) % 360;
      const hueNorm = hue / 360;
      const isSelected = state.selectedAgentId === agent.id;
      const headColor = Phaser.Display.Color.HSLToColor(hueNorm, 0.8, 0.4).color;
      const bodyColor = Phaser.Display.Color.HSLToColor(hueNorm, 0.7, 0.3).color;
      const eyeColor = Phaser.Display.Color.HSLToColor(hueNorm, 1, 0.5).color;

      const glowLayers = isSelected ? 10 : 6;
      for (let i = glowLayers; i > 0; i--) {
        const r = glowRadius * (0.3 + (i / glowLayers) * 0.7);
        const alpha =
          (isSelected ? 0.12 : 0.06) * (1 - i / glowLayers) * (1 - i / (glowLayers * 2));
        g.fillStyle(eyeColor, alpha);
        g.fillCircle(cx, cy, r);
      }

      const s = AGENT_SIZE;
      g.fillStyle(bodyColor, 0.95);
      g.fillTriangle(
        cx - 1.5 * s,
        cy - s,
        cx + 1.5 * s,
        cy - s,
        cx + 0.8 * s,
        cy + 2.5 * s
      );
      g.fillTriangle(
        cx - 1.5 * s,
        cy - s,
        cx + 0.8 * s,
        cy + 2.5 * s,
        cx - 0.8 * s,
        cy + 2.5 * s
      );

      g.fillStyle(headColor, 0.95);
      g.fillCircle(cx, cy - 2.5 * s, 1.2 * s);
      g.fillStyle(eyeColor);
      g.fillCircle(cx - 0.4 * s, cy - 2.5 * s, 0.25 * s);
      g.fillCircle(cx + 0.4 * s, cy - 2.5 * s, 0.25 * s);

      const ringR = glowRadius * 0.6;
      if (isSelected) {
        g.lineStyle(2.5, 0xffaa22, 0.9);
        g.strokeCircle(cx, cy, ringR);
        g.lineStyle(1.5, 0xffaa22, 0.3);
        g.strokeCircle(cx, cy, ringR + 6);
      }

      const barW = CELL_SIZE * 0.9;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - glowRadius - 4;
      g.fillStyle(0x0a0a14, 0.8);
      g.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      g.fillStyle(0x1a1a2e);
      g.fillRect(barX, barY, barW, barH);
      const hpPct = agent.hp / (agent.maxHp || 100);
      const hpColor = hpPct > 0.6 ? 0x22cc88 : hpPct > 0.3 ? 0xff8800 : 0xff4444;
      g.fillStyle(hpColor);
      g.fillRect(barX, barY, barW * hpPct, barH);

      if (isSelected) {
        const nameTag = agent.name.substring(0, 6);
        const tagW = nameTag.length * 6 + 8;
        const tagH = 14;
        const tagX = cx - tagW / 2;
        const tagY = cy + 2.5 * s + 4;
        g.fillStyle(0x0a0a14, 0.9);
        g.fillRoundedRect(tagX, tagY, tagW, tagH, 3);
        g.lineStyle(1, eyeColor, 0.4);
        g.strokeRoundedRect(tagX, tagY, tagW, tagH, 3);
      }
    }
  }

  private drawDashedLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLen: number,
    gapLen: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const ux = dx / dist;
    const uy = dy / dist;
    let drawn = 0;
    let drawing = true;
    while (drawn < dist) {
      const segEnd = Math.min(drawn + (drawing ? dashLen : gapLen), dist);
      if (drawing) {
        g.lineBetween(
          x1 + ux * drawn,
          y1 + uy * drawn,
          x1 + ux * segEnd,
          y1 + uy * segEnd
        );
      }
      drawn = segEnd;
      drawing = !drawing;
    }
  }
}
