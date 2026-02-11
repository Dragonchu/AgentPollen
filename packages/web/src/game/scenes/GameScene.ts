import * as Phaser from "phaser";
import type { AgentFullState, ItemState } from "@battle-royale/shared";

export const CELL_SIZE = 24;
export const GRID_SIZE = 20;
export const CANVAS_SIZE = CELL_SIZE * GRID_SIZE;

/**
 * Main game scene that renders the battle royale map.
 *
 * Layers (bottom → top):
 *   1. Grid (static, drawn once)
 *   2. Zone overlay (danger zone + safe zone border)
 *   3. Items
 *   4. Alliance lines
 *   5. Agents (body + selection ring + HP bars)
 *
 * Extension points:
 *   - Replace Graphics-drawn agents with Sprites for animations
 *   - Add particle effects for combat / death / zone damage
 *   - Add a tilemap layer beneath the grid for terrain variety
 */
export class GameScene extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private itemGraphics!: Phaser.GameObjects.Graphics;
  private allianceGraphics!: Phaser.GameObjects.Graphics;
  private agentGraphics!: Phaser.GameObjects.Graphics;

  private agents: Map<number, AgentFullState> = new Map();
  private items: ItemState[] = [];
  private selectedAgentId: number | null = null;
  private shrinkBorder: number = GRID_SIZE;
  private onAgentClick?: (agentId: number) => void;
  private onReady?: () => void;

  constructor() {
    super({ key: "GameScene" });
  }

  setOnReady(callback: () => void): void {
    this.onReady = callback;
  }

  create(): void {
    // Graphics layers, ordered bottom-to-top
    this.gridGraphics = this.add.graphics();
    this.zoneGraphics = this.add.graphics();
    this.itemGraphics = this.add.graphics();
    this.allianceGraphics = this.add.graphics();
    this.agentGraphics = this.add.graphics();

    this.drawGrid();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });

    // Notify the React component that the scene is ready
    this.onReady?.();
  }

  setOnAgentClick(callback: (agentId: number) => void): void {
    this.onAgentClick = callback;
  }

  /**
   * Push new data from the React layer into the scene and redraw.
   * Called whenever the parent component receives updated props.
   */
  updateData(
    agents: Map<number, AgentFullState>,
    items: ItemState[],
    selectedAgentId: number | null,
    shrinkBorder: number,
  ): void {
    this.agents = agents;
    this.items = items;
    this.selectedAgentId = selectedAgentId;
    this.shrinkBorder = shrinkBorder;
    this.redraw();
  }

  // --------------- drawing helpers ---------------

  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    g.lineStyle(0.5, 0x1a1a2a);
    for (let i = 0; i <= GRID_SIZE; i++) {
      g.lineBetween(i * CELL_SIZE, 0, i * CELL_SIZE, CANVAS_SIZE);
      g.lineBetween(0, i * CELL_SIZE, CANVAS_SIZE, i * CELL_SIZE);
    }
  }

  private redraw(): void {
    this.drawZone();
    this.drawItems();
    this.drawAlliances();
    this.drawAgents();
  }

  private drawZone(): void {
    const g = this.zoneGraphics;
    g.clear();
    if (this.shrinkBorder >= GRID_SIZE) return;

    const half = this.shrinkBorder / 2;
    const center = GRID_SIZE / 2;
    const zoneX = (center - half) * CELL_SIZE;
    const zoneY = (center - half) * CELL_SIZE;
    const zoneW = this.shrinkBorder * CELL_SIZE;
    const zoneH = this.shrinkBorder * CELL_SIZE;

    // Full-canvas danger tint
    g.fillStyle(0xff2828, 0.08);
    g.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Re-draw safe zone background to "erase" the tint
    g.fillStyle(0x0c0c14);
    g.fillRect(zoneX, zoneY, zoneW, zoneH);

    // Redraw grid lines that fall inside the safe zone
    g.lineStyle(0.5, 0x1a1a2a);
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * CELL_SIZE;
      if (p >= zoneX && p <= zoneX + zoneW) {
        g.lineBetween(p, Math.max(zoneY, 0), p, Math.min(zoneY + zoneH, CANVAS_SIZE));
      }
      if (p >= zoneY && p <= zoneY + zoneH) {
        g.lineBetween(Math.max(zoneX, 0), p, Math.min(zoneX + zoneW, CANVAS_SIZE), p);
      }
    }

    // Safe zone border
    g.lineStyle(2, 0xff3c3c, 0.5);
    g.strokeRect(zoneX, zoneY, zoneW, zoneH);
  }

  private drawItems(): void {
    const g = this.itemGraphics;
    g.clear();

    for (const item of this.items) {
      g.fillStyle(0xffaa22, 0.6);
      g.fillRect(
        item.x * CELL_SIZE + CELL_SIZE * 0.3,
        item.y * CELL_SIZE + CELL_SIZE * 0.3,
        CELL_SIZE * 0.4,
        CELL_SIZE * 0.4,
      );
    }
  }

  private drawAlliances(): void {
    const g = this.allianceGraphics;
    g.clear();
    if (this.selectedAgentId == null) return;

    const selected = this.agents.get(this.selectedAgentId);
    if (!selected?.alliances) return;

    g.lineStyle(1.5, 0x44aaff, 0.4);
    for (const allyId of selected.alliances) {
      const ally = this.agents.get(allyId);
      if (!ally?.alive) continue;

      this.drawDashedLine(
        g,
        (selected.x + 0.5) * CELL_SIZE,
        (selected.y + 0.5) * CELL_SIZE,
        (ally.x + 0.5) * CELL_SIZE,
        (ally.y + 0.5) * CELL_SIZE,
        4,
        4,
      );
    }
  }

  private drawDashedLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLen: number,
    gapLen: number,
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
          y1 + uy * segEnd,
        );
      }
      drawn = segEnd;
      drawing = !drawing;
    }
  }

  private drawAgents(): void {
    const g = this.agentGraphics;
    g.clear();

    for (const [, agent] of this.agents) {
      if (!agent.alive) continue;

      const cx = agent.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = agent.y * CELL_SIZE + CELL_SIZE / 2;
      const radius = CELL_SIZE * 0.35;
      const hue = (agent.id * 137) % 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6).color;
      const isSelected = this.selectedAgentId === agent.id;

      // Glow – concentric translucent circles
      const glowLayers = isSelected ? 6 : 2;
      for (let i = glowLayers; i > 0; i--) {
        g.fillStyle(color, 0.05);
        g.fillCircle(cx, cy, radius + i * 2);
      }

      // Body
      g.fillStyle(color);
      g.fillCircle(cx, cy, radius);

      // Selection ring
      if (isSelected) {
        g.lineStyle(2, 0xffaa22);
        g.strokeCircle(cx, cy, radius);
      }

      // HP bar background
      const barW = CELL_SIZE * 0.8;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - radius - 6;

      g.fillStyle(0x1a1a2a);
      g.fillRect(barX, barY, barW, barH);

      // HP bar fill
      const hpPct = agent.hp / (agent.maxHp || 100);
      const hpColor = hpPct > 0.6 ? 0x44ff66 : hpPct > 0.3 ? 0xffaa22 : 0xff2222;
      g.fillStyle(hpColor);
      g.fillRect(barX, barY, barW * hpPct, barH);
    }
  }

  // --------------- interaction ---------------

  private handleClick(px: number, py: number): void {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of this.agents) {
      if (!agent.alive) continue;
      const dist = Math.abs(agent.x - gx) + Math.abs(agent.y - gy);
      if (dist <= 1 && (!closest || dist < closest.dist)) {
        closest = { id: agent.id, dist };
      }
    }

    if (closest) {
      this.onAgentClick?.(closest.id);
    }
  }
}
