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

/** Scale factor applied to 32×32 character sprites for better visibility. */
const AGENT_SPRITE_SCALE = 1.25;

/** Phaser atlas frame keys for 4-directional character animations (GenerativeAgentsCN convention). */
const AGENT_FRAME = {
  down:       "down",
  downWalk:   ["down-walk.000", "down-walk.001", "down-walk.002", "down-walk.003"],
  left:       "left",
  leftWalk:   ["left-walk.000", "left-walk.001", "left-walk.002", "left-walk.003"],
  right:      "right",
  rightWalk:  ["right-walk.000", "right-walk.001", "right-walk.002", "right-walk.003"],
  up:         "up",
  upWalk:     ["up-walk.000", "up-walk.001", "up-walk.002", "up-walk.003"],
};

/** Movement direction derived from dx/dy. */
type FacingDir = "down" | "up" | "left" | "right";

/**
 * WorldRenderer is responsible for all world-space rendering:
 * the Phaser tilemap (village map), item sprites, and agent sprites.
 *
 * Character sprites use the GenerativeAgentsCN atlas format (32×32, 4-directional).
 * The Tiled tilemap replaces the old tileSprite/obstacle approach for faithful
 * visual alignment with the server-side collision map.
 *
 * Obstacle visibility: the Collisions layer is rendered as a semi-transparent
 * overlay so players can see exactly where agents cannot walk.
 */
export class WorldRenderer {
  private readonly scene: Phaser.Scene;
  private readonly gameState: GameState;
  private readonly motionState: MotionState;
  private readonly cameraManager: CameraManager;

  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();
  /** Cached spriteKey per agent — used to detect texture changes on respawn. */
  private agentSpriteKeys = new Map<number, string>();
  /** Last known facing direction per agent — preserved when idle. */
  private agentFacings = new Map<number, FacingDir>();

  /** Phaser tilemap object (village map from GenerativeAgentsCN) */
  private tiledMap: Phaser.Tilemaps.Tilemap | null = null;
  /** Fallback obstacle graphics used when the Phaser tilemap is unavailable. */
  private obstacleGraphics: Phaser.GameObjects.Graphics | null = null;

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
    this.agentSpriteKeys.clear();
    this.agentFacings.clear();

    for (const s of this.itemSprites.values()) s.destroy();
    this.itemSprites.clear();

    if (this.tiledMap) {
      this.tiledMap.destroy();
      this.tiledMap = null;
    }

    if (this.obstacleGraphics) {
      this.obstacleGraphics.destroy();
      this.obstacleGraphics = null;
    }
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  private onTilemapUpdated(tileMap: TileMap): void {
    this.cameraManager.setWorldDimensions(tileMap.width, tileMap.height);

    if (!this.tiledMap) {
      const success = this.buildVillageTilemap();
      if (!success) {
        // Fallback: draw obstacle markers directly from server collision data
        this.drawObstacleFallback(tileMap);
      }
    }
  }

  private onMotionStatesChanged(motionStates: Map<number, AgentDisplayState>): void {
    this.motionStates = motionStates;
  }

  // ─── Village Tilemap (GenerativeAgentsCN) ──────────────────────────────────

  /**
   * Construct the Phaser tilemap from the pre-loaded GenerativeAgentsCN assets.
   * Layer order and tileset names match the original GenerativeAgentsCN frontend.
   * The "Collisions" layer is rendered as a semi-transparent overlay so players
   * can see which tiles are blocked.
   * @returns true if successful, false if assets are unavailable
   */
  private buildVillageTilemap(): boolean {
    if (!this.scene.cache.tilemap.exists(ASSETS.IMAGES.VILLAGE_TILEMAP)) {
      console.warn("[WorldRenderer] Village tilemap not yet loaded – using fallback obstacle rendering.");
      return false;
    }

    const map = this.scene.make.tilemap({ key: ASSETS.IMAGES.VILLAGE_TILEMAP });
    this.tiledMap = map;

    // Add all visual tilesets
    const tilesets = [
      map.addTilesetImage("CuteRPG_Field_B",   ASSETS.IMAGES.TILESET_FIELD_B),
      map.addTilesetImage("CuteRPG_Field_C",   ASSETS.IMAGES.TILESET_FIELD_C),
      map.addTilesetImage("CuteRPG_Harbor_C",  ASSETS.IMAGES.TILESET_HARBOR_C),
      map.addTilesetImage("CuteRPG_Village_B", ASSETS.IMAGES.TILESET_VILLAGE_B),
      map.addTilesetImage("CuteRPG_Forest_B",  ASSETS.IMAGES.TILESET_FOREST_B),
      map.addTilesetImage("CuteRPG_Desert_C",  ASSETS.IMAGES.TILESET_DESERT_C),
      map.addTilesetImage("CuteRPG_Mountains_B", ASSETS.IMAGES.TILESET_MOUNTAINS_B),
      map.addTilesetImage("CuteRPG_Desert_B",  ASSETS.IMAGES.TILESET_DESERT_B),
      map.addTilesetImage("CuteRPG_Forest_C",  ASSETS.IMAGES.TILESET_FOREST_C),
      map.addTilesetImage("Room_Builder_32x32", ASSETS.IMAGES.TILESET_WALLS),
      map.addTilesetImage("interiors_pt1", ASSETS.IMAGES.TILESET_INTERIORS_1),
      map.addTilesetImage("interiors_pt2", ASSETS.IMAGES.TILESET_INTERIORS_2),
      map.addTilesetImage("interiors_pt3", ASSETS.IMAGES.TILESET_INTERIORS_3),
      map.addTilesetImage("interiors_pt4", ASSETS.IMAGES.TILESET_INTERIORS_4),
      map.addTilesetImage("interiors_pt5", ASSETS.IMAGES.TILESET_INTERIORS_5),
    ].filter((t): t is Phaser.Tilemaps.Tileset => t !== null);

    // Visual layers (ordered bottom-to-top as in GenerativeAgentsCN)
    const visualLayers = [
      "Bottom Ground",
      "Exterior Ground",
      "Exterior Decoration L1",
      "Exterior Decoration L2",
      "Interior Ground",
      "Wall",
      "Interior Furniture L1",
      "Interior Furniture L2 ",
      "Foreground L1",
      "Foreground L2",
    ];

    for (const layerName of visualLayers) {
      const layer = map.createLayer(layerName, tilesets, 0, 0);
      if (layer) {
        this.cameraManager.ignoreInUICamera(layer);
        // Foreground layers render above agents
        if (layerName.startsWith("Foreground")) {
          layer.setDepth(2);
        }
      }
    }

    // ── Collisions layer: render as semi-transparent obstacle overlay ──────────
    // The "blocks" tileset name in tilemap.json maps to blocks_1.png.
    // This is the only tileset needed for the Collisions layer.
    const blocksTileset = map.addTilesetImage("blocks", ASSETS.IMAGES.TILESET_BLOCKS);
    if (blocksTileset) {
      const collisionsLayer = map.createLayer("Collisions", blocksTileset, 0, 0);
      if (collisionsLayer) {
        // Semi-transparent overlay so players can see which tiles are blocked
        // without hiding the visual map underneath.
        collisionsLayer.setAlpha(0.35);
        collisionsLayer.setDepth(1);
        this.cameraManager.ignoreInUICamera(collisionsLayer);
      }
    }

    return true;
  }

  /**
   * Fallback: draw semi-transparent rectangles for every blocked tile using
   * the server-provided TileMap. Used when the Phaser village tilemap assets
   * are unavailable.
   */
  private drawObstacleFallback(tileMap: TileMap): void {
    if (this.obstacleGraphics) {
      this.obstacleGraphics.destroy();
    }
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x444466, 0.5);

    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        if (tileMap.tiles[y][x].type === TileType.Blocked) {
          gfx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    gfx.setDepth(1);
    this.cameraManager.ignoreInUICamera(gfx);
    this.obstacleGraphics = gfx;
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  private drawItems(items: ItemState[]): void {
    const validItems = items.filter((item): item is NonNullable<typeof item> => item != null);
    const currentIds = new Set(validItems.map((i) => i.id));

    for (const item of validItems) {
      const worldPos = CoordinateUtils.gridToWorld({ gridX: item.x, gridY: item.y }, CELL_SIZE);
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        sprite = this.scene.add
          .image(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.GOLD_RESOURCE)
          .setOrigin(0.5, 0.5)
          .setScale(0.5)
          .setDepth(1);
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

  // ─── Agent sprites ─────────────────────────────────────────────────────────

  private updateAgentSprites(agents: Map<number, AgentFullState>): void {
    for (const [id, displayState] of this.motionStates) {
      const agent = agents.get(id);
      if (!agent?.alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
        this.agentSpriteKeys.delete(id);
        this.agentFacings.delete(id);
        continue;
      }

      const spriteKey = agent.spriteKey || ASSETS.AGENT_SPRITES[id % ASSETS.AGENT_SPRITES.length];
      const isMoving =
        displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;

      let sprite = this.agentSprites.get(id);

      if (!sprite || this.agentSpriteKeys.get(id) !== spriteKey) {
        // Create (or re-create after spriteKey change)
        sprite?.destroy();
        this.createCharacterAnimations(spriteKey);
        sprite = this.scene.add
          .sprite(0, 0, spriteKey, AGENT_FRAME.down)
          .setScale(AGENT_SPRITE_SCALE)
          .setDepth(1);
        this.cameraManager.ignoreInUICamera(sprite);
        this.agentSprites.set(id, sprite);
        this.agentSpriteKeys.set(id, spriteKey);
      }

      // Determine facing from movement, preserving previous direction when idle
      const prevFacing = this.agentFacings.get(id) ?? "down";
      const facing = this.getFacing(
        displayState.prevX, displayState.prevY,
        displayState.targetX, displayState.targetY,
        prevFacing,
      );
      this.agentFacings.set(id, facing);

      // Play the appropriate animation
      const animKey = this.getAnimKey(spriteKey, facing, isMoving, agent.actionState);
      this.safePlayAnimation(sprite, animKey);

      // Position
      const worldPos = CoordinateUtils.gridToWorld(
        { gridX: displayState.displayX, gridY: displayState.displayY },
        CELL_SIZE,
      );
      sprite.setPosition(worldPos.worldX, worldPos.worldY).setOrigin(0.5, 0.5);
    }

    // Remove sprites for agents no longer tracked or dead
    for (const id of [...this.agentSprites.keys()]) {
      if (!this.motionStates.has(id) || !agents.get(id)?.alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
        this.agentSpriteKeys.delete(id);
        this.agentFacings.delete(id);
      }
    }
  }

  // ─── Animation helpers ──────────────────────────────────────────────────────

  /**
   * Create per-character 4-directional animations if not yet registered.
   * Mirrors the GenerativeAgentsCN animation setup (left/right/up/down walk + idle).
   */
  private createCharacterAnimations(spriteKey: string): void {
    const anims = this.scene.anims;
    const frameRate = 6;

    const dirs: Array<{ dir: FacingDir; frames: string[] }> = [
      { dir: "down",  frames: AGENT_FRAME.downWalk },
      { dir: "left",  frames: AGENT_FRAME.leftWalk },
      { dir: "right", frames: AGENT_FRAME.rightWalk },
      { dir: "up",    frames: AGENT_FRAME.upWalk },
    ];

    for (const { dir, frames } of dirs) {
      const walkKey = `${spriteKey}-${dir}-walk`;
      if (!anims.exists(walkKey)) {
        anims.create({
          key: walkKey,
          frames: frames.map((f) => ({ key: spriteKey, frame: f })),
          frameRate,
          repeat: -1,
        });
      }
    }
  }

  /**
   * Return the animation key for the current state.
   * Fighting and moving agents use the directional walk animation.
   * Dead agents use the down-walk animation as a static "fallen" pose until removed.
   * Idle agents use the down-walk animation for a gentle idle loop.
   */
  private getAnimKey(
    spriteKey: string,
    facing: FacingDir,
    isMoving: boolean,
    actionState: AgentActionState,
  ): string {
    if (actionState === AgentActionState.Dead) return `${spriteKey}-down-walk`;
    if (isMoving || actionState === AgentActionState.Fighting) {
      return `${spriteKey}-${facing}-walk`;
    }
    // Idle: play down-walk animation so the character has a gentle idle loop.
    return `${spriteKey}-down-walk`;
  }

  /**
   * Derive facing direction from previous → target movement.
   * When the agent is stationary (dx=dy=0) the previous direction is preserved
   * so sprites don't snap to a default facing when idle.
   */
  private getFacing(
    prevX: number,
    prevY: number,
    targetX: number,
    targetY: number,
    currentFacing: FacingDir,
  ): FacingDir {
    const dx = targetX - prevX;
    const dy = targetY - prevY;
    // No movement — keep the last known direction
    if (dx === 0 && dy === 0) return currentFacing;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    }
    return dy > 0 ? "down" : "up";
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

  /** @deprecated Legacy helper retained for type compatibility */
  private getDirectionFromMovement(fromX: number, toX: number): Direction {
    return toX < fromX ? SpriteDirection.Left : SpriteDirection.Right;
  }
}
