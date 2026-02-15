import type { AgentFullState, ItemState, TileMap, Waypoint } from "@battle-royale/shared";
import { AgentActionState, TileType } from "@battle-royale/shared";
import * as Phaser from "phaser";
import { SpriteDirection } from "@/constants/Assets";
import { ASSETS } from "@/constants/Assets";
import { AgentDisplayStateManager } from "./AgentDisplayStateManager";
import { CELL_SIZE, GRID_SIZE } from "./gameConstants";
import type { Direction } from "./types";
import {
  type GameSceneRenderState,
  GameSceneRenderer,
} from "./GameSceneRenderer";

// 对外保持原有导出，便于 GameCanvas 等调用方使用
export { CELL_SIZE, GRID_SIZE, CANVAS_SIZE } from "./gameConstants";

export class GameScene extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private allianceGraphics!: Phaser.GameObjects.Graphics;

  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();

  private agents: Map<number, AgentFullState> = new Map();
  private items: ItemState[] = [];
  private selectedAgentId: number | null = null;
  private shrinkBorder = GRID_SIZE;
  private zoneCenterX = GRID_SIZE / 2;
  private zoneCenterY = GRID_SIZE / 2;
  private tileMap: TileMap | null = null;

  private onAgentClick?: (agentId: number) => void;
  private onReady?: () => void;

  private readonly displayStateManager = new AgentDisplayStateManager();
  private gameSceneRenderer!: GameSceneRenderer;

  constructor() {
    super({ key: "GameScene" });
  }

  setOnReady(callback: () => void): void {
    this.onReady = callback;
  }

  setOnAgentClick(callback: (agentId: number) => void): void {
    this.onAgentClick = callback;
  }

  preload(): void {
    this.load.image(ASSETS.IMAGES.ROCK2, "/assets/Terrain/Decorations/Rocks/Rock2.png");
    this.load.image(
      ASSETS.IMAGES.GOLD_RESOURCE,
      "/assets/Terrain/Resources/Gold/GoldResource/Gold_Resource.png"
    );
    this.load.spritesheet(
      ASSETS.IMAGES.WARRIOR_RUN.KEY,
      ASSETS.IMAGES.WARRIOR_RUN.PATH,
      {
        frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH,
        frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT,
      }
    );
    this.load.spritesheet(
      ASSETS.IMAGES.WARRIOR_ATTACK.KEY,
      ASSETS.IMAGES.WARRIOR_ATTACK.PATH,
      {
        frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH,
        frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT,
      }
    );
    this.load.spritesheet(
      ASSETS.IMAGES.WARRIOR_IDLE.KEY,
      ASSETS.IMAGES.WARRIOR_IDLE.PATH,
      {
        frameWidth: ASSETS.IMAGES.WARRIOR_IDLE.WIDTH,
        frameHeight: ASSETS.IMAGES.WARRIOR_IDLE.HEIGHT,
      }
    );
  }

  create(): void {
    this.gridGraphics = this.add.graphics();
    this.zoneGraphics = this.add.graphics();
    this.connectionGraphics = this.add.graphics();
    this.allianceGraphics = this.add.graphics();

    this.gameSceneRenderer = new GameSceneRenderer({
      grid: this.gridGraphics,
      zone: this.zoneGraphics,
      connection: this.connectionGraphics,
      alliance: this.allianceGraphics,
    });
    this.gameSceneRenderer.drawGrid();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });

    this.onReady?.();
  }

  updateData(
    agents: Map<number, AgentFullState>,
    items: ItemState[],
    selectedAgentId: number | null,
    shrinkBorder: number,
    agentPaths: Record<number, Waypoint[]> = {},
    tileMap: TileMap | null,
    zoneCenterX = GRID_SIZE / 2,
    zoneCenterY = GRID_SIZE / 2
  ): void {
    this.displayStateManager.updateFromServer(agents, agentPaths);

    this.agents = agents;
    this.items = items;
    this.selectedAgentId = selectedAgentId;
    this.shrinkBorder = shrinkBorder;
    this.zoneCenterX = zoneCenterX;
    this.zoneCenterY = zoneCenterY;

    const wasNull = !this.tileMap;
    this.tileMap = tileMap;
    if (tileMap && wasNull) {
      this.drawObstacles();
    }

    this.redraw();
  }

  update(_time: number, delta: number): void {
    this.displayStateManager.tick(delta, this.agents);

    let animCreated = false;
    const displayStates = this.displayStateManager.getDisplayStates();

    for (const [id, displayState] of displayStates) {
      const agent = this.agents.get(id);
      if (!agent?.alive) {
        const sprite = this.agentSprites.get(id);
        if (sprite) {
          sprite.destroy();
          this.agentSprites.delete(id);
        }
        continue;
      }

      let sprite = this.agentSprites.get(id);
      if (!sprite) {
        if (!animCreated) {
          this.anims.create({
            key: "walk-anim",
            frames: this.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_RUN.KEY, {
              start: 0,
              end: 5,
            }),
            frameRate: 6,
            repeat: -1,
          });
          this.anims.create({
            key: "attack-anim",
            frames: this.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_ATTACK.KEY, {
              start: 0,
              end: 5,
            }),
            frameRate: 6,
            repeat: -1,
          });
          this.anims.create({
            key: "idle-anim",
            frames: this.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_IDLE.KEY, {
              start: 0,
              end: 3,
            }),
            frameRate: 4,
            repeat: -1,
          });
          animCreated = true;
        }
        sprite = this.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
        const isMoving =
          displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;
        const initialAnim = this.getAnimationForState(agent.actionState, isMoving);
        sprite.play(initialAnim);
        displayState.currentAnimation = agent.actionState;
        this.agentSprites.set(id, sprite);
      } else {
        const isMoving =
          displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;
        const newAnim = this.getAnimationForState(agent.actionState, isMoving);
        if (
          displayState.currentAnimation !== agent.actionState ||
          newAnim !== sprite.anims.currentAnim?.key
        ) {
          sprite.play(newAnim);
          displayState.currentAnimation = agent.actionState;
          if (agent.actionState === AgentActionState.Fighting) {
            sprite.setTexture(ASSETS.IMAGES.WARRIOR_ATTACK.KEY);
          } else if (!isMoving) {
            sprite.setTexture(ASSETS.IMAGES.WARRIOR_IDLE.KEY);
          } else {
            sprite.setTexture(ASSETS.IMAGES.WARRIOR_RUN.KEY);
          }
        }
      }

      const newFacing = this.getDirectionFromMovement(displayState.prevX, displayState.targetX);
      if (newFacing !== displayState.facing) {
        displayState.facing = newFacing;
        sprite.setFlipX(newFacing === SpriteDirection.Left);
      }

      const px = displayState.displayX * CELL_SIZE + CELL_SIZE / 2;
      const py = displayState.displayY * CELL_SIZE + CELL_SIZE / 2;
      sprite.setPosition(px, py);
    }

    for (const id of this.agentSprites.keys()) {
      const hasDisplay = displayStates.has(id);
      const alive = this.agents.get(id)?.alive;
      if (!hasDisplay || !alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
      }
    }

    const state = this.getRenderState();
    this.gameSceneRenderer.drawConnections(state);
    this.gameSceneRenderer.drawAlliances(state);
  }

  private getAnimationForState(actionState: AgentActionState, isMoving: boolean): string {
    if (actionState === AgentActionState.Fighting) return "attack-anim";
    if (isMoving) return "walk-anim";
    return "idle-anim";
  }

  private getDirectionFromMovement(fromX: number, toX: number): Direction {
    return toX < fromX ? SpriteDirection.Left : SpriteDirection.Right;
  }

  private getRenderState(): GameSceneRenderState {
    return {
      agents: this.agents,
      agentDisplayStates: this.displayStateManager.getDisplayStates(),
      selectedAgentId: this.selectedAgentId,
      shrinkBorder: this.shrinkBorder,
      zoneCenterX: this.zoneCenterX,
      zoneCenterY: this.zoneCenterY,
    };
  }

  private drawObstacles(): void {
    if (!this.tileMap) return;
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const tile = this.tileMap.tiles[y][x];
        if (tile.type === TileType.Blocked) {
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;
          this.add.sprite(px, py, ASSETS.IMAGES.ROCK2);
        }
      }
    }
  }

  private drawItems(): void {
    const currentItemIds = new Set(this.items.map((item) => item.id));
    for (const item of this.items) {
      const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.y * CELL_SIZE + CELL_SIZE / 2;
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        sprite = this.add.image(cx, cy, ASSETS.IMAGES.GOLD_RESOURCE);
        this.itemSprites.set(item.id, sprite);
      } else {
        sprite.setPosition(cx, cy);
      }
    }
    for (const itemId of this.itemSprites.keys()) {
      if (!currentItemIds.has(itemId)) {
        this.itemSprites.get(itemId)?.destroy();
        this.itemSprites.delete(itemId);
      }
    }
  }

  private redraw(): void {
    this.gameSceneRenderer.drawZone(this.getRenderState());
    this.drawItems();
    this.gameSceneRenderer.drawConnections(this.getRenderState());
    this.gameSceneRenderer.drawAlliances(this.getRenderState());
  }

  private handleClick(px: number, py: number): void {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);
    const displayStates = this.displayStateManager.getDisplayStates();

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of this.agents) {
      if (!agent.alive) continue;
      const displayState = displayStates.get(agent.id);
      const renderX = displayState ? displayState.displayX : agent.x;
      const renderY = displayState ? displayState.displayY : agent.y;
      const dist = Math.abs(renderX - gx) + Math.abs(renderY - gy);
      if (dist <= 1 && (!closest || dist < closest.dist)) {
        closest = { id: agent.id, dist };
      }
    }
    if (closest) {
      this.onAgentClick?.(closest.id);
    }
  }
}
