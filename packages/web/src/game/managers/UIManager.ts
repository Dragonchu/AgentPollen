import * as Phaser from "phaser";
import { GameStateManager } from "./GameStateManager";
import { NetworkManager } from "./NetworkManager";
import { CameraManager } from "./CameraManager";
import { AgentMotionManager } from "./AgentMotionManager";
import { BaseUI } from "../ui/BaseUI";
import { HeaderUI } from "../ui/HeaderUI";
import { EventFeedUI } from "../ui/EventFeedUI";
import { SidebarUI } from "../ui/SidebarUI";
import { AgentStatsUI } from "../ui/AgentStatsUI";
import { VotePanelUI } from "../ui/VotePanelUI";
import { AIThinkingUI } from "../ui/AIThinkingUI";

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
  private motionManager: AgentMotionManager;
  private worldCamera: Phaser.Cameras.Scene2D.Camera;
  private uiComponents: Map<string, BaseUI> = new Map();

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
    motionManager: AgentMotionManager,
    worldCamera: Phaser.Cameras.Scene2D.Camera
  ) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.networkManager = networkManager;
    this.cameraManager = cameraManager;
    this.motionManager = motionManager;
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
    this.sidebarWidth = Math.max(200, Math.floor(this.canvasWidth * 0.15));
    this.headerHeight = Math.max(44, Math.floor(this.canvasHeight * 0.06));
    this.rightPanelWidth = Math.max(280, Math.floor(this.canvasWidth * 0.2));
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
      this.cameraManager,
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
      this.motionManager,
      wc
    );
    aiThinkingUI.create();
    this.uiComponents.set("aiThinking", aiThinkingUI);

    this.setupStateListeners();
    this.setupResizeListener();
  }

  private setupResizeListener(): void {
    this.scene.scale.on("resize", this.onResize, this);
  }

  private onResize(): void {
    const newWidth = this.scene.scale.width;
    const newHeight = this.scene.scale.height;

    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    this.sidebarWidth = Math.max(200, Math.floor(newWidth * 0.15));
    this.headerHeight = Math.max(44, Math.floor(newHeight * 0.06));
    this.rightPanelWidth = Math.max(280, Math.floor(newWidth * 0.2));

    // Header
    const header = this.uiComponents.get("header");
    if (header) {
      header.setPosition(newWidth / 2, this.headerHeight / 2);
      header.resize(newWidth, this.headerHeight);
    }

    // Sidebar
    const sidebar = this.uiComponents.get("sidebar");
    if (sidebar) {
      const sidebarX = this.sidebarWidth / 2;
      const sidebarY = this.headerHeight + (newHeight - this.headerHeight) / 2;
      const sidebarHeight = newHeight - this.headerHeight;
      sidebar.setPosition(sidebarX, sidebarY);
      sidebar.resize(this.sidebarWidth, sidebarHeight);
    }

    // Right panel
    const rightPanelX = newWidth - this.rightPanelWidth / 2;
    const rightPanelY = this.headerHeight;
    const rightPanelHeight = newHeight - this.headerHeight;

    const votePanelHeight = Math.floor(rightPanelHeight * 0.3);
    const votePanel = this.uiComponents.get("votePanel");
    if (votePanel) {
      votePanel.setPosition(rightPanelX, rightPanelY + votePanelHeight / 2);
      votePanel.resize(this.rightPanelWidth - this.padding, votePanelHeight - this.padding);
    }

    const statsHeight = Math.floor(rightPanelHeight * 0.25);
    const agentStats = this.uiComponents.get("agentStats");
    if (agentStats) {
      agentStats.setPosition(rightPanelX, rightPanelY + votePanelHeight + statsHeight / 2);
      agentStats.resize(this.rightPanelWidth - this.padding, statsHeight - this.padding);
    }

    const eventFeed = this.uiComponents.get("eventFeed");
    if (eventFeed) {
      const eventFeedY = rightPanelY + votePanelHeight + statsHeight;
      const eventFeedHeight = rightPanelHeight - votePanelHeight - statsHeight;
      eventFeed.setPosition(rightPanelX, eventFeedY + eventFeedHeight / 2);
      eventFeed.resize(this.rightPanelWidth - this.padding, eventFeedHeight - this.padding);
    }

    // Camera control
    const cameraControl = this.uiComponents.get("cameraControl");
    if (cameraControl) {
      const cameraControlWidth = 200;
      const cameraControlHeight = 40;
      cameraControl.setPosition(
        this.sidebarWidth + this.padding + cameraControlWidth / 2,
        this.headerHeight + this.padding + cameraControlHeight / 2
      );
      cameraControl.resize(cameraControlWidth, cameraControlHeight);
    }

    this.cameraManager.onResize();
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
    this.stateManager.on("state:world:updated", this.onWorldUpdated, this);

    // Listen to agent updates
    this.stateManager.on("state:agents:updated", this.onAgentsUpdated, this);

    // Listen to event updates
    this.stateManager.on("state:events:updated", this.onEventsUpdated, this);

    // Listen to vote updates
    this.stateManager.on("state:votes:updated", this.onVotesUpdated, this);

    // Listen to agent selection
    this.stateManager.on("state:agent:selected", this.onAgentSelected, this);

    // Listen to thinking history updates
    this.stateManager.on("state:thinking:updated", this.onThinkingUpdated, this);
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
    this.scene.scale.off("resize", this.onResize, this);

    // Unsubscribe from all state events
    this.stateManager.off("state:world:updated", this.onWorldUpdated, this);
    this.stateManager.off("state:agents:updated", this.onAgentsUpdated, this);
    this.stateManager.off("state:events:updated", this.onEventsUpdated, this);
    this.stateManager.off("state:votes:updated", this.onVotesUpdated, this);
    this.stateManager.off("state:agent:selected", this.onAgentSelected, this);
    this.stateManager.off("state:thinking:updated", this.onThinkingUpdated, this);

    // Destroy all UI components
    for (const component of this.uiComponents.values()) {
      component.destroy();
    }
    this.uiComponents.clear();
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
