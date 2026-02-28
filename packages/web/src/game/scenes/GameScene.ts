import type { AgentFullState, Waypoint } from '@battle-royale/shared';
import * as Phaser from 'phaser';
import { ASSETS } from '@/constants/Assets';
import { MotionState } from '../managers/MotionState';
import { CELL_SIZE } from './gameConstants';
import { GameState } from '../managers/GameState';
import { NetworkService } from '../managers/NetworkService';
import { GameController } from '../managers/GameController';
import { UICoordinator } from '../managers/UICoordinator';
import { CameraManager } from '../managers/CameraManager';
import { WorldRenderer } from '../managers/WorldRenderer';
import { CoordinateUtils } from '../utils/CoordinateUtils';
import type { GridCoord } from '../types/coordinates';

export { CELL_SIZE } from './gameConstants';

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
    super({ key: 'GameScene' });
  }

  preload(): void {
    const BASE = '/assets/village';

    // ── Village tilemap (GenerativeAgentsCN) ──────────────────────────────────
    this.load.tilemapTiledJSON(ASSETS.IMAGES.VILLAGE_TILEMAP, `${BASE}/tilemap/tilemap.json`);

    // Tilesets
    this.load.image(ASSETS.IMAGES.TILESET_FIELD_B, `${BASE}/tilemap/CuteRPG_Field_B.png`);
    this.load.image(ASSETS.IMAGES.TILESET_FIELD_C, `${BASE}/tilemap/CuteRPG_Field_C.png`);
    this.load.image(ASSETS.IMAGES.TILESET_HARBOR_C, `${BASE}/tilemap/CuteRPG_Harbor_C.png`);
    this.load.image(ASSETS.IMAGES.TILESET_VILLAGE_B, `${BASE}/tilemap/CuteRPG_Village_B.png`);
    this.load.image(ASSETS.IMAGES.TILESET_FOREST_B, `${BASE}/tilemap/CuteRPG_Forest_B.png`);
    this.load.image(ASSETS.IMAGES.TILESET_DESERT_C, `${BASE}/tilemap/CuteRPG_Desert_C.png`);
    this.load.image(ASSETS.IMAGES.TILESET_MOUNTAINS_B, `${BASE}/tilemap/CuteRPG_Mountains_B.png`);
    this.load.image(ASSETS.IMAGES.TILESET_DESERT_B, `${BASE}/tilemap/CuteRPG_Desert_B.png`);
    this.load.image(ASSETS.IMAGES.TILESET_FOREST_C, `${BASE}/tilemap/CuteRPG_Forest_C.png`);
    this.load.image(ASSETS.IMAGES.TILESET_WALLS, `${BASE}/tilemap/Room_Builder_32x32.png`);
    this.load.image(ASSETS.IMAGES.TILESET_BLOCKS, `${BASE}/tilemap/blocks_1.png`);
    this.load.image(ASSETS.IMAGES.TILESET_INTERIORS_1, `${BASE}/tilemap/interiors_pt1.png`);
    this.load.image(ASSETS.IMAGES.TILESET_INTERIORS_2, `${BASE}/tilemap/interiors_pt2.png`);
    this.load.image(ASSETS.IMAGES.TILESET_INTERIORS_3, `${BASE}/tilemap/interiors_pt3.png`);
    this.load.image(ASSETS.IMAGES.TILESET_INTERIORS_4, `${BASE}/tilemap/interiors_pt4.png`);
    this.load.image(ASSETS.IMAGES.TILESET_INTERIORS_5, `${BASE}/tilemap/interiors_pt5.png`);

    // ── Character sprite atlases (GenerativeAgentsCN, 32×32, 4-directional) ──
    const atlasJson = ASSETS.SPRITE_ATLAS_JSON;
    for (const name of ASSETS.AGENT_SPRITES) {
      this.load.atlas(name, `${BASE}/agents/${name}/texture.png`, atlasJson);
    }

    // ── Legacy item sprite (gold resource) ───────────────────────────────────
    this.load.image(
      ASSETS.IMAGES.GOLD_RESOURCE,
      '/assets/Terrain/Resources/Gold/GoldResource/Gold_Resource.png',
    );
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

    this.cameraManager.setPointerOverUICheck((x, y) => this.uiCoordinator.isPointerOverUI(x, y));

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
    this.gameState.off('state:agents:updated', this.onServerAgentsUpdated, this);
    this.gameState.off('state:paths:updated', this.onServerPathsUpdated, this);

    this.cameraManager.destroy();
    this.worldRenderer.destroy();
    this.uiCoordinator.destroy();
    this.motionState.destroy();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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
    this.gameState.on('state:agents:updated', this.onServerAgentsUpdated, this);
    this.gameState.on('state:paths:updated', this.onServerPathsUpdated, this);
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
