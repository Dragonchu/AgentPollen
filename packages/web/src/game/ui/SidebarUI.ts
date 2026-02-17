import * as Phaser from "phaser";
import { AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";

type RexScene = Phaser.Scene & {
  rexUI?: {
    add: {
      sizer: (config: object) => Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void; clear: (destroy?: boolean) => void };
      scrollablePanel: (config: object) => Phaser.GameObjects.GameObject & { layout: () => void };
      roundRectangle: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject;
    };
  };
};

/**
 * SidebarUI displays a scrollable list of agents on the left side.
 * Uses RexUI scrollablePanel when available.
 */
export class SidebarUI extends BaseUI {
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;
  private scrollPanel?: Phaser.GameObjects.GameObject & { layout: () => void };
  private contentSizer?: Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };
  private agentItems: Map<number, Phaser.GameObjects.Container> = new Map();
  private agentBackgrounds: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private selectedAgentId: number | null = null;
  private lastAgentCount = 0;

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
    const scene = this.scene as RexScene;
    const panelW = this.width - 16;
    const panelH = this.height - 16;

    if (scene.rexUI?.add?.scrollablePanel) {
      const sizer = scene.rexUI.add.sizer({
        orientation: 1,
        width: panelW,
        space: { item: 4 },
      });
      this.contentSizer = sizer as Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };

      const panel = scene.rexUI.add.scrollablePanel({
        x: 0,
        y: 0,
        width: panelW,
        height: panelH,
        panel: { child: sizer, mask: {} },
        slider: false,
        mouseWheelScroller: { focus: true, speed: 0.1 },
        background: scene.rexUI.add.roundRectangle(0, 0, panelW, panelH, 8, 0x1a1a2e, 0.8),
      });
      this.scrollPanel = panel as Phaser.GameObjects.GameObject & { layout: () => void };
      this.container.add(this.scrollPanel);
    } else {
      const placeholder = this.scene.add.text(0, 0, "RexUI required", { fontSize: "12px", fontFamily: "Arial", color: "#ff0000" });
      this.container.add(placeholder);
    }

    this.stateManager.on<"state:agents:updated", Map<number, AgentFullState>>(
      "state:agents:updated",
      (agents) => this.updateAgents(agents)
    );
    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (agent) => {
        this.selectedAgentId = agent?.id ?? null;
        this.updateSelection();
      }
    );

    this.updateAgents(this.stateManager.getAgents());
    const sel = this.stateManager.getSelectedAgent();
    if (sel) this.selectedAgentId = sel.id;
  }

  private updateAgents(agents: Map<number, AgentFullState>): void {
    if (!this.contentSizer || !this.scrollPanel) return;

    const agentCount = agents.size;
    if (agentCount === this.lastAgentCount && agentCount > 0) {
      this.updateSelection();
      return;
    }
    this.lastAgentCount = agentCount;

    for (const item of this.agentItems.values()) item.destroy();
    this.agentItems.clear();
    this.agentBackgrounds.clear();

    this.contentSizer.removeAll(true);

    const sorted = Array.from(agents.values())
      .filter((a): a is NonNullable<typeof a> => a != null)
      .sort((a, b) => {
        if (a.alive !== b.alive) return a.alive ? -1 : 1;
        if (a.killCount !== b.killCount) return b.killCount - a.killCount;
        return b.hp - a.hp;
      });

    for (const agent of sorted) {
      const item = this.createAgentItem(agent);
      this.contentSizer.add(item, { padding: { top: 4, bottom: 4 }, expand: false });
      this.agentItems.set(agent.id, item);
    }

    this.scrollPanel.layout();
    this.updateSelection();
  }

  private createAgentItem(agent: AgentFullState): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, 0);

    const bg = this.scene.add.rectangle(0, 0, this.width - 32, 36, 0x222222, 0.5);
    bg.setOrigin(0, 0.5);
    bg.setInteractive();
    bg.on("pointerdown", () => this.networkManager.inspectAgent(agent.id));
    item.add(bg);
    this.agentBackgrounds.set(agent.id, bg);

    const hue = (agent.id * 137) % 360;
    const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6).color;
    const dot = this.scene.add.graphics();
    dot.fillStyle(color, 1);
    dot.fillCircle(0, 0, 6);
    item.add(dot);

    const statusText = agent.alive ? "🟢" : "🔴";
    const nameText = this.scene.add.text(12, -8, `${agent.name} ${statusText}`, {
      fontSize: "12px",
      fontFamily: "Arial",
      color: agent.alive ? "#ffffff" : "#888888",
      fontStyle: "bold",
    });
    nameText.setOrigin(0, 0);
    item.add(nameText);

    const statsText = this.scene.add.text(12, 4, `K: ${agent.killCount} | HP: ${agent.hp}`, {
      fontSize: "10px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    statsText.setOrigin(0, 0);
    item.add(statsText);

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
    super.destroy();
  }
}
