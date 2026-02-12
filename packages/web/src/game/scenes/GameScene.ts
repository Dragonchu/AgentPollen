import * as Phaser from "phaser";
import type { AgentFullState, ItemState, TileMap } from "@battle-royale/shared";
import { TileType } from "@battle-royale/shared";

export const CELL_SIZE = 24;
export const GRID_SIZE = 20;
export const CANVAS_SIZE = CELL_SIZE * GRID_SIZE;

export class GameScene extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private itemGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private allianceGraphics!: Phaser.GameObjects.Graphics;
  private agentGraphics!: Phaser.GameObjects.Graphics;
  private obstacleGraphics!: Phaser.GameObjects.Graphics;

  private agents: Map<number, AgentFullState> = new Map();
  private items: ItemState[] = [];
  private selectedAgentId: number | null = null;
  private shrinkBorder: number = GRID_SIZE;
  private tileMap: TileMap | null = null;
  private onAgentClick?: (agentId: number) => void;
  private onReady?: () => void;

  constructor() {
    super({ key: "GameScene" });
  }

  setOnReady(callback: () => void): void {
    this.onReady = callback;
  }

  create(): void {
    this.gridGraphics = this.add.graphics();
    this.obstacleGraphics = this.add.graphics();
    this.zoneGraphics = this.add.graphics();
    this.itemGraphics = this.add.graphics();
    this.connectionGraphics = this.add.graphics();
    this.allianceGraphics = this.add.graphics();
    this.agentGraphics = this.add.graphics();

    this.drawGrid();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });

    this.onReady?.();
  }

  setOnAgentClick(callback: (agentId: number) => void): void {
    this.onAgentClick = callback;
  }

  updateData(
    agents: Map<number, AgentFullState>,
    items: ItemState[],
    selectedAgentId: number | null,
    shrinkBorder: number,
    tileMap: TileMap | null,
  ): void {
    this.agents = agents;
    this.items = items;
    this.selectedAgentId = selectedAgentId;
    this.shrinkBorder = shrinkBorder;
    
    // Draw obstacles once when tileMap is first received
    const wasNull = !this.tileMap;
    this.tileMap = tileMap;
    if (tileMap && wasNull) {
      this.drawObstacles();
    }
    
    this.redraw();
  }

  // --------------- drawing helpers ---------------

  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    // Subtle grid lines
    g.lineStyle(0.5, 0x111122, 0.5);
    for (let i = 0; i <= GRID_SIZE; i++) {
      g.lineBetween(i * CELL_SIZE, 0, i * CELL_SIZE, CANVAS_SIZE);
      g.lineBetween(0, i * CELL_SIZE, CANVAS_SIZE, i * CELL_SIZE);
    }
  }

  private drawObstacles(): void {
    const g = this.obstacleGraphics;
    g.clear();
    
    if (!this.tileMap) return;
    
    // Draw blocked tiles as obstacles
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const tile = this.tileMap.tiles[y][x];
        if (tile.type === TileType.Blocked) {
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;
          
          // Draw obstacle with a rocky/dark appearance
          // Outer glow
          g.fillStyle(0x44334d, 0.3);
          g.fillRect(px - 1, py - 1, CELL_SIZE + 2, CELL_SIZE + 2);
          
          // Main obstacle body
          g.fillStyle(0x2a1f35);
          g.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          
          // Inner highlight for depth
          g.fillStyle(0x3d2a4d, 0.6);
          g.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          
          // Edge highlight (top-left)
          g.fillStyle(0x55446d, 0.4);
          g.fillRect(px + 1, py + 1, CELL_SIZE - 6, 2);
          g.fillRect(px + 1, py + 1, 2, CELL_SIZE - 6);
        }
      }
    }
  }

  private redraw(): void {
    this.drawZone();
    this.drawItems();
    this.drawConnections();
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

    // Full-canvas danger tint — more subtle purple
    g.fillStyle(0x8844ff, 0.05);
    g.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Re-draw safe zone background
    g.fillStyle(0x0a0a14);
    g.fillRect(zoneX, zoneY, zoneW, zoneH);

    // Redraw grid lines inside safe zone
    g.lineStyle(0.5, 0x111122, 0.5);
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * CELL_SIZE;
      if (p >= zoneX && p <= zoneX + zoneW) {
        g.lineBetween(p, Math.max(zoneY, 0), p, Math.min(zoneY + zoneH, CANVAS_SIZE));
      }
      if (p >= zoneY && p <= zoneY + zoneH) {
        g.lineBetween(Math.max(zoneX, 0), p, Math.min(zoneX + zoneW, CANVAS_SIZE), p);
      }
    }

    // Safe zone border — purple glow
    g.lineStyle(2, 0x8844ff, 0.6);
    g.strokeRect(zoneX, zoneY, zoneW, zoneH);

    // Outer glow for the zone border
    g.lineStyle(4, 0x8844ff, 0.15);
    g.strokeRect(zoneX - 2, zoneY - 2, zoneW + 4, zoneH + 4);
  }

  private drawItems(): void {
    const g = this.itemGraphics;
    g.clear();

    for (const item of this.items) {
      const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.y * CELL_SIZE + CELL_SIZE / 2;

      // Item glow
      g.fillStyle(0xffaa22, 0.1);
      g.fillCircle(cx, cy, 8);

      // Item body
      g.fillStyle(0xffaa22, 0.7);
      g.fillRect(
        item.x * CELL_SIZE + CELL_SIZE * 0.3,
        item.y * CELL_SIZE + CELL_SIZE * 0.3,
        CELL_SIZE * 0.4,
        CELL_SIZE * 0.4,
      );
    }
  }

  /** Draw faint connection lines between nearby agents */
  private drawConnections(): void {
    const g = this.connectionGraphics;
    g.clear();

    const alive = Array.from(this.agents.values()).filter(a => a.alive);

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Connect agents within range 5
        if (dist <= 5) {
          const alpha = Math.max(0.03, 0.12 - dist * 0.02);
          g.lineStyle(1, 0x8844ff, alpha);
          g.lineBetween(
            (a.x + 0.5) * CELL_SIZE,
            (a.y + 0.5) * CELL_SIZE,
            (b.x + 0.5) * CELL_SIZE,
            (b.y + 0.5) * CELL_SIZE,
          );
        }
      }
    }
  }

  private drawAlliances(): void {
    const g = this.allianceGraphics;
    g.clear();
    if (this.selectedAgentId == null) return;

    const selected = this.agents.get(this.selectedAgentId);
    if (!selected?.alliances) return;

    g.lineStyle(1.5, 0x44aaff, 0.5);
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

    // Draw enemy lines in red
    if (selected.enemies) {
      g.lineStyle(1.5, 0xff4444, 0.3);
      for (const enemyId of selected.enemies) {
        const enemy = this.agents.get(enemyId);
        if (!enemy?.alive) continue;

        this.drawDashedLine(
          g,
          (selected.x + 0.5) * CELL_SIZE,
          (selected.y + 0.5) * CELL_SIZE,
          (enemy.x + 0.5) * CELL_SIZE,
          (enemy.y + 0.5) * CELL_SIZE,
          3,
          5,
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
      const radius = CELL_SIZE * 0.42; // Larger nodes
      const hue = (agent.id * 137) % 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6).color;
      const isSelected = this.selectedAgentId === agent.id;

      // Outer glow — more prominent
      const glowLayers = isSelected ? 8 : 3;
      for (let i = glowLayers; i > 0; i--) {
        g.fillStyle(color, isSelected ? 0.08 : 0.04);
        g.fillCircle(cx, cy, radius + i * (isSelected ? 3 : 2));
      }

      // Body
      g.fillStyle(color);
      g.fillCircle(cx, cy, radius);

      // Inner highlight
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(cx - radius * 0.2, cy - radius * 0.2, radius * 0.35);

      // Selection ring
      if (isSelected) {
        g.lineStyle(2.5, 0xffaa22, 0.9);
        g.strokeCircle(cx, cy, radius + 2);

        // Animated pulse ring (static representation)
        g.lineStyle(1.5, 0xffaa22, 0.3);
        g.strokeCircle(cx, cy, radius + 6);
      }

      // HP bar background
      const barW = CELL_SIZE * 0.9;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - radius - 7;

      g.fillStyle(0x0a0a14, 0.8);
      g.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      g.fillStyle(0x1a1a2e);
      g.fillRect(barX, barY, barW, barH);

      // HP bar fill
      const hpPct = agent.hp / (agent.maxHp || 100);
      const hpColor = hpPct > 0.6 ? 0x22cc88 : hpPct > 0.3 ? 0xff8800 : 0xff4444;
      g.fillStyle(hpColor);
      g.fillRect(barX, barY, barW * hpPct, barH);

      // Name label for selected agent
      if (isSelected) {
        // Draw a small name tag below the agent
        const nameTag = agent.name.substring(0, 6);
        // Use a text object approach - draw a background rect
        const tagW = nameTag.length * 6 + 8;
        const tagH = 14;
        const tagX = cx - tagW / 2;
        const tagY = cy + radius + 4;

        g.fillStyle(0x0a0a14, 0.9);
        g.fillRoundedRect(tagX, tagY, tagW, tagH, 3);
        g.lineStyle(1, color, 0.4);
        g.strokeRoundedRect(tagX, tagY, tagW, tagH, 3);
      }
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
