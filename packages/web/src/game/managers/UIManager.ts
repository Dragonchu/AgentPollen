import * as Phaser from "phaser";
import { GameStateManager } from "./GameStateManager";
import { NetworkManager } from "./NetworkManager";
import { BaseUI } from "../ui/BaseUI";

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
    this.setupStateListeners();
    // UI components will be created here as they are implemented
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
