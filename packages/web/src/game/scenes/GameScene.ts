import type { AgentFullState, Waypoint } from "@battle-royale/shared";
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

export { CELL_SIZE } from "./gameConstants";

export class GameScene extends Phaser.Scene {
  // ── Infrastructure ──────────────────────────────────────────────────────────
  private networkService!: NetworkService;

  // ── Domain ──────────────────────────────────────────────────────────────────
  private gameState!: GameState;
  private motionState!: MotionState;

  // ── Camera ──────────────────────────────────────────────────────────────────
  private cameraManager!: CameraManager;

  // ── Application ─────────────────────────────────────────────────────────────
  private gameController!: GameController;

  // ── Rendering ───────────────────────────────────────────────────────────────
  private worldRenderer!: WorldRenderer;

  // ── Presentation ────────────────────────────────────────────────────────────
  private uiCoordinator!: UICoordinator;

  // ── Input state ─────────────────────────────────────────────────────────────
  private lastClickTime = 0;
  private lastClickedAgentId: number | null = null;
  private readonly DOUBLE_CLICK_DELAY = 300;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    this.load.image(ASSETS.IMAGES.ROCK2, "/assets/Terrain/Decorations/Rocks/Rock2.png");
    this.load.image(
      ASSETS.IMAGES.GOLD_RESOURCE,
      "/assets/Terrain/Resources/Gold/GoldResource/Gold_Resource.png",
    );
    this.load.spritesheet(ASSETS.IMAGES.WARRIOR_RUN.KEY, ASSETS.IMAGES.WARRIOR_RUN.PATH, {
      frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH,
      frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT,
    });
    this.load.spritesheet(ASSETS.IMAGES.WARRIOR_ATTACK.KEY, ASSETS.IMAGES.WARRIOR_ATTACK.PATH, {
      frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH,
      frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT,
    });
    this.load.spritesheet(ASSETS.IMAGES.WARRIOR_IDLE.KEY, ASSETS.IMAGES.WARRIOR_IDLE.PATH, {
      frameWidth: ASSETS.IMAGES.WARRIOR_IDLE.WIDTH,
      frameHeight: ASSETS.IMAGES.WARRIOR_IDLE.HEIGHT,
    });
    this.load.image(ASSETS.IMAGES.Tile.KEY, ASSETS.IMAGES.Tile.PATH);
  }

  create(): void {
    // 1. Infrastructure layer
    this.networkService = new NetworkService();

    // 2. Domain layer
    this.gameState = new GameState(this.networkService);
    this.motionState = new MotionState();

    // 3. Camera (creates both world camera and UI overlay camera)
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height);
    this.cameraManager = new CameraManager(this, this.motionState);
    this.cameraManager.initialize();

    // 4. Application layer
    this.gameController = new GameController(this.gameState, this.networkService);

    // 5. World rendering layer
    this.worldRenderer = new WorldRenderer(
      this,
      this.gameState,
      this.motionState,
      this.cameraManager,
    );
    this.worldRenderer.create();

    // 6. Presentation layer (UI)
    this.uiCoordinator = new UICoordinator(
      this,
      this.gameController,
      this.cameraManager,
      this.motionState,
      this.cameraManager.getWorldCamera(),
    );
    this.uiCoordinator.create();

    // 7. Input
    this.setupInputHandlers();

    // 8. Bridge: forward server state changes to MotionState
    this.setupStateListeners();

    // 9. Connect to server
    this.networkService.connect();
  }

  update(time: number, delta: number): void {
    const selectedAgent = this.gameState.getSelectedAgent();

    // Update world camera (keyboard pan, follow mode)
    this.cameraManager.update(this.getFollowTargetGridPos());

    // Sync PiP camera to selected agent position
    if (this.cameraManager.isDualCameraEnabled() && selectedAgent?.alive) {
      const displayState = this.motionState.getDisplayState(selectedAgent.id);
      const gridPos: GridCoord = displayState
        ? { gridX: displayState.displayX, gridY: displayState.displayY }
        : { gridX: selectedAgent.x, gridY: selectedAgent.y };
      const worldPos = CoordinateUtils.gridToWorld(gridPos, CELL_SIZE);
      this.cameraManager.setPipCameraTarget(worldPos.worldX, worldPos.worldY);
    }

    // Advance motion interpolation
    this.motionState.tick(delta, this.gameState.getAgents());

    // Render world objects
    this.worldRenderer.update();

    // Update all UI components
    this.uiCoordinator.update(time, delta);
  }

  shutdown(): void {
    this.gameState.off("state:agents:updated", this.onServerAgentsUpdated, this);
    this.gameState.off("state:paths:updated", this.onServerPathsUpdated, this);

    this.cameraManager.destroy();
    this.worldRenderer.destroy();
    this.uiCoordinator.destroy();
    this.motionState.destroy();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private setupInputHandlers(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.handleClick(pointer.x, pointer.y);
      }
    });
  }

  /**
   * Bridge server agent/path updates into MotionState so motion interpolation
   * stays in sync. All rendering is handled by WorldRenderer via MotionState events.
   */
  private setupStateListeners(): void {
    this.gameState.on("state:agents:updated", this.onServerAgentsUpdated, this);
    this.gameState.on("state:paths:updated", this.onServerPathsUpdated, this);
  }

  private onServerAgentsUpdated(agents: Map<number, AgentFullState>): void {
    this.motionState.updateFromServer(agents, this.gameState.getAgentPaths());
  }

  private onServerPathsUpdated(paths: Record<number, Waypoint[]>): void {
    this.motionState.updateFromServer(this.gameState.getAgents(), paths);
  }

  private getFollowTargetGridPos(): GridCoord | null {
    const agentId = this.cameraManager.getFollowingAgentId();
    if (!agentId) return null;
    const displayState = this.motionState.getDisplayState(agentId);
    if (displayState) return { gridX: displayState.displayX, gridY: displayState.displayY };
    const agent = this.gameState.getAgents().get(agentId);
    return agent ? { gridX: agent.x, gridY: agent.y } : null;
  }

  private handleClick(screenX: number, screenY: number): void {
    const clickGridPos = this.cameraManager.screenToGrid(screenX, screenY);
    const agents = this.gameState.getAgents();

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of agents) {
      if (!agent.alive) continue;
      const displayState = this.motionState.getDisplayState(agent.id);
      const agentGridPos: GridCoord = displayState
        ? { gridX: displayState.displayX, gridY: displayState.displayY }
        : { gridX: agent.x, gridY: agent.y };
      const dist = CoordinateUtils.gridDistance(clickGridPos, agentGridPos);
      if (dist <= 1 && (!closest || dist < closest.dist)) {
        closest = { id: agent.id, dist };
      }
    }

    if (!closest) return;

    const now = Date.now();
    const isDoubleClick =
      this.lastClickedAgentId === closest.id && now - this.lastClickTime < this.DOUBLE_CLICK_DELAY;

    if (isDoubleClick) {
      this.cameraManager.followAgent(closest.id, 1.5);
      this.lastClickTime = 0;
      this.lastClickedAgentId = null;
    } else {
      this.gameController.selectAgent(closest.id);
      this.lastClickTime = now;
      this.lastClickedAgentId = closest.id;
    }
  }

  // ─── Debug accessors ────────────────────────────────────────────────────────

  getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getNetworkService(): NetworkService {
    return this.networkService;
  }

  getUICoordinator(): UICoordinator {
    return this.uiCoordinator;
  }
}
