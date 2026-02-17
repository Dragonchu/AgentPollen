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
import { CELL_SIZE, GRID_SIZE } from "./gameConstants";
import type {Direction} from "./types";
import {
  type GameSceneRenderState,
  GameSceneRenderer,
} from "./GameSceneRenderer";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";
import { UIManager } from "../managers/UIManager";
import { CameraManager } from "../managers/CameraManager";

// 对外保持原有导出，便于 GameCanvas 等调用方使用
export { CELL_SIZE, GRID_SIZE, CANVAS_SIZE } from "./gameConstants";

export class GameScene extends Phaser.Scene {
  private stateManager!: GameStateManager;
  private networkManager!: NetworkManager;
  private uiManager!: UIManager;
  private cameraManager!: CameraManager;

  // Dual camera system
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private allianceGraphics!: Phaser.GameObjects.Graphics;

  private agentSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<number, Phaser.GameObjects.Image>();

  private readonly displayStateManager = new AgentDisplayStateManager();
  private gameSceneRenderer!: GameSceneRenderer;

  private obstacleSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private animCreated = false;

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
  }

  create(): void {
    // 1. Setup dual camera system
    const worldCamera = this.cameras.main;
    const canvasW = this.scale.width;
    const canvasH = this.scale.height;

    // Ensure main camera has proper viewport dimensions
    worldCamera.setViewport(0, 0, canvasW, canvasH);

    // uiCamera renders UI objects at fixed screen position (no pan/zoom)
    this.uiCamera = this.cameras.add(0, 0, canvasW, canvasH);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    this.uiCamera.setName("uiCamera");

    // 2. Initialize managers (but don't initialize camera yet)
    this.stateManager = new GameStateManager();
    this.networkManager = new NetworkManager(this.stateManager);
    this.cameraManager = new CameraManager(this, worldCamera);

    // IMPORTANT: Initialize camera AFTER scale system is ready
    // Use time.delayedCall to ensure scale system has settled
    this.time.delayedCall(0, () => {
      this.cameraManager.initialize();
    });

    this.uiManager = new UIManager(
      this,
      this.stateManager,
      this.networkManager,
      this.cameraManager,
      this.displayStateManager,
      worldCamera
    );

    // 3. Create graphics objects for game scene (world objects)
    this.gridGraphics = this.add.graphics();
    this.zoneGraphics = this.add.graphics();
    this.connectionGraphics = this.add.graphics();
    this.allianceGraphics = this.add.graphics();

    // Make uiCamera ignore all game objects
    this.uiCamera.ignore([this.gridGraphics,this.zoneGraphics,this.connectionGraphics,this.allianceGraphics]);

    this.gameSceneRenderer = new GameSceneRenderer({
      grid: this.gridGraphics,
      zone: this.zoneGraphics,
      connection: this.connectionGraphics,
      alliance: this.allianceGraphics,
    });
    this.gameSceneRenderer.drawGrid();

    // 4. Setup input handling (but don't interfere with camera drag)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Only handle clicks if not dragging camera (left button drag is reserved for camera)
      if (pointer.button === 2) {
        this.handleClick(pointer.x, pointer.y);
      }
    });

    // 5. Initialize UI manager (creates all UI components, which auto-ignore from worldCamera)
    this.uiManager.create();

    // 6. Wire up isPointerOverUI check to CameraManager
    this.cameraManager.setPointerOverUICheck((x, y) => this.uiManager.isPointerOverUI(x, y));

    // 7. Connect to server and start receiving data
    this.networkManager.connect();

    // 8. Setup state listeners for game rendering
    this.setupStateListeners();
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

    // Listen to tilemap updates to draw obstacles
    this.stateManager.on<"state:tilemap:updated", TileMap>(
      "state:tilemap:updated",
      (tileMap) => {
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
    this.cameraManager.update();

    // Update PiP camera to follow selected agent
    if (this.cameraManager.isDualCameraEnabled() && selectedAgent && selectedAgent.alive) {
      const displayState = this.displayStateManager.getDisplayStates().get(selectedAgent.id);
      const targetX = displayState ? displayState.displayX * CELL_SIZE + CELL_SIZE / 2 : selectedAgent.x * CELL_SIZE + CELL_SIZE / 2;
      const targetY = displayState ? displayState.displayY * CELL_SIZE + CELL_SIZE / 2 : selectedAgent.y * CELL_SIZE + CELL_SIZE / 2;
      this.cameraManager.setPipCameraTarget(targetX, targetY);
    }

    // Update display state
    this.displayStateManager.tick(delta, agents);

    // Update agent sprites and animations
    this.updateAgentSprites(agents);

    // Draw items
    this.drawItems(items);

    // Draw connections and alliances
    const state = this.getRenderState(agents, selectedAgent);
    this.gameSceneRenderer.drawConnections(state);
    this.gameSceneRenderer.drawAlliances(state);

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

      const px = displayState.displayX * CELL_SIZE + CELL_SIZE / 2;
      const py = displayState.displayY * CELL_SIZE + CELL_SIZE / 2;
      sprite.setPosition(px, py);
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
    return {
      agents,
      agentDisplayStates: this.displayStateManager.getDisplayStates(),
      selectedAgentId: selectedAgent?.id ?? null,
      shrinkBorder: world?.shrinkBorder ?? GRID_SIZE,
      zoneCenterX: world?.zoneCenterX ?? GRID_SIZE / 2,
      zoneCenterY: world?.zoneCenterY ?? GRID_SIZE / 2,
    };
  }

  private drawObstacles(tileMap: TileMap): void {
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
          const sprite = this.add.sprite(px, py, ASSETS.IMAGES.ROCK2);
          this.registerGameObject(sprite);
          this.obstacleSprites.set(`${x},${y}`, sprite);
        }
      }
    }
  }

  private drawItems(items: ItemState[]): void {
    // Filter out any null/undefined items
    const validItems = items.filter((item): item is NonNullable<typeof item> => item != null);
    const currentItemIds = new Set(validItems.map((item) => item.id));
    for (const item of validItems) {
      const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.y * CELL_SIZE + CELL_SIZE / 2;
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        sprite = this.add.image(cx, cy, ASSETS.IMAGES.GOLD_RESOURCE);
        this.registerGameObject(sprite);
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
    const agents = this.stateManager.getAgents();
    const selectedAgent = this.stateManager.getSelectedAgent();
    const state = this.getRenderState(agents, selectedAgent);
    this.gameSceneRenderer.drawZone(state);
    this.gameSceneRenderer.drawConnections(state);
    this.gameSceneRenderer.drawAlliances(state);
  }

  private handleClick(screenX: number, screenY: number): void {
    // Convert screen coordinates to grid coordinates using CameraManager
    const { gx, gy } = this.cameraManager.screenToGrid(screenX, screenY);
    const displayStates = this.displayStateManager.getDisplayStates();
    const agents = this.stateManager.getAgents();

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of agents) {
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
      this.networkManager.inspectAgent(closest.id);
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
