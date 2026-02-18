import type {
  AgentFullState,
  TileMap,
  Waypoint,
} from "@battle-royale/shared";
import * as Phaser from "phaser";
import { AgentDisplayStateManager } from "./AgentDisplayStateManager";
import { CELL_SIZE, GRID_SIZE } from "./gameConstants";
import {
  type GameSceneRenderState,
  GameSceneRenderer,
} from "./GameSceneRenderer";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";
import { UIManager } from "../managers/UIManager";
import { CameraManager } from "../managers/CameraManager";
import { WorldRenderer } from "../managers/WorldRenderer";

// 对外保持原有导出，便于 GameCanvas 等调用方使用
export { CELL_SIZE, GRID_SIZE, CANVAS_SIZE } from "./gameConstants";

export class GameScene extends Phaser.Scene {
  private stateManager!: GameStateManager;
  private networkManager!: NetworkManager;
  private uiManager!: UIManager;
  private cameraManager!: CameraManager;
  private worldRenderer!: WorldRenderer;

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private allianceGraphics!: Phaser.GameObjects.Graphics;

  private readonly displayStateManager = new AgentDisplayStateManager();
  private gameSceneRenderer!: GameSceneRenderer;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // 1. Initialize managers
    this.stateManager = new GameStateManager();
    this.networkManager = new NetworkManager(this.stateManager);
    this.cameraManager = new CameraManager(this, this.cameras.main);
    this.worldRenderer = new WorldRenderer(this);
    this.uiManager = new UIManager(this, this.stateManager, this.networkManager, this.cameraManager);

    // 2. Initialize all managers (consistent initialization protocol)
    this.cameraManager.initialize();
    this.worldRenderer.initialize();
    this.uiManager.initialize();

    // 3. Create graphics objects for game scene
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

    // 4. Setup input handling (but don't interfere with camera drag)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Only handle clicks if not dragging camera (left button drag is reserved for camera)
      if (pointer.button === 2) {
        this.handleClick(pointer.x, pointer.y);
      }
    });

    // 5. Connect to server and start receiving data
    this.networkManager.connect();

    // 6. Setup state listeners for game rendering
    this.setupStateListeners();
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
        this.worldRenderer.drawObstacles(tileMap);
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

    // Update world rendering (agents, items)
    const displayStates = this.displayStateManager.getDisplayStates();
    this.worldRenderer.updateAgentSprites(agents, displayStates);
    this.worldRenderer.drawItems(items);

    // Draw connections and alliances
    const state = this.getRenderState(agents, selectedAgent);
    this.gameSceneRenderer.drawConnections(state);
    this.gameSceneRenderer.drawAlliances(state);

    // Update UI manager
    this.uiManager.update(time, delta);
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

  private redraw(): void {
    const agents = this.stateManager.getAgents();
    const selectedAgent = this.stateManager.getSelectedAgent();
    const state = this.getRenderState(agents, selectedAgent);
    this.gameSceneRenderer.drawZone(state);
    this.gameSceneRenderer.drawConnections(state);
    this.gameSceneRenderer.drawAlliances(state);
  }

  private handleClick(px: number, py: number): void {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);
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
    this.worldRenderer.destroy();
    this.uiManager.destroy();
  }
}
