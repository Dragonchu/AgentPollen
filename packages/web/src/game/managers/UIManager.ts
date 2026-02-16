import * as Phaser from "phaser";
import { GameStateManager } from "./GameStateManager";
import { NetworkManager } from "./NetworkManager";
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
 */
export class UIManager {
  private scene: Phaser.Scene;
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;
  private uiComponents: Map<string, BaseUI> = new Map();
  private unsubscribeFunctions: Array<() => void> = [];

  // Layout dimensions
  private readonly SIDEBAR_WIDTH = 220;
  private readonly HEADER_HEIGHT = 56;
  private readonly RIGHT_PANEL_WIDTH = 340;
  private readonly PADDING = 8;

  // Canvas dimensions (will be set in create)
  private canvasWidth = 1280;
  private canvasHeight = 720;

  constructor(
    scene: Phaser.Scene,
    stateManager: GameStateManager,
    networkManager: NetworkManager
  ) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.networkManager = networkManager;
  }

  /**
   * Create all UI components
   */
  create(): void {
    // Get canvas dimensions
    this.canvasWidth = this.scene.scale.width;
    this.canvasHeight = this.scene.scale.height;

    // Create header
    const headerUI = new HeaderUI(
      this.scene,
      this.canvasWidth / 2,
      this.HEADER_HEIGHT / 2,
      this.canvasWidth,
      this.HEADER_HEIGHT,
      this.stateManager
    );
    headerUI.create();
    this.uiComponents.set("header", headerUI);

    // Create sidebar
    const sidebarX = this.SIDEBAR_WIDTH / 2;
    const sidebarY = this.HEADER_HEIGHT + (this.canvasHeight - this.HEADER_HEIGHT) / 2;
    const sidebarHeight = this.canvasHeight - this.HEADER_HEIGHT;

    const sidebarUI = new SidebarUI(
      this.scene,
      sidebarX,
      sidebarY,
      this.SIDEBAR_WIDTH,
      sidebarHeight,
      this.stateManager,
      this.networkManager
    );
    sidebarUI.create();
    this.uiComponents.set("sidebar", sidebarUI);

    // Create right panel components
    const rightPanelX = this.canvasWidth - this.RIGHT_PANEL_WIDTH / 2;
    const rightPanelY = this.HEADER_HEIGHT;
    const rightPanelHeight = this.canvasHeight - this.HEADER_HEIGHT;

    // Vote panel (top right)
    const votePanelHeight = Math.floor(rightPanelHeight * 0.3);
    const votePanelUI = new VotePanelUI(
      this.scene,
      rightPanelX,
      rightPanelY + votePanelHeight / 2,
      this.RIGHT_PANEL_WIDTH - 8,
      votePanelHeight - 8,
      this.stateManager,
      this.networkManager
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
      this.RIGHT_PANEL_WIDTH - 8,
      statsHeight - 8,
      this.stateManager
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
      this.RIGHT_PANEL_WIDTH - 8,
      eventFeedHeight - 8,
      this.stateManager
    );
    eventFeedUI.create();
    this.uiComponents.set("eventFeed", eventFeedUI);

    // AI Thinking (bottom center)
    const thinkingY = rightPanelY + rightPanelHeight - 150;
    const thinkingHeight = 140;
    const thinkingWidth = this.canvasWidth - this.SIDEBAR_WIDTH - this.RIGHT_PANEL_WIDTH - 16;
    const thinkingX = this.SIDEBAR_WIDTH + thinkingWidth / 2;

    const aiThinkingUI = new AIThinkingUI(
      this.scene,
      thinkingX,
      thinkingY,
      thinkingWidth,
      thinkingHeight,
      this.stateManager,
      this.networkManager
    );
    aiThinkingUI.create();
    this.uiComponents.set("aiThinking", aiThinkingUI);

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
   * Calculate position for left sidebar
   */
  getLeftSidebarPosition(): { x: number; y: number } {
    return {
      x: this.SIDEBAR_WIDTH / 2,
      y: this.scene.scale.height / 2,
    };
  }

  /**
   * Calculate position for header
   */
  getHeaderPosition(): { x: number; y: number } {
    return {
      x: this.scene.scale.width / 2,
      y: this.HEADER_HEIGHT / 2,
    };
  }

  /**
   * Calculate position for right panel
   */
  getRightPanelPosition(): { x: number; y: number } {
    const canvasWidth = this.scene.scale.width;
    return {
      x: canvasWidth - this.RIGHT_PANEL_WIDTH / 2,
      y: this.scene.scale.height / 2,
    };
  }

  /**
   * Get the playable area bounds (excluding UI)
   */
  getPlayableArea(): { x: number; y: number; width: number; height: number } {
    const canvasWidth = this.scene.scale.width;
    const canvasHeight = this.scene.scale.height;
    return {
      x: this.SIDEBAR_WIDTH,
      y: this.HEADER_HEIGHT,
      width: canvasWidth - this.SIDEBAR_WIDTH - this.RIGHT_PANEL_WIDTH,
      height: canvasHeight - this.HEADER_HEIGHT,
    };
  }
}
