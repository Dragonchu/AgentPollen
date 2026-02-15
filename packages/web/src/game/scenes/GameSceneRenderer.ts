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
