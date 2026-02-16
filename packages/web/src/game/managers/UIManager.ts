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
import { ResponsiveScaler } from "../utils/ResponsiveScaler";

/**
 * UIManager manages all UI components for the game.
 * It subscribes to state changes and updates UI components accordingly.
 * Supports responsive scaling based on canvas dimensions.
 */
export class UIManager {
  private scene: Phaser.Scene;
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;
  private uiComponents: Map<string, BaseUI> = new Map();
  private unsubscribeFunctions: Array<() => void> = [];
  private scaler: ResponsiveScaler | null = null;

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

    // Initialize responsive scaler
    this.scaler = new ResponsiveScaler(this.canvasWidth, this.canvasHeight);

    // Get scaled dimensions
    const sidebarWidth = this.scaler.getSidebarWidth();
    const headerHeight = this.scaler.getHeaderHeight();
    const rightPanelWidth = this.scaler.getRightPanelWidth();
    const padding = this.scaler.getPadding();

    // Create header
    const headerUI = new HeaderUI(
      this.scene,
      this.canvasWidth / 2,
      headerHeight / 2,
      this.canvasWidth,
      headerHeight,
      this.stateManager
    );
    headerUI.create();
    this.uiComponents.set("header", headerUI);

    // Create sidebar
    const sidebarX = sidebarWidth / 2;
    const sidebarY = headerHeight + (this.canvasHeight - headerHeight) / 2;
    const sidebarHeight = this.canvasHeight - headerHeight;

    const sidebarUI = new SidebarUI(
      this.scene,
      sidebarX,
      sidebarY,
      sidebarWidth,
      sidebarHeight,
      this.stateManager,
      this.networkManager
    );
    sidebarUI.create();
    this.uiComponents.set("sidebar", sidebarUI);

    // Create right panel components
    const rightPanelX = this.canvasWidth - rightPanelWidth / 2;
    const rightPanelY = headerHeight;
    const rightPanelHeight = this.canvasHeight - headerHeight;

    // Vote panel (top right)
    const votePanelHeight = Math.floor(rightPanelHeight * 0.3);
    const votePanelUI = new VotePanelUI(
      this.scene,
      rightPanelX,
      rightPanelY + votePanelHeight / 2,
      rightPanelWidth - padding,
      votePanelHeight - padding,
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
      rightPanelWidth - padding,
      statsHeight - padding,
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
      rightPanelWidth - padding,
      eventFeedHeight - padding,
      this.stateManager
    );
    eventFeedUI.create();
    this.uiComponents.set("eventFeed", eventFeedUI);

    // AI Thinking (bottom center)
    // Position at bottom with ~19.4% height (140/720 ≈ 0.194)
    const thinkingHeight = this.scaler.getPercentageHeight(0.194);
    const thinkingY = rightPanelY + rightPanelHeight - padding - thinkingHeight / 2;
    const thinkingWidth = this.canvasWidth - sidebarWidth - rightPanelWidth - padding * 2;
    const thinkingX = sidebarWidth + thinkingWidth / 2;

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
    const sidebarWidth = this.scaler?.getSidebarWidth() || 220;
    return {
      x: sidebarWidth / 2,
      y: this.scene.scale.height / 2,
    };
  }

  /**
   * Calculate position for header
   */
  getHeaderPosition(): { x: number; y: number } {
    const headerHeight = this.scaler?.getHeaderHeight() || 56;
    return {
      x: this.scene.scale.width / 2,
      y: headerHeight / 2,
    };
  }

  /**
   * Calculate position for right panel
   */
  getRightPanelPosition(): { x: number; y: number } {
    const canvasWidth = this.scene.scale.width;
    const rightPanelWidth = this.scaler?.getRightPanelWidth() || 340;
    return {
      x: canvasWidth - rightPanelWidth / 2,
      y: this.scene.scale.height / 2,
    };
  }

  /**
   * Get the playable area bounds (excluding UI)
   */
  getPlayableArea(): { x: number; y: number; width: number; height: number } {
    const canvasWidth = this.scene.scale.width;
    const canvasHeight = this.scene.scale.height;
    const sidebarWidth = this.scaler?.getSidebarWidth() || 220;
    const headerHeight = this.scaler?.getHeaderHeight() || 56;
    const rightPanelWidth = this.scaler?.getRightPanelWidth() || 340;

    return {
      x: sidebarWidth,
      y: headerHeight,
      width: canvasWidth - sidebarWidth - rightPanelWidth,
      height: canvasHeight - headerHeight,
    };
  }
}
