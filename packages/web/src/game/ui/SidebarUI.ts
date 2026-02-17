import * as Phaser from "phaser";
import { AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";
import { CameraManager } from "../managers/CameraManager";
import { THEME } from "./theme";

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
  private cameraManager: CameraManager;
  private scrollPanel?: Phaser.GameObjects.GameObject & { layout: () => void };
  private contentSizer?: Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };
  private agentItems: Map<number, Phaser.GameObjects.Container> = new Map();
  private agentBackgrounds: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private agentLeftBars: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private selectedAgentId: number | null = null;
  private lastAgentCount = 0;

  // Double-click detection
  private lastClickTime = 0;
  private lastClickedAgentId: number | null = null;
  private readonly DOUBLE_CLICK_DELAY = 300; // ms

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    stateManager: GameStateManager,
    networkManager: NetworkManager,
    cameraManager: CameraManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.stateManager = stateManager;
    this.networkManager = networkManager;
    this.cameraManager = cameraManager;
  }

  create(): void {
    const scene = this.scene as RexScene;
    const panelW = this.width - 16;
    const titleH = 28;
    const panelH = this.height - 16 - titleH;

    // Agents title
    const titleText = this.scene.add.text(0, -this.height / 2 + 12, "AGENTS", {
      fontSize: THEME.font.label,
      fontFamily: "Arial",
      color: THEME.css.mutedForeground,
      fontStyle: "bold",
    });
    titleText.setOrigin(0, 0);
    this.container.add(titleText);

    if (scene.rexUI?.add?.scrollablePanel) {
      const sizer = scene.rexUI.add.sizer({
        orientation: 1,
        width: panelW,
        space: { item: 4 },
      });
      this.contentSizer = sizer as Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };

      const panel = scene.rexUI.add.scrollablePanel({
        x: 0,
        y: titleH / 2,
        width: panelW,
        height: panelH,
        panel: { child: sizer, mask: {} },
        slider: false,
        mouseWheelScroller: { focus: true, speed: 0.1 },
        background: scene.rexUI.add.roundRectangle(0, 0, panelW, panelH, THEME.spacing.radius, THEME.colors.card, 0.8),
      });
      this.scrollPanel = panel as Phaser.GameObjects.GameObject & { layout: () => void };
      this.container.add(this.scrollPanel);
    } else {
      const placeholder = this.scene.add.text(0, 0, "RexUI required", { fontSize: "12px", fontFamily: "Arial", color: THEME.css.destructive });
      this.container.add(placeholder);
    }

    this.stateManager.on("state:agents:updated", this.onAgentsUpdate, this);
    this.stateManager.on("state:agent:selected", this.onAgentSelected, this);

    this.updateAgents(this.stateManager.getAgents());
    const sel = this.stateManager.getSelectedAgent();
    if (sel) this.selectedAgentId = sel.id;
  }

  private onAgentsUpdate(agents: Map<number, AgentFullState>): void {
    this.updateAgents(agents);
  }

  private onAgentSelected(agent: AgentFullState | null): void {
    this.selectedAgentId = agent?.id ?? null;
    this.updateSelection();
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
    this.agentLeftBars.clear();

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
      this.contentSizer.add(item, { padding: { top: 6, bottom: 6 }, expand: false });
      this.agentItems.set(agent.id, item);
    }

    this.scrollPanel.layout();
    this.updateSelection();
  }

  private createAgentItem(agent: AgentFullState): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, 0);
    const itemHeight = 48;
    const itemWidth = this.width - 32;
    const leftBarWidth = 4;

    const leftBar = this.scene.add.rectangle(0, 0, leftBarWidth, itemHeight, THEME.colors.primary, 0);
    leftBar.setOrigin(0, 0.5);
    item.add(leftBar);
    this.agentLeftBars.set(agent.id, leftBar);

    const bg = this.scene.add.rectangle(leftBarWidth, 0, itemWidth - leftBarWidth, itemHeight, THEME.colors.secondary, 0.5);
    bg.setOrigin(0, 0.5);
    bg.setInteractive();
    bg.on("pointerdown", () => {
      const now = Date.now();
      const isDoubleClick =
        this.lastClickedAgentId === agent.id &&
        now - this.lastClickTime < this.DOUBLE_CLICK_DELAY;

      if (isDoubleClick) {
        // Double-click: Follow agent with camera
        this.cameraManager.followAgent(agent.id, 1.5);
        this.lastClickTime = 0;
        this.lastClickedAgentId = null;
      } else {
        // Single-click: Select agent
        this.networkManager.inspectAgent(agent.id);
        this.lastClickTime = now;
        this.lastClickedAgentId = agent.id;
      }

      // Visual feedback
      this.scene.tweens.add({
        targets: bg,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: 50,
        yoyo: true,
      });
    });
    bg.on("pointerover", () => bg.setFillStyle(THEME.colors.secondary, 0.7));
    bg.on("pointerout", () => this.updateSelection());
    item.add(bg);
    this.agentBackgrounds.set(agent.id, bg);

    const hue = (agent.id * 137) % 360;
    const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6).color;
    const dot = this.scene.add.graphics();
    dot.fillStyle(color, 1);
    dot.fillCircle(leftBarWidth + 6, 0, 6);
    item.add(dot);

    const statusText = agent.alive ? "🟢" : "🔴";
    const nameText = this.scene.add.text(leftBarWidth + 12, -10, `${agent.name} ${statusText}`, {
      fontSize: THEME.font.body,
      fontFamily: "Arial",
      color: agent.alive ? THEME.css.foreground : THEME.css.mutedForeground,
      fontStyle: "bold",
    });
    nameText.setOrigin(0, 0);
    item.add(nameText);

    const statsText = this.scene.add.text(leftBarWidth + 12, 6, `K: ${agent.killCount} | HP: ${agent.hp}`, {
      fontSize: THEME.font.small,
      fontFamily: "Arial",
      color: THEME.css.mutedForeground,
    });
    statsText.setOrigin(0, 0);
    item.add(statsText);

    return item;
  }

  private updateSelection(): void {
    for (const [agentId, bg] of this.agentBackgrounds) {
      const leftBar = this.agentLeftBars.get(agentId);
      if (agentId === this.selectedAgentId) {
        bg.setFillStyle(THEME.colors.primary, 0.2);
        bg.setStrokeStyle(2, THEME.colors.primary);
        leftBar?.setFillStyle(THEME.colors.primary, 1);
      } else {
        bg.setFillStyle(THEME.colors.secondary, 0.5);
        bg.setStrokeStyle(0);
        leftBar?.setFillStyle(THEME.colors.primary, 0);
      }
    }
  }

  destroy(): void {
    // Unsubscribe from state events
    this.stateManager.off("state:agents:updated", this.onAgentsUpdate, this);
    this.stateManager.off("state:agent:selected", this.onAgentSelected, this);
    super.destroy();
  }
}
