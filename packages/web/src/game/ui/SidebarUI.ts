import * as Phaser from "phaser";
import { AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { ScrollableContainer } from "./components/ScrollableContainer";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";

/**
 * SidebarUI displays a scrollable list of agents on the left side.
 * - Sorted by: alive > kills > hp
 * - Each agent has a colored dot (HSL hue based on agentId)
 * - Clickable to select/inspect agent
 * - Shows name, kills, and health
 */
export class SidebarUI extends BaseUI {
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;
  private scrollContainer?: ScrollableContainer;
  private agentItems: Map<number, Phaser.GameObjects.Container> = new Map();
  private agentBackgrounds: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private selectedAgentId: number | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    stateManager: GameStateManager,
    networkManager: NetworkManager
  ) {
    super(scene, x, y, width, height);
    this.stateManager = stateManager;
    this.networkManager = networkManager;
  }

  create(): void {
    // Create scrollable container
    this.scrollContainer = new ScrollableContainer(
      this.scene,
      0,
      0,
      this.width - 16,
      this.height - 16
    );
    this.container.add(this.scrollContainer.getContainer());

    // Enable mouse wheel scrolling
    this.scrollContainer.enableScroll();

    // Subscribe to state changes
    this.stateManager.on<"state:agents:updated", Map<number, AgentFullState>>(
      "state:agents:updated",
      (agents: Map<number, AgentFullState>) => {
        this.updateAgents(agents);
      }
    );

    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (agent: AgentFullState | null) => {
        this.selectedAgentId = agent?.id ?? null;
        this.updateSelection();
      }
    );

    // Initial state
    const initialAgents = this.stateManager.getAgents();
    this.updateAgents(initialAgents);

    const selectedAgent = this.stateManager.getSelectedAgent();
    if (selectedAgent) {
      this.selectedAgentId = selectedAgent.id;
    }
  }

  private updateAgents(agents: Map<number, AgentFullState>): void {
    if (!this.scrollContainer) return;

    // Clear old items
    for (const item of this.agentItems.values()) {
      item.destroy();
    }
    this.agentItems.clear();
    this.agentBackgrounds.clear();

    // Sort agents: alive > killCount > hp
    const sortedAgents = Array.from(agents.values()).sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1; // alive first
      if (a.killCount !== b.killCount) return b.killCount - a.killCount; // more kills first
      return b.hp - a.hp; // more hp first
    });

    // Create agent items
    let offsetY = 8;
    const contentHeight = sortedAgents.length * 40 + 16;

    for (const agent of sortedAgents) {
      const item = this.createAgentItem(agent, offsetY);
      this.scrollContainer.getContentContainer().add(item);
      this.agentItems.set(agent.id, item);
      offsetY += 40;
    }

    // Update content height
    this.scrollContainer.setContentHeight(contentHeight);
    this.updateSelection();
  }

  private createAgentItem(agent: AgentFullState, offsetY: number): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, offsetY);

    // Color indicator dot (HSL based on agentId)
    const hue = (agent.id * 137) % 360;
    const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6).color;

    const dot = this.scene.add.graphics();
    dot.fillStyle(color, 1);
    dot.fillCircle(0, 0, 6);
    item.add(dot);

    // Agent name and status
    const statusText = agent.alive ? "🟢" : "🔴";
    const nameText = this.scene.add.text(12, -8, `${agent.name} ${statusText}`, {
      fontSize: "12px",
      fontFamily: "Arial",
      color: agent.alive ? "#ffffff" : "#888888",
      fontStyle: "bold",
    });
    nameText.setOrigin(0, 0);
    item.add(nameText);

    // Stats: kills and health
    const statsText = this.scene.add.text(12, 4, `K: ${agent.killCount} | HP: ${agent.hp}`, {
      fontSize: "10px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    statsText.setOrigin(0, 0);
    item.add(statsText);

    // Background (interactive)
    const bg = this.scene.add.rectangle(0, 0, this.width - 32, 36, 0x222222, 0.5);
    bg.setOrigin(0, 0.5);
    bg.setInteractive();
    bg.on("pointerdown", () => {
      this.networkManager.inspectAgent(agent.id);
    });
    item.add(bg);

    // Store background reference for selection highlighting
    this.agentBackgrounds.set(agent.id, bg);

    return item;
  }

  private updateSelection(): void {
    for (const [agentId, bg] of this.agentBackgrounds) {
      if (agentId === this.selectedAgentId) {
        bg.setFillStyle(0x00ffff, 0.3);
        bg.setStrokeStyle(2, 0x00ffff);
      } else {
        bg.setFillStyle(0x222222, 0.5);
        bg.setStrokeStyle(0);
      }
    }
  }

  destroy(): void {
    if (this.scrollContainer) {
      this.scrollContainer.destroy();
    }
    super.destroy();
  }
}
