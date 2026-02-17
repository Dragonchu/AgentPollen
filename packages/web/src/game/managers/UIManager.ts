import * as Phaser from "phaser";
import { GameStateManager } from "./GameStateManager";
import { NetworkManager } from "./NetworkManager";
import { CameraManager } from "./CameraManager";
import { AgentDisplayStateManager } from "../scenes/AgentDisplayStateManager";
import { BaseUI } from "../ui/BaseUI";
import { HeaderUI } from "../ui/HeaderUI";
import { EventFeedUI } from "../ui/EventFeedUI";
import { SidebarUI } from "../ui/SidebarUI";
import { AgentStatsUI } from "../ui/AgentStatsUI";
import { VotePanelUI } from "../ui/VotePanelUI";
import { AIThinkingUI } from "../ui/AIThinkingUI";
import { CameraControlUI } from "../ui/CameraControlUI";

/**
 * UIManager manages all UI components for the game.
 * It subscribes to state changes and updates UI components accordingly.
 * Uses percentage-based layout for responsive sizing.
 */
export class UIManager {
  private scene: Phaser.Scene;
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;
  private cameraManager: CameraManager;
  private displayStateManager: AgentDisplayStateManager;
  private worldCamera: Phaser.Cameras.Scene2D.Camera;
  private uiComponents: Map<string, BaseUI> = new Map();
  private unsubscribeFunctions: Array<() => void> = [];

  // Canvas dimensions (will be set in create)
  private canvasWidth = 1280;
  private canvasHeight = 720;

  // Cached layout dimensions
  private sidebarWidth = 180;
  private headerHeight = 44;
  private rightPanelWidth = 260;
  private padding = 8;

  constructor(
    scene: Phaser.Scene,
    stateManager: GameStateManager,
    networkManager: NetworkManager,
    cameraManager: CameraManager,
    displayStateManager: AgentDisplayStateManager,
    worldCamera: Phaser.Cameras.Scene2D.Camera
  ) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.networkManager = networkManager;
    this.cameraManager = cameraManager;
    this.displayStateManager = displayStateManager;
    this.worldCamera = worldCamera;
  }

  /**
   * Create all UI components
   */
  create(): void {
    // Get canvas dimensions
    this.canvasWidth = this.scene.scale.width;
    this.canvasHeight = this.scene.scale.height;

    // Calculate responsive layout dimensions (percentage-based)
    this.sidebarWidth = Math.max(180, Math.floor(this.canvasWidth * 0.15));
    this.headerHeight = Math.max(44, Math.floor(this.canvasHeight * 0.06));
    this.rightPanelWidth = Math.max(260, Math.floor(this.canvasWidth * 0.2));
    this.padding = 8;

    const wc = this.worldCamera;

    // Create header
    const headerUI = new HeaderUI(
      this.scene,
      this.canvasWidth / 2,
      this.headerHeight / 2,
      this.canvasWidth,
      this.headerHeight,
      this.stateManager,
      wc
    );
    headerUI.create();
    this.uiComponents.set("header", headerUI);

    // Create sidebar
    const sidebarX = this.sidebarWidth / 2;
    const sidebarY = this.headerHeight + (this.canvasHeight - this.headerHeight) / 2;
    const sidebarHeight = this.canvasHeight - this.headerHeight;

    const sidebarUI = new SidebarUI(
      this.scene,
      sidebarX,
      sidebarY,
      this.sidebarWidth,
      sidebarHeight,
      this.stateManager,
      this.networkManager,
      wc
    );
    sidebarUI.create();
    this.uiComponents.set("sidebar", sidebarUI);

    // Create right panel components
    const rightPanelX = this.canvasWidth - this.rightPanelWidth / 2;
    const rightPanelY = this.headerHeight;
    const rightPanelHeight = this.canvasHeight - this.headerHeight;

    // Vote panel (top right)
    const votePanelHeight = Math.floor(rightPanelHeight * 0.3);
    const votePanelUI = new VotePanelUI(
      this.scene,
      rightPanelX,
      rightPanelY + votePanelHeight / 2,
      this.rightPanelWidth - this.padding,
      votePanelHeight - this.padding,
      this.stateManager,
      this.networkManager,
      wc
    );
    votePanelUI.create();
    this.uiComponents.set("votePanel", votePanelUI);

    // Agent stats (middle right)
    const statsHeight = Math.floor(rightPanelHeight * 0.25);
    const statsY = rightPanelY + votePanelHeight + statsHeight / 2;
    const agentStatsUI = new AgentStatsUI(
      this.scene,
      rightPanelX,
      statsY,
      this.rightPanelWidth - this.padding,
      statsHeight - this.padding,
      this.stateManager,
      wc
    );
    agentStatsUI.create();
    this.uiComponents.set("agentStats", agentStatsUI);

    // Event feed (bottom right)
    const eventFeedY = rightPanelY + votePanelHeight + statsHeight;
    const eventFeedHeight = rightPanelHeight - votePanelHeight - statsHeight;
    const eventFeedUI = new EventFeedUI(
      this.scene,
      rightPanelX,
      eventFeedY + eventFeedHeight / 2,
      this.rightPanelWidth - this.padding,
      eventFeedHeight - this.padding,
      this.stateManager,
      wc
    );
    eventFeedUI.create();
    this.uiComponents.set("eventFeed", eventFeedUI);

    // AI Thinking (bubble above selected agent - position passed as 0,0, size unused)
    const aiThinkingUI = new AIThinkingUI(
      this.scene,
      0,
      0,
      260,
      70,
      this.stateManager,
      this.networkManager,
      this.cameraManager,
      this.displayStateManager,
      wc
    );
    aiThinkingUI.create();
    this.uiComponents.set("aiThinking", aiThinkingUI);

    // Camera Control (top-left below header)
    const cameraControlWidth = 140;
    const cameraControlHeight = 32;
    const cameraControlX = this.sidebarWidth + this.padding + cameraControlWidth / 2;
    const cameraControlY = this.headerHeight + this.padding + cameraControlHeight / 2;

    const cameraControlUI = new CameraControlUI(
      this.scene,
      cameraControlX,
      cameraControlY,
      cameraControlWidth,
      cameraControlHeight,
      this.cameraManager,
      wc
    );
    cameraControlUI.create();
    this.uiComponents.set("cameraControl", cameraControlUI);

    this.setupStateListeners();
  }

  /**
   * Update all UI components each frame
   */
  update(time: number, delta: number): void {
    for (const component of this.uiComponents.values()) {
      component.update(time, delta);
    }
  }

  /**
   * Check if a screen-space pointer position is over any UI region.
   * Used by CameraManager to prevent zoom when scrolling UI.
   */
  isPointerOverUI(screenX: number, screenY: number): boolean {
    // Header (full width, top)
    if (screenY < this.headerHeight) return true;

    // Sidebar (left)
    if (screenX < this.sidebarWidth && screenY >= this.headerHeight) return true;

    // Right panel
    if (screenX > this.canvasWidth - this.rightPanelWidth && screenY >= this.headerHeight) return true;

    return false;
  }

  /**
   * Setup listeners for state changes
   */
  private setupStateListeners(): void {
    // Listen to world updates
    const unsubWorld = this.stateManager.on("state:world:updated", (_world) => {
      this.onWorldUpdated();
    });
    this.unsubscribeFunctions.push(unsubWorld);

    // Listen to agent updates
    const unsubAgents = this.stateManager.on("state:agents:updated", (_agents) => {
      this.onAgentsUpdated();
    });
    this.unsubscribeFunctions.push(unsubAgents);

    // Listen to event updates
    const unsubEvents = this.stateManager.on("state:events:updated", (_events) => {
      this.onEventsUpdated();
    });
    this.unsubscribeFunctions.push(unsubEvents);

    // Listen to vote updates
    const unsubVotes = this.stateManager.on("state:votes:updated", (_votes) => {
      this.onVotesUpdated();
    });
    this.unsubscribeFunctions.push(unsubVotes);

    // Listen to agent selection
    const unsubSelected = this.stateManager.on("state:agent:selected", (_agent) => {
      this.onAgentSelected();
    });
    this.unsubscribeFunctions.push(unsubSelected);

    // Listen to thinking history updates
    const unsubThinking = this.stateManager.on("state:thinking:updated", (_history) => {
      this.onThinkingUpdated();
    });
    this.unsubscribeFunctions.push(unsubThinking);
  }

  /**
   * Register a UI component
   */
  registerComponent(name: string, component: BaseUI): void {
    this.uiComponents.set(name, component);
  }

  /**
   * Get a registered component
   */
  getComponent(name: string): BaseUI | undefined {
    return this.uiComponents.get(name);
  }

  /**
   * Remove a registered component
   */
  removeComponent(name: string): void {
    const component = this.uiComponents.get(name);
    if (component) {
      component.destroy();
      this.uiComponents.delete(name);
    }
  }

  /**
   * Destroy all UI components and cleanup
   */
  destroy(): void {
    for (const component of this.uiComponents.values()) {
      component.destroy();
    }
    this.uiComponents.clear();

    for (const unsubscribe of this.unsubscribeFunctions) {
      unsubscribe();
    }
    this.unsubscribeFunctions = [];
  }

  // ============ Event handlers ============

  private onWorldUpdated(): void {
    // Update header, zone, etc.
  }

  private onAgentsUpdated(): void {
    // Update sidebar agent list
  }

  private onEventsUpdated(): void {
    // Update event feed
  }

  private onVotesUpdated(): void {
    // Update vote panel
  }

  private onAgentSelected(): void {
    // Update agent stats, thinking process
  }

  private onThinkingUpdated(): void {
    // Update AI thinking UI
  }

  // ============ Helper methods ============

  /**
   * Get the canvas bounds
   */
  getCanvasBounds(): { width: number; height: number } {
    return {
      width: this.scene.scale.width,
      height: this.scene.scale.height,
    };
  }

  /**
   * Get the playable area bounds (excluding UI)
   */
  getPlayableArea(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.sidebarWidth,
      y: this.headerHeight,
      width: this.canvasWidth - this.sidebarWidth - this.rightPanelWidth,
      height: this.canvasHeight - this.headerHeight,
    };
  }
}
