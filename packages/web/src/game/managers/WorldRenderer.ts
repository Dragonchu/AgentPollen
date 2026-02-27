import * as Phaser from "phaser";
import type { AgentFullState, ItemState, TileMap } from "@battle-royale/shared";
import { AgentActionState, TileType } from "@battle-royale/shared";
import { ASSETS, SpriteDirection } from "@/constants/Assets";
import { CELL_SIZE } from "../scenes/gameConstants";
import type { AgentDisplayState, Direction } from "../scenes/types";
import { CoordinateUtils } from "../utils/CoordinateUtils";
import type { GameState } from "./GameState";
import type { MotionState } from "./MotionState";
import type { CameraManager } from "./CameraManager";

/**
 * WorldRenderer is responsible for all world-space rendering:
 * tile background, obstacles, items, and agent sprites.
 *
 * It subscribes to GameState and MotionState events directly,
 * so GameScene.update() only needs to call worldRenderer.update().
 */
export class WorldRenderer {
  private readonly scene: Phaser.Scene;
  private readonly gameState: GameState;
  private readonly motionState: MotionState;
  private readonly cameraManager: CameraManager;

  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();
  private obstacleSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private tileBackground: Phaser.GameObjects.TileSprite | null = null;
  private animCreated = false;

  // Latest snapshot from MotionState events
  private motionStates = new Map<number, AgentDisplayState>();

  constructor(
    scene: Phaser.Scene,
    gameState: GameState,
    motionState: MotionState,
    cameraManager: CameraManager,
  ) {
    this.scene = scene;
    this.gameState = gameState;
    this.motionState = motionState;
    this.cameraManager = cameraManager;
  }

  create(): void {
    this.gameState.on("state:tilemap:updated", this.onTilemapUpdated, this);
    this.motionState.on("motion:updated", this.onMotionStatesChanged, this);
    this.motionState.on("motion:frame-updated", this.onMotionStatesChanged, this);
  }

  /** Called every frame from GameScene.update() after motionState.tick(). */
  update(): void {
    this.updateAgentSprites(this.gameState.getAgents());
    this.drawItems(this.gameState.getItems());
  }

  destroy(): void {
    this.gameState.off("state:tilemap:updated", this.onTilemapUpdated, this);
    this.motionState.off("motion:updated", this.onMotionStatesChanged, this);
    this.motionState.off("motion:frame-updated", this.onMotionStatesChanged, this);

    for (const s of this.agentSprites.values()) s.destroy();
    this.agentSprites.clear();

    for (const s of this.itemSprites.values()) s.destroy();
    this.itemSprites.clear();

    for (const s of this.obstacleSprites.values()) s.destroy();
    this.obstacleSprites.clear();

    if (this.tileBackground) {
      this.tileBackground.destroy();
      this.tileBackground = null;
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  private onTilemapUpdated(tileMap: TileMap): void {
    this.cameraManager.setWorldDimensions(tileMap.width, tileMap.height);

    if (!this.tileBackground) {
      const worldWidth = tileMap.width * CELL_SIZE;
      const worldHeight = tileMap.height * CELL_SIZE;
      this.tileBackground = this.scene.add
        .tileSprite(0, 0, worldWidth, worldHeight, ASSETS.IMAGES.Tile.KEY)
        .setOrigin(0, 0);
      this.cameraManager.ignoreInUICamera(this.tileBackground);
    }

    this.drawObstacles(tileMap);
  }

  private onMotionStatesChanged(motionStates: Map<number, AgentDisplayState>): void {
    this.motionStates = motionStates;
  }

  // ─── Drawing helpers ────────────────────────────────────────────────────────

  private drawObstacles(tileMap: TileMap): void {
    for (const sprite of this.obstacleSprites.values()) sprite.destroy();
    this.obstacleSprites.clear();

    for (let gridY = 0; gridY < tileMap.height; gridY++) {
      for (let gridX = 0; gridX < tileMap.width; gridX++) {
        if (tileMap.tiles[gridY][gridX].type !== TileType.Blocked) continue;
        const worldPos = CoordinateUtils.gridToWorld({ gridX, gridY }, CELL_SIZE);
        const sprite = this.scene.add
          .sprite(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.ROCK2)
          .setOrigin(0.5, 0.5);
        this.cameraManager.ignoreInUICamera(sprite);
        this.obstacleSprites.set(`${gridX},${gridY}`, sprite);
      }
    }
  }

  private drawItems(items: ItemState[]): void {
    const validItems = items.filter((item): item is NonNullable<typeof item> => item != null);
    const currentIds = new Set(validItems.map((i) => i.id));

    for (const item of validItems) {
      const worldPos = CoordinateUtils.gridToWorld({ gridX: item.x, gridY: item.y }, CELL_SIZE);
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        sprite = this.scene.add
          .image(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.GOLD_RESOURCE)
          .setOrigin(0.5, 0.5);
        this.cameraManager.ignoreInUICamera(sprite);
        this.itemSprites.set(item.id, sprite);
      } else {
        sprite.setPosition(worldPos.worldX, worldPos.worldY);
      }
    }

    for (const id of this.itemSprites.keys()) {
      if (!currentIds.has(id)) {
        this.itemSprites.get(id)?.destroy();
        this.itemSprites.delete(id);
      }
    }
  }

  private updateAgentSprites(agents: Map<number, AgentFullState>): void {
    for (const [id, displayState] of this.motionStates) {
      const agent = agents.get(id);
      if (!agent?.alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
        continue;
      }

      let sprite = this.agentSprites.get(id);
      const isMoving =
        displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;

      if (!sprite) {
        if (!this.animCreated) {
          this.createAnimations();
          this.animCreated = true;
        }
        sprite = this.scene.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
        this.cameraManager.ignoreInUICamera(sprite);
        this.safePlayAnimation(sprite, this.getAnimationForState(agent.actionState, isMoving));
        displayState.currentAnimation = agent.actionState;
        this.agentSprites.set(id, sprite);
      } else {
        const newAnim = this.getAnimationForState(agent.actionState, isMoving);
        if (
          displayState.currentAnimation !== agent.actionState ||
          newAnim !== sprite.anims.currentAnim?.key
        ) {
          this.safePlayAnimation(sprite, newAnim);
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

      const worldPos = CoordinateUtils.gridToWorld(
        { gridX: displayState.displayX, gridY: displayState.displayY },
        CELL_SIZE,
      );
      sprite.setPosition(worldPos.worldX, worldPos.worldY).setOrigin(0.5, 0.5);
    }

    // Remove sprites for agents no longer in motionStates or dead
    for (const id of this.agentSprites.keys()) {
      if (!this.motionStates.has(id) || !agents.get(id)?.alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
      }
    }
  }

  // ─── Animation helpers ──────────────────────────────────────────────────────

  private createAnimations(): void {
    this.scene.anims.create({
      key: "walk-anim",
      frames: this.scene.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_RUN.KEY, {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "attack-anim",
      frames: this.scene.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_ATTACK.KEY, {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "idle-anim",
      frames: this.scene.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_IDLE.KEY, {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
  }

  private getAnimationForState(actionState: AgentActionState, isMoving: boolean): string {
    if (actionState === AgentActionState.Fighting) return "attack-anim";
    if (isMoving) return "walk-anim";
    return "idle-anim";
  }

  private safePlayAnimation(
    sprite: Phaser.GameObjects.Sprite | undefined,
    animKey: string,
  ): void {
    if (!sprite || sprite.scene !== this.scene) return;
    if (!this.scene.anims.exists(animKey)) return;
    if (sprite.anims.currentAnim?.key === animKey) return;
    try {
      sprite.play(animKey);
    } catch (e) {
      console.debug(`Failed to play animation ${animKey}:`, e);
    }
  }

  private getDirectionFromMovement(fromX: number, toX: number): Direction {
    return toX < fromX ? SpriteDirection.Left : SpriteDirection.Right;
  }
}

