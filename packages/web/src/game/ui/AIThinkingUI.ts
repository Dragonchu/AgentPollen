import * as Phaser from "phaser";
import { AgentFullState, ThinkingProcess } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { ScrollableContainer } from "./components/ScrollableContainer";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";

/**
 * AIThinkingUI displays AI thinking process and decision history for selected agent.
 * - Agent status indicator with breathing animation
 * - Scrollable thinking history (newest first)
 * - Relative timestamps ("just now", "5s ago")
 * - Reasoning display for each decision
 */
export class AIThinkingUI extends BaseUI {
  private stateManager: GameStateManager;
  private networkManager: NetworkManager; // Used in requestThinkingHistory

  // UI Elements
  private agentStatusIndicator?: Phaser.GameObjects.Graphics;
  private statusText?: Phaser.GameObjects.Text;
  private scrollContainer?: ScrollableContainer;
  private thinkingItems: Map<number, Phaser.GameObjects.Container> = new Map();

  // State
  private selectedAgent: AgentFullState | null = null;
  private thinkingHistory: ThinkingProcess[] = [];
  private lastUpdateTime = 0;
  private lastHistoryLength = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    stateManager: GameStateManager,
    networkManager: NetworkManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.stateManager = stateManager;
    this.networkManager = networkManager;
  }

  create(): void {
    const padding = 12;
    const startY = -this.height / 2 + padding;

    // Agent status bar
    const statusBarHeight = 30;

    // Status indicator (breathing circle)
    this.agentStatusIndicator = this.createGraphics();
    this.agentStatusIndicator.setPosition(-this.width / 2 + padding + 6, startY + 8);
    this.agentStatusIndicator.fillStyle(0x00ff00, 1);
    this.agentStatusIndicator.fillCircle(0, 0, 5);

    // Add breathing animation
    this.setupBreathingAnimation();

    // Status text
    this.statusText = this.drawText(-this.width / 2 + padding + 20, startY, "No Agent Selected", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#00ffff",
      fontStyle: "bold",
    });
    this.statusText.setOrigin(0, 0);

    // Scrollable thinking history
    const scrollStartY = startY + statusBarHeight + 8;
    this.scrollContainer = new ScrollableContainer(
      this.scene,
      0,
      scrollStartY,
      this.width - padding * 2,
      this.height - statusBarHeight - padding * 3
    );
    this.container.add(this.scrollContainer.getContainer());

    // Enable mouse wheel scrolling
    this.scrollContainer.enableScroll();

    // Subscribe to state changes
    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (agent: AgentFullState | null) => {
        this.selectedAgent = agent;
        this.updateAgentStatus();
        if (agent) {
          this.requestThinkingHistory(agent.id);
        } else {
          this.thinkingHistory = [];
          this.updateThinkingHistory([]);
        }
      }
    );

    this.stateManager.on<"state:thinking:updated", Map<number, ThinkingProcess[]>>(
      "state:thinking:updated",
      (thinkingMap: Map<number, ThinkingProcess[]>) => {
        if (this.selectedAgent) {
          const history = thinkingMap.get(this.selectedAgent.id) ?? [];
          this.thinkingHistory = history;
          this.updateThinkingHistory(history);
        }
      }
    );

    // Initial state
    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) {
      this.selectedAgent = initialAgent;
      this.updateAgentStatus();
      this.requestThinkingHistory(initialAgent.id);
    }
  }

  private setupBreathingAnimation(): void {
    if (!this.agentStatusIndicator) return;

    this.scene.tweens.add({
      targets: this.agentStatusIndicator,
      alpha: { from: 0.3, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private updateAgentStatus(): void {
    if (!this.selectedAgent) {
      this.statusText?.setText("No Agent Selected");
      if (this.agentStatusIndicator) {
        this.agentStatusIndicator.clear();
        this.agentStatusIndicator.fillStyle(0x999999, 0.3);
        this.agentStatusIndicator.fillCircle(0, 0, 5);
      }
      return;
    }

    const agent = this.selectedAgent;
    const status = agent.alive ? "🟢 Active" : "🔴 Eliminated";
    this.statusText?.setText(`${agent.name} - ${status}`);

    // Update indicator color
    if (this.agentStatusIndicator) {
      const color = agent.alive ? 0x00ff00 : 0xff0000;
      this.agentStatusIndicator.clear();
      this.agentStatusIndicator.fillStyle(color, 1);
      this.agentStatusIndicator.fillCircle(0, 0, 5);
    }
  }

  private requestThinkingHistory(agentId: number): void {
    // Request more thinking history (up to 20 entries)
    this.networkManager.requestThinkingHistory(agentId, 20);
  }

  private updateThinkingHistory(history: ThinkingProcess[]): void {
    if (!this.scrollContainer) return;

    // Optimization: Skip update if history length hasn't changed (except for timestamp refresh)
    const historyLength = history.length;
    if (historyLength === this.lastHistoryLength && historyLength > 0) {
      return; // No new thinking entries, timestamps will be refreshed in update()
    }
    this.lastHistoryLength = historyLength;

    // Clear old items
    for (const item of this.thinkingItems.values()) {
      item.destroy();
    }
    this.thinkingItems.clear();

    // Create items in reverse order (newest first, max 20)
    const maxItems = Math.min(20, history.length);
    let offsetY = 8;
    const contentHeight = maxItems * 60 + 16;

    const now = Date.now();

    for (let i = history.length - 1; i >= history.length - maxItems; i--) {
      const process = history[i];
      const item = this.createThinkingItem(process, offsetY, now, i === history.length - 1);
      this.scrollContainer.getContentContainer().add(item);
      this.thinkingItems.set(i, item);
      offsetY += 60;
    }

    // Update content height
    this.scrollContainer.setContentHeight(contentHeight);
  }

  private createThinkingItem(
    process: ThinkingProcess,
    offsetY: number,
    now: number,
    isLatest: boolean
  ): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, offsetY);

    // Background (highlight latest)
    const bgColor = isLatest ? 0x2a3a4a : 0x1a1a2e;
    const bg = this.scene.add.rectangle(
      0,
      0,
      this.width - 32,
      56,
      bgColor,
      isLatest ? 0.8 : 0.5
    );
    bg.setOrigin(0, 0);
    if (isLatest) {
      bg.setStrokeStyle(1, 0x00ffff);
    }
    item.add(bg);

    // Timestamp (relative)
    const timeDiff = now - process.timestamp;
    const timeStr = this.getRelativeTime(timeDiff);
    const timeText = this.scene.add.text(4, 4, timeStr, {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    timeText.setOrigin(0, 0);
    item.add(timeText);

    // Action/Decision
    const actionText = this.scene.add.text(4, 16, `Decision: ${process.action}`, {
      fontSize: "11px",
      fontFamily: "Arial",
      color: isLatest ? "#ffff00" : "#00ffff",
      fontStyle: "bold",
    });
    actionText.setOrigin(0, 0);
    item.add(actionText);

    // Reasoning (truncate to 2 lines)
    const maxReasoningLength = 60;
    const reasoningShort = process.reasoning.substring(0, maxReasoningLength) +
      (process.reasoning.length > maxReasoningLength ? "..." : "");
    const reasoningText = this.scene.add.text(4, 28, `Reason: ${reasoningShort}`, {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#cccccc",
      wordWrap: { width: this.width - 40 },
    });
    reasoningText.setOrigin(0, 0);
    item.add(reasoningText);

    return item;
  }

  private getRelativeTime(diffMs: number): string {
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  update(time: number, _delta: number): void {
    // Refresh relative timestamps every 5 seconds
    if (time - this.lastUpdateTime > 5000 && this.thinkingHistory.length > 0) {
      this.refreshTimestamps();
      this.lastUpdateTime = time;
    }
  }

  private refreshTimestamps(): void {
    if (!this.scrollContainer) return;
    const now = Date.now();

    const items = this.scrollContainer.getContentContainer().list;
    let itemIndex = 0;

    for (let i = this.thinkingHistory.length - 1; i >= Math.max(0, this.thinkingHistory.length - 20); i--) {
      if (itemIndex >= items.length) break;

      const process = this.thinkingHistory[i];
      const item = items[itemIndex] as Phaser.GameObjects.Container;

      if (item && item.list.length > 0) {
        // Update timestamp text (first child after bg)
        const timeStr = this.getRelativeTime(now - process.timestamp);
        const timeText = item.list[1] as Phaser.GameObjects.Text;
        if (timeText && timeText.setText) {
          timeText.setText(timeStr);
        }
      }

      itemIndex++;
    }
  }

  destroy(): void {
    if (this.scrollContainer) {
      this.scrollContainer.destroy();
    }
    super.destroy();
  }
}
