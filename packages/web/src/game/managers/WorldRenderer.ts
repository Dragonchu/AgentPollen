import type {
  AgentFullState,
  ItemState,
  TileMap,
} from "@battle-royale/shared";
import { AgentActionState, TileType } from "@battle-royale/shared";
import * as Phaser from "phaser";
import { SpriteDirection } from "@/constants/Assets";
import { ASSETS } from "@/constants/Assets";
import { CELL_SIZE } from "../scenes/gameConstants";
import type { AgentDisplayState } from "../scenes/types";

/**
 * WorldRenderer handles all world-related rendering:
 * - Agent sprites and animations
 * - Obstacles (rocks, etc.)
 * - Items (resources, etc.)
 * 
 * This class separates rendering responsibilities from GameScene orchestration,
 * following the 4-layer architecture principle.
 */
export class WorldRenderer {
  private scene: Phaser.Scene;
  
  // Sprite maps
  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();
  private obstacleSprites = new Map<string, Phaser.GameObjects.Sprite>();
  
  // Animation state
  private animCreated = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initialize the renderer (create animations, etc.)
   */
  initialize(): void {
    // Animations are created lazily on first agent sprite creation
  }

  /**
   * Update agent sprites based on current agent states and display states
   */
  updateAgentSprites(
    agents: Map<number, AgentFullState>,
    displayStates: Map<number, AgentDisplayState>
  ): void {
    for (const [id, displayState] of displayStates) {
      const agent = agents.get(id);
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
        if (!this.animCreated) {
          this.createAnimations();
          this.animCreated = true;
        }
        sprite = this.scene.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
        const isMoving =
          displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;
        const initialAnim = this.getAnimationForState(agent.actionState, isMoving);
        this.safePlayAnimation(sprite, initialAnim);
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

      const px = displayState.displayX * CELL_SIZE + CELL_SIZE / 2;
      const py = displayState.displayY * CELL_SIZE + CELL_SIZE / 2;
      sprite.setPosition(px, py);
    }

    // Clean up dead agents
    for (const id of this.agentSprites.keys()) {
      const hasDisplay = displayStates.has(id);
      const alive = agents.get(id)?.alive;
      if (!hasDisplay || !alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
      }
    }
  }

  /**
   * Draw obstacles on the map based on tilemap data
   */
  drawObstacles(tileMap: TileMap): void {
    // Clear old obstacles
    for (const sprite of this.obstacleSprites.values()) {
      sprite.destroy();
    }
    this.obstacleSprites.clear();

    // Draw new obstacles
    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        const tile = tileMap.tiles[y][x];
        if (tile.type === TileType.Blocked) {
          const px = x * CELL_SIZE + CELL_SIZE / 2;
          const py = y * CELL_SIZE + CELL_SIZE / 2;
          const sprite = this.scene.add.sprite(px, py, ASSETS.IMAGES.ROCK2);
          this.obstacleSprites.set(`${x},${y}`, sprite);
        }
      }
    }
  }

  /**
   * Draw items (resources) on the map
   */
  drawItems(items: ItemState[]): void {
    const currentItemIds = new Set(items.map((item) => item.id));
    for (const item of items) {
      const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.y * CELL_SIZE + CELL_SIZE / 2;
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        sprite = this.scene.add.image(cx, cy, ASSETS.IMAGES.GOLD_RESOURCE);
        this.itemSprites.set(item.id, sprite);
      } else {
        sprite.setPosition(cx, cy);
      }
    }
    // Clean up removed items
    for (const itemId of this.itemSprites.keys()) {
      if (!currentItemIds.has(itemId)) {
        this.itemSprites.get(itemId)?.destroy();
        this.itemSprites.delete(itemId);
      }
    }
  }

  /**
   * Create animation definitions for agent sprites
   */
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

  /**
   * Get the appropriate animation key for an agent's current state
   */
  private getAnimationForState(actionState: AgentActionState, isMoving: boolean): string {
    if (actionState === AgentActionState.Fighting) return "attack-anim";
    if (isMoving) return "walk-anim";
    return "idle-anim";
  }

  /**
   * Safely play an animation on a sprite (with guards against errors)
   */
  private safePlayAnimation(sprite: Phaser.GameObjects.Sprite | undefined, animKey: string): void {
    // Guard: ensure sprite exists and is not destroyed
    if (!sprite || sprite.scene !== this.scene) {
      return;
    }

    // Only attempt to play animation if it exists
    if (!this.scene.anims.exists(animKey)) {
      return;
    }

    // Don't replay if already playing
    if (sprite.anims.currentAnim?.key === animKey) {
      return;
    }

    try {
      sprite.play(animKey);
    } catch (e) {
      // Silently fail - animation may not be fully loaded yet
      console.debug(`Failed to play animation ${animKey}:`, e);
    }
  }

  /**
   * Determine sprite facing direction based on movement
   */
  private getDirectionFromMovement(fromX: number, toX: number): SpriteDirection {
    return toX < fromX ? SpriteDirection.Left : SpriteDirection.Right;
  }

  /**
   * Cleanup all sprites and resources
   */
  destroy(): void {
    // Destroy all agent sprites
    for (const sprite of this.agentSprites.values()) {
      sprite.destroy();
    }
    this.agentSprites.clear();

    // Destroy all item sprites
    for (const sprite of this.itemSprites.values()) {
      sprite.destroy();
    }
    this.itemSprites.clear();

    // Destroy all obstacle sprites
    for (const sprite of this.obstacleSprites.values()) {
      sprite.destroy();
    }
    this.obstacleSprites.clear();
  }
}
