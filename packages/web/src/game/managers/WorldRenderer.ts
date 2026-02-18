import * as Phaser from "phaser";
import type {
  AgentFullState,
  ItemState,
  TileMap,
} from "@battle-royale/shared";
import { AgentActionState, TileType } from "@battle-royale/shared";
import { SpriteDirection } from "@/constants/Assets";
import { ASSETS } from "@/constants/Assets";
import { CELL_SIZE } from "../scenes/gameConstants";
import type { Direction, AgentDisplayState } from "../scenes/types";
import { CoordinateUtils } from "../utils/CoordinateUtils";

/**
 * WorldRenderer handles all sprite-based world rendering for the game.
 * Presentation/Rendering layer - manages agent sprites, items, obstacles,
 * animations, and their lifecycle.
 * 
 * Responsibilities:
 * - Agent sprite creation, animation, and positioning
 * - Item sprite management
 * - Obstacle (rock) sprite rendering
 * - Tile background rendering
 * - Animation state management
 * 
 * Does NOT handle:
 * - Game state (managed by GameState)
 * - Business logic (managed by GameController)
 * - Camera control (managed by CameraManager)
 * - UI components (managed by UICoordinator)
 */
export class WorldRenderer {
  private scene: Phaser.Scene;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;

  // Sprite maps
  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();
  private obstacleSprites = new Map<string, Phaser.GameObjects.Sprite>();
  
  // Tile background
  private tileBackground: Phaser.GameObjects.TileSprite | null = null;
  
  // Animation state
  private animCreated = false;

  /**
   * Constructor: Only store dependencies, no side effects
   * @param scene - Phaser scene instance
   * @param uiCamera - UI camera that should ignore world objects
   */
  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this.uiCamera = uiCamera;
  }

  /**
   * Initialize the renderer
   * Called after scene.create() when all systems are ready
   */
  initialize(): void {
    // No initial setup needed - rendering happens on-demand
    // Animations will be created lazily when first agent sprite is created
  }

  /**
   * Register a newly created game object with the uiCamera (so uiCamera ignores it).
   * Call this for any dynamically created world objects (sprites, images, etc.)
   */
  private registerGameObject(obj: Phaser.GameObjects.GameObject): void {
    this.uiCamera.ignore(obj);
  }

  /**
   * Create tile background based on tilemap dimensions
   * @param tileMap - TileMap from server
   */
  createTileBackground(tileMap: TileMap): void {
    if (!this.tileBackground) {
      const worldWidth = tileMap.width * CELL_SIZE;
      const worldHeight = tileMap.height * CELL_SIZE;
      this.tileBackground = this.scene.add.tileSprite(
        0, 0,
        worldWidth, worldHeight,
        ASSETS.IMAGES.Tile.KEY,
      ).setOrigin(0, 0);
      // Make uiCamera ignore the tile background so it's only rendered by worldCamera
      this.registerGameObject(this.tileBackground);
    }
  }

  /**
   * Draw obstacles based on tilemap
   * @param tileMap - TileMap from server
   */
  drawObstacles(tileMap: TileMap): void {
    // Clear old obstacles
    for (const sprite of this.obstacleSprites.values()) {
      sprite.destroy();
    }
    this.obstacleSprites.clear();

    // Draw new obstacles
    for (let gridY = 0; gridY < tileMap.height; gridY++) {
      for (let gridX = 0; gridX < tileMap.width; gridX++) {
        const tile = tileMap.tiles[gridY][gridX];
        if (tile.type === TileType.Blocked) {
          // Convert grid coordinates to world coordinates
          const worldPos = CoordinateUtils.gridToWorld({ gridX, gridY }, CELL_SIZE);
          const sprite = this.scene.add.sprite(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.ROCK2);
          sprite.setOrigin(0.5, 0.5); // Explicit origin
          this.registerGameObject(sprite);
          this.obstacleSprites.set(`${gridX},${gridY}`, sprite);
        }
      }
    }
  }

  /**
   * Update agent sprites based on current game state
   * @param agents - Map of all agents from GameState
   * @param motionStates - Map of agent display states for interpolated positions
   */
  updateAgentSprites(
    agents: Map<number, AgentFullState>,
    motionStates: Map<number, AgentDisplayState>
  ): void {
    for (const [id, displayState] of motionStates) {
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
        this.registerGameObject(sprite);
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

      // Convert grid coordinates to world coordinates (center of cell)
      const gridPos = { gridX: displayState.displayX, gridY: displayState.displayY };
      const worldPos = CoordinateUtils.gridToWorld(gridPos, CELL_SIZE);
      sprite.setPosition(worldPos.worldX, worldPos.worldY);

      // Ensure sprite origin is centered (explicit for clarity)
      if (!sprite.originX || sprite.originX !== 0.5 || sprite.originY !== 0.5) {
        sprite.setOrigin(0.5, 0.5);
      }

      // Debug logging for first agent (to avoid spam)
      if (id === Array.from(motionStates.keys())[0]) {
        console.log('🎮 Agent Sprite Position Debug:', {
          agentId: id,
          gridPos,
          worldPos,
          CELL_SIZE,
          spritePos: { x: sprite.x, y: sprite.y },
          spriteOrigin: { x: sprite.originX, y: sprite.originY },
        });
      }
    }

    // Clean up sprites for dead/removed agents
    for (const id of this.agentSprites.keys()) {
      const hasDisplay = motionStates.has(id);
      const alive = agents.get(id)?.alive;
      if (!hasDisplay || !alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
      }
    }
  }

  /**
   * Draw items on the map
   * @param items - Array of item states from GameState
   */
  drawItems(items: ItemState[]): void {
    // Filter out any null/undefined items
    const validItems = items.filter((item): item is NonNullable<typeof item> => item != null);
    const currentItemIds = new Set(validItems.map((item) => item.id));
    
    for (const item of validItems) {
      // item.x and item.y are in GRID coordinates
      const worldPos = CoordinateUtils.gridToWorld(
        { gridX: item.x, gridY: item.y },
        CELL_SIZE
      );
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        sprite = this.scene.add.image(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.GOLD_RESOURCE);
        sprite.setOrigin(0.5, 0.5); // Explicit origin
        this.registerGameObject(sprite);
        this.itemSprites.set(item.id, sprite);
      } else {
        sprite.setPosition(worldPos.worldX, worldPos.worldY);
      }
    }
    
    // Clean up sprites for removed items
    for (const itemId of this.itemSprites.keys()) {
      if (!currentItemIds.has(itemId)) {
        this.itemSprites.get(itemId)?.destroy();
        this.itemSprites.delete(itemId);
      }
    }
  }

  /**
   * Create Phaser animations for agent sprites
   * Called lazily when first agent sprite is created
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
   * Get animation key based on agent action state and movement
   * @param actionState - Agent's current action state
   * @param isMoving - Whether agent is moving
   * @returns Animation key string
   */
  private getAnimationForState(actionState: AgentActionState, isMoving: boolean): string {
    if (actionState === AgentActionState.Fighting) return "attack-anim";
    if (isMoving) return "walk-anim";
    return "idle-anim";
  }

  /**
   * Safely play animation on sprite, with guards for destroyed sprites
   * @param sprite - Sprite to play animation on
   * @param animKey - Animation key
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
   * Get sprite direction from movement delta
   * @param fromX - Starting X position
   * @param toX - Target X position
   * @returns Direction enum value
   */
  private getDirectionFromMovement(fromX: number, toX: number): Direction {
    return toX < fromX ? SpriteDirection.Left : SpriteDirection.Right;
  }

  /**
   * Cleanup all sprites and resources
   * Called on scene shutdown
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

    // Destroy tile background
    if (this.tileBackground) {
      this.tileBackground.destroy();
      this.tileBackground = null;
    }
  }
}
