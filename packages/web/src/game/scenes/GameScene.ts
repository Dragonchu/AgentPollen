import type {
  AgentFullState,
  ItemState,
  TileMap,
  Waypoint,
} from "@battle-royale/shared";
import { AgentActionState, TileType } from "@battle-royale/shared";
import * as Phaser from "phaser";
import { SpriteDirection } from "@/constants/Assets";
import { ASSETS } from "@/constants/Assets";
import { AgentDisplayStateManager } from "./AgentDisplayStateManager";
import { CELL_SIZE } from "./gameConstants";
import type {Direction} from "./types";
import {
  type GameSceneRenderState,
} from "./GameSceneRenderer";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";
import { UIManager } from "../managers/UIManager";
import { CameraManager } from "../managers/CameraManager";
import { CoordinateUtils } from "../utils/CoordinateUtils";
import type { GridCoord } from "../types/coordinates";

// Export CELL_SIZE for external use (GRID_SIZE is now dynamic from backend)
export { CELL_SIZE } from "./gameConstants";

export class GameScene extends Phaser.Scene {
  private stateManager!: GameStateManager;
  private networkManager!: NetworkManager;
  private uiManager!: UIManager;
  private cameraManager!: CameraManager;

  // Dual camera system
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();

  private readonly displayStateManager = new AgentDisplayStateManager();

  private obstacleSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private tileBackground: Phaser.GameObjects.TileSprite | null = null;
  private animCreated = false;

  // Double-click detection
  private lastClickTime = 0;
  private lastClickedAgentId: number | null = null;
  private readonly DOUBLE_CLICK_DELAY = 300; // ms

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
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
    this.load.image(ASSETS.IMAGES.Tile.KEY, ASSETS.IMAGES.Tile.PATH);
  }

  create(): void {
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
    this.cameraManager = new CameraManager(this);
    this.cameraManager.initialize();
    // Set agent position callback - returns GRID coordinates
    this.cameraManager.setAgentGridPositionCallback((agentId: number): GridCoord | null => {
      const displayState = this.displayStateManager.getDisplayStates().get(agentId);
      if (displayState) {
        // displayX/displayY are in GRID coordinates
        return { gridX: displayState.displayX, gridY: displayState.displayY };
      }
      const agent = this.stateManager.getAgents().get(agentId);
      if (agent) {
        // agent.x/y are in GRID coordinates
        return { gridX: agent.x, gridY: agent.y };
      }
      return null;
    });

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    this.uiCamera.setName("uiCamera");

    this.stateManager = new GameStateManager();
    this.networkManager = new NetworkManager(this.stateManager);

    this.uiManager = new UIManager(
      this,
      this.stateManager,
      this.networkManager,
      this.cameraManager,
      this.displayStateManager,
      this.cameras.main,
    );
    this.uiManager.create();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Only handle clicks if not dragging camera (left button drag is reserved for camera)
      if (pointer.button === 2) {
        this.handleClick(pointer.x, pointer.y);
      }
    });

    // 7. Connect to server and start receiving data
    this.networkManager.connect();

    // 8. Setup state listeners for game rendering
    this.setupStateListeners();
  }

  private getAgentGridPosition(agentId: number | null): GridCoord | null {
    if (!agentId) {
      return null;
    }
    const displayState = this.displayStateManager.getDisplayStates().get(agentId);
    if (displayState) {
      // displayX/displayY are in GRID coordinates
      return { gridX: displayState.displayX, gridY: displayState.displayY };
    }
    const agent = this.stateManager.getAgents().get(agentId);
    if (agent) {
      // agent.x/y are in GRID coordinates
      return { gridX: agent.x, gridY: agent.y };
    }
    return null;
  }

  /**
   * Register a newly created game object with the uiCamera (so uiCamera ignores it).
   * Call this for any dynamically created world objects (sprites, images, etc.)
   */
  private registerGameObject(obj: Phaser.GameObjects.GameObject): void {
    this.uiCamera.ignore(obj);
  }

  private setupStateListeners(): void {
    // Listen to agent updates to redraw
    this.stateManager.on<"state:agents:updated", Map<number, AgentFullState>>(
      "state:agents:updated",
      (agents) => {
        this.displayStateManager.updateFromServer(agents, this.stateManager.getAgentPaths());
        this.redraw();
      }
    );

    // Listen to tilemap updates to draw obstacles and update world dimensions
    this.stateManager.on<"state:tilemap:updated", TileMap>(
      "state:tilemap:updated",
      (tileMap) => {
        // Update camera world dimensions based on tilemap size
        this.cameraManager.setWorldDimensions(tileMap.width, tileMap.height);

        // Create tile background if not already created
        if (!this.tileBackground) {
          const worldWidth = tileMap.width * CELL_SIZE;
          const worldHeight = tileMap.height * CELL_SIZE;
          this.tileBackground = this.add.tileSprite(
            0, 0,
            worldWidth, worldHeight,
            ASSETS.IMAGES.Tile.KEY,
          ).setOrigin(0, 0);
          // Make uiCamera ignore the tile background so it's only rendered by worldCamera
          this.registerGameObject(this.tileBackground);
        }

        // Draw obstacles
        this.drawObstacles(tileMap);
      }
    );

    // Listen to path updates
    this.stateManager.on<"state:paths:updated", Record<number, Waypoint[]>>(
      "state:paths:updated",
      (paths) => {
        this.displayStateManager.updateFromServer(this.stateManager.getAgents(), paths);
      }
    );

    // Listen to agent selection for highlighting
    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (_agent) => {
        this.redraw();
      }
    );
  }

  /**
   * Handle browser window resize
   * Called automatically by Phaser's scale manager
   */
  resize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    // Update main camera viewport
    this.cameras.main.setViewport(0, 0, width, height);

    // Update UI camera viewport
    if (this.uiCamera) {
      this.uiCamera.setViewport(0, 0, width, height);
    }

    // CameraManager.onResize() will be called via scale.on("resize") listener
    // UIManager components will also receive resize events
  }

  update(time: number, delta: number): void {
    const agents = this.stateManager.getAgents();
    const items = this.stateManager.getItems();
    const selectedAgent = this.stateManager.getSelectedAgent();

    // Update camera (handles keyboard panning)
    const gridPos = this.getAgentGridPosition(this.cameraManager.getFollowingAgentId());
    this.cameraManager.update(gridPos);

    // Update PiP camera to follow selected agent
    if (this.cameraManager.isDualCameraEnabled() && selectedAgent && selectedAgent.alive) {
      const displayState = this.displayStateManager.getDisplayStates().get(selectedAgent.id);
      // Get agent grid position (displayX/displayY or agent.x/y are both GRID coordinates)
      const gridPos: GridCoord = displayState
        ? { gridX: displayState.displayX, gridY: displayState.displayY }
        : { gridX: selectedAgent.x, gridY: selectedAgent.y };

      // Convert to world coordinates
      const worldPos = CoordinateUtils.gridToWorld(gridPos, CELL_SIZE);
      this.cameraManager.setPipCameraTarget(worldPos.worldX, worldPos.worldY);
    }

    // Update display state
    this.displayStateManager.tick(delta, agents);

    // Update agent sprites and animations
    this.updateAgentSprites(agents);

    // Draw items
    this.drawItems(items);

    // Draw connections and alliances (currently disabled)
    // const state = this.getRenderState(agents, selectedAgent);
    // this.gameSceneRenderer.drawConnections(state);
    // this.gameSceneRenderer.drawAlliances(state);

    // Update UI manager
    this.uiManager.update(time, delta);
  }

  private updateAgentSprites(agents: Map<number, AgentFullState>): void {
    const displayStates = this.displayStateManager.getDisplayStates();

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
        sprite = this.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
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
      if (id === Array.from(displayStates.keys())[0]) {
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

    for (const id of this.agentSprites.keys()) {
      const hasDisplay = displayStates.has(id);
      const alive = agents.get(id)?.alive;
      if (!hasDisplay || !alive) {
        this.agentSprites.get(id)?.destroy();
        this.agentSprites.delete(id);
      }
    }
  }

  private createAnimations(): void {
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
  }

  private getAnimationForState(actionState: AgentActionState, isMoving: boolean): string {
    if (actionState === AgentActionState.Fighting) return "attack-anim";
    if (isMoving) return "walk-anim";
    return "idle-anim";
  }

  private safePlayAnimation(sprite: Phaser.GameObjects.Sprite | undefined, animKey: string): void {
    // Guard: ensure sprite exists and is not destroyed
    if (!sprite || sprite.scene !== this) {
      return;
    }

    // Only attempt to play animation if it exists
    if (!this.anims.exists(animKey)) {
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

  private getDirectionFromMovement(fromX: number, toX: number): Direction {
    return toX < fromX ? SpriteDirection.Left : SpriteDirection.Right;
  }

  private getRenderState(
    agents: Map<number, AgentFullState>,
    selectedAgent: AgentFullState | null
  ): GameSceneRenderState {
    const world = this.stateManager.getWorld();
    const gridSize = this.stateManager.getGridSize();
    const defaultGridSize = gridSize?.width ?? 100; // Fallback to 100 if not loaded yet

    return {
      agents,
      agentDisplayStates: this.displayStateManager.getDisplayStates(),
      selectedAgentId: selectedAgent?.id ?? null,
      shrinkBorder: world?.shrinkBorder ?? defaultGridSize,
      zoneCenterX: world?.zoneCenterX ?? defaultGridSize / 2,
      zoneCenterY: world?.zoneCenterY ?? defaultGridSize / 2,
    };
  }

  private drawObstacles(tileMap: TileMap): void {
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
          const sprite = this.add.sprite(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.ROCK2);
          sprite.setOrigin(0.5, 0.5); // Explicit origin
          this.registerGameObject(sprite);
          this.obstacleSprites.set(`${gridX},${gridY}`, sprite);
        }
      }
    }
  }

  private drawItems(items: ItemState[]): void {
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
        sprite = this.add.image(worldPos.worldX, worldPos.worldY, ASSETS.IMAGES.GOLD_RESOURCE);
        sprite.setOrigin(0.5, 0.5); // Explicit origin
        this.registerGameObject(sprite);
        this.itemSprites.set(item.id, sprite);
      } else {
        sprite.setPosition(worldPos.worldX, worldPos.worldY);
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
    // Redraw game elements (currently disabled)
    // const agents = this.stateManager.getAgents();
    // const selectedAgent = this.stateManager.getSelectedAgent();
    // const state = this.getRenderState(agents, selectedAgent);
    // this.gameSceneRenderer.drawZone(state);
    // this.gameSceneRenderer.drawConnections(state);
    // this.gameSceneRenderer.drawAlliances(state);
  }

  private handleClick(screenX: number, screenY: number): void {
    // Convert screen coordinates to grid coordinates using CameraManager
    const clickGridPos = this.cameraManager.screenToGrid(screenX, screenY);
    const displayStates = this.displayStateManager.getDisplayStates();
    const agents = this.stateManager.getAgents();

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of agents) {
      if (!agent.alive) continue;
      const displayState = displayStates.get(agent.id);
      // displayX/displayY and agent.x/y are all in GRID coordinates
      const agentGridPos: GridCoord = displayState
        ? { gridX: displayState.displayX, gridY: displayState.displayY }
        : { gridX: agent.x, gridY: agent.y };

      // Calculate Manhattan distance
      const dist = CoordinateUtils.gridDistance(clickGridPos, agentGridPos);
      if (dist <= 1 && (!closest || dist < closest.dist)) {
        closest = { id: agent.id, dist };
      }
    }

    if (closest) {
      const now = Date.now();
      const isDoubleClick =
        this.lastClickedAgentId === closest.id &&
        now - this.lastClickTime < this.DOUBLE_CLICK_DELAY;

      if (isDoubleClick) {
        // Double-click: Follow agent with camera zoom
        this.cameraManager.followAgent(closest.id, 1.5);
        // Reset double-click tracking
        this.lastClickTime = 0;
        this.lastClickedAgentId = null;
      } else {
        // Single-click: Just select agent
        this.networkManager.inspectAgent(closest.id);
        // Track for potential double-click
        this.lastClickTime = now;
        this.lastClickedAgentId = closest.id;
      }
    }
  }

  /**
   * Get the camera manager (for testing/debugging)
   */
  getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  /**
   * Get the state manager (for testing/debugging)
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }

  /**
   * Get the network manager (for testing/debugging)
   */
  getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  /**
   * Get the UI manager (for testing/debugging)
   */
  getUIManager(): UIManager {
    return this.uiManager;
  }

  /**
   * Cleanup on scene shutdown
   */
  shutdown(): void {
    this.cameraManager.destroy();
    this.uiManager.destroy();
  }
}
