import type {
  AgentFullState,
  TileMap,
  Waypoint,
} from "@battle-royale/shared";
import * as Phaser from "phaser";
import { ASSETS } from "@/constants/Assets";
import { MotionState } from "../managers/MotionState";
import { CELL_SIZE } from "./gameConstants";
import { GameState } from "../managers/GameState";
import { NetworkService } from "../managers/NetworkService";
import { GameController } from "../managers/GameController";
import { UICoordinator } from "../managers/UICoordinator";
import { CameraManager } from "../managers/CameraManager";
import { WorldRenderer } from "../managers/WorldRenderer";
import { CoordinateUtils } from "../utils/CoordinateUtils";
import type { GridCoord } from "../types/coordinates";

// Export CELL_SIZE for external use (GRID_SIZE is now dynamic from backend)
export { CELL_SIZE } from "./gameConstants";

export class GameScene extends Phaser.Scene {
  private networkService!: NetworkService;
  private gameState!: GameState;
  private gameController!: GameController;
  private uiCoordinator!: UICoordinator;
  private cameraManager!: CameraManager;
  private worldRenderer!: WorldRenderer;

  private readonly motionState = new MotionState();

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
    
    // Initialize managers in correct dependency order:
    // All managers use consistent initialize() method pattern
    // Constructors only store dependencies (no side effects)
    
    // 1. CameraManager (manages main camera, UI camera, PiP camera)
    this.cameraManager = new CameraManager(this, this.motionState);
    this.cameraManager.initialize();
    
    // Get UI camera from CameraManager
    const uiCamera = this.cameraManager.getUICamera();
    if (!uiCamera) {
      throw new Error("UI camera not initialized by CameraManager");
    }

    // 2. WorldRenderer (Rendering layer - depends on uiCamera)
    this.worldRenderer = new WorldRenderer(this, uiCamera);
    this.worldRenderer.initialize();

    // 3. NetworkService (Infrastructure layer - no dependencies)
    this.networkService = new NetworkService();

    // 4. GameState (Domain/State layer - depends on NetworkService)
    this.gameState = new GameState(this.networkService);

    // 5. GameController (Application/Business Logic layer - depends on GameState & NetworkService)
    this.gameController = new GameController(this.gameState, this.networkService);

    // 6. UICoordinator (Presentation layer - depends on GameController and other managers)
    this.uiCoordinator = new UICoordinator(
      this,
      this.gameController,
      this.cameraManager,
      this.motionState,
      this.cameras.main,
    );
    this.uiCoordinator.create();

    // Setup input handling (through GameController)
    this.setupInputHandlers();

    // Connect to server and start receiving data
    this.networkService.connect();

    // Setup state listeners for game rendering
    this.setupStateListeners();
  }

  /**
   * Setup input handlers for pointer interactions
   */
  private setupInputHandlers(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Only handle right clicks (left button is reserved for camera drag)
      if (pointer.button === 2) {
        this.handleClick(pointer.x, pointer.y);
      }
    });
  }

  private getAgentGridPosition(agentId: number | null): GridCoord | null {
    if (!agentId) {
      return null;
    }
    const displayState = this.motionState.getDisplayState(agentId);
    if (displayState) {
      // displayX/displayY are in GRID coordinates
      return { gridX: displayState.displayX, gridY: displayState.displayY };
    }
    const agent = this.gameState.getAgents().get(agentId);
    if (agent) {
      // agent.x/y are in GRID coordinates
      return { gridX: agent.x, gridY: agent.y };
    }
    return null;
  }

  private setupStateListeners(): void {
    // Listen to agent updates to redraw
    this.gameState.on("state:agents:updated", this.onAgentsUpdated, this);

    // Listen to tilemap updates to draw obstacles and update world dimensions
    this.gameState.on("state:tilemap:updated", this.onTilemapUpdated, this);

    // Listen to path updates
    this.gameState.on("state:paths:updated", this.onPathsUpdated, this);

    // Listen to agent selection for highlighting
    this.gameState.on("state:agent:selected", this.onAgentSelected, this);

    // Listen to motion updates
    this.motionState.on("motion:updated", this.onMotionUpdated, this);
    this.motionState.on("motion:frame-updated", this.onMotionFrameUpdated, this);
  }

  private onMotionUpdated(): void {
    // Motion state updated - no action needed in GameScene
    // WorldRenderer will get the updated states in update()
  }

  private onMotionFrameUpdated(): void {
    // Frame-by-frame motion update - no action needed
    // Performance optimization: sprite updates happen in update() method
  }

  private onAgentsUpdated(agents: Map<number, AgentFullState>): void {
    this.motionState.updateFromServer(agents, this.gameState.getAgentPaths());
  }

  private onTilemapUpdated(tileMap: TileMap): void {
    // Update camera world dimensions based on tilemap size
    this.cameraManager.setWorldDimensions(tileMap.width, tileMap.height);

    // Delegate rendering to WorldRenderer
    this.worldRenderer.createTileBackground(tileMap);
    this.worldRenderer.drawObstacles(tileMap);
  }

  private onPathsUpdated(paths: Record<number, Waypoint[]>): void {
    this.motionState.updateFromServer(this.gameState.getAgents(), paths);
  }

  private onAgentSelected(_agent: AgentFullState | null): void {
    // Agent selected - no action needed in GameScene
    // UI components and WorldRenderer will handle the update
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

    // CameraManager.onResize() will be called via scale.on("resize") listener
    // This will update both UI camera and PiP camera viewports
    // UIManager components will also receive resize events
  }

  update(time: number, delta: number): void {
    const agents = this.gameState.getAgents();
    const items = this.gameState.getItems();
    const selectedAgent = this.gameState.getSelectedAgent();

    // Update camera (handles keyboard panning)
    const gridPos = this.getAgentGridPosition(this.cameraManager.getFollowingAgentId());
    this.cameraManager.update(gridPos);

    // Update PiP camera to follow selected agent
    if (this.cameraManager.isDualCameraEnabled() && selectedAgent && selectedAgent.alive) {
      const displayState = this.motionState.getDisplayState(selectedAgent.id);
      // Get agent grid position (displayX/displayY or agent.x/y are both GRID coordinates)
      const gridPos: GridCoord = displayState
        ? { gridX: displayState.displayX, gridY: displayState.displayY }
        : { gridX: selectedAgent.x, gridY: selectedAgent.y };

      // Convert to world coordinates
      const worldPos = CoordinateUtils.gridToWorld(gridPos, CELL_SIZE);
      this.cameraManager.setPipCameraTarget(worldPos.worldX, worldPos.worldY);
    }

    // Update display state (motion interpolation)
    this.motionState.tick(delta, agents);

    // Update agent sprites and animations via WorldRenderer
    const motionStates = this.motionState.getAllDisplayStates();
    this.worldRenderer.updateAgentSprites(agents, motionStates);

    // Draw items via WorldRenderer
    this.worldRenderer.drawItems(items);

    // Update UI manager
    this.uiCoordinator.update(time, delta);
  }

  private handleClick(screenX: number, screenY: number): void {
    // Convert screen coordinates to grid coordinates using CameraManager
    const clickGridPos = this.cameraManager.screenToGrid(screenX, screenY);
    const motionStates = this.motionState.getAllDisplayStates();
    const agents = this.gameState.getAgents();

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of agents) {
      if (!agent.alive) continue;
      const displayState = motionStates.get(agent.id);
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
        // Single-click: Select agent via GameController (business logic layer)
        this.gameController.selectAgent(closest.id);
        // Track for potential double-click
        this.lastClickTime = now;
        this.lastClickedAgentId = closest.id;
      }
    }
  }

  /**
   * Get the world renderer (for testing/debugging)
   */
  getWorldRenderer(): WorldRenderer {
    return this.worldRenderer;
  }

  /**
   * Get the camera manager (for testing/debugging)
   */
  getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  /**
   * Get the game state (for testing/debugging)
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get the network service (for testing/debugging)
   */
  getNetworkService(): NetworkService {
    return this.networkService;
  }

  /**
   * Get the UI coordinator (for testing/debugging)
   */
  getUICoordinator(): UICoordinator {
    return this.uiCoordinator;
  }

  /**
   * Cleanup on scene shutdown
   */
  shutdown(): void {
    // Unsubscribe from all state events
    this.gameState.off("state:agents:updated", this.onAgentsUpdated, this);
    this.gameState.off("state:tilemap:updated", this.onTilemapUpdated, this);
    this.gameState.off("state:paths:updated", this.onPathsUpdated, this);
    this.gameState.off("state:agent:selected", this.onAgentSelected, this);

    // Unsubscribe from motion events
    this.motionState.off("motion:updated", this.onMotionUpdated, this);
    this.motionState.off("motion:frame-updated", this.onMotionFrameUpdated, this);

    // Cleanup managers
    this.cameraManager.destroy();
    this.worldRenderer.destroy();
    this.uiCoordinator.destroy();
    this.motionState.destroy();
  }
}
