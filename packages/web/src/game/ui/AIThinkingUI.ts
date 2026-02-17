import * as Phaser from "phaser";
import { AgentFullState, ThinkingProcess } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";
import { CameraManager } from "../managers/CameraManager";
import { AgentDisplayStateManager } from "../scenes/AgentDisplayStateManager";
import { CELL_SIZE } from "../scenes/gameConstants";
import { THEME } from "./theme";

/**
 * AIThinkingUI displays AI thinking as a speech bubble above the selected agent's head.
 * Shows only the latest thinking (Decision + truncated Reason).
 */
export class AIThinkingUI extends BaseUI {
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;
  private cameraManager: CameraManager;
  private displayStateManager: AgentDisplayStateManager;

  private bubbleLabel?: Phaser.GameObjects.GameObject & { setText?: (text: string) => void; setVisible: (visible: boolean) => void };
  private textObj?: Phaser.GameObjects.Text;
  private thinkingHistory: ThinkingProcess[] = [];
  private selectedAgent: AgentFullState | null = null;

  private static readonly BUBBLE_WIDTH = 260;
  private static readonly BUBBLE_HEIGHT = 70;
  private static readonly BUBBLE_OFFSET_Y = -80;
  private static readonly REASON_TRUNCATE = 40;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    stateManager: GameStateManager,
    networkManager: NetworkManager,
    cameraManager: CameraManager,
    displayStateManager: AgentDisplayStateManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.stateManager = stateManager;
    this.networkManager = networkManager;
    this.cameraManager = cameraManager;
    this.displayStateManager = displayStateManager;
  }

  create(): void {
    const scene = this.scene;
    const w = AIThinkingUI.BUBBLE_WIDTH;
    const h = AIThinkingUI.BUBBLE_HEIGHT;

    const rexScene = scene as Phaser.Scene & { rexUI?: { add: { roundRectangle: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject; label: (config: object) => Phaser.GameObjects.GameObject } } };

    let bubble: Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => void };
    let text: Phaser.GameObjects.Text;

    if (rexScene.rexUI?.add?.roundRectangle) {
      const background = rexScene.rexUI.add.roundRectangle(0, 0, w, h, THEME.spacing.radius, THEME.colors.card, 0.95);
      text = scene.add.text(0, 0, "", {
        fontSize: THEME.font.label,
        fontFamily: "Arial",
        color: THEME.css.primary,
        wordWrap: { width: w - 16 },
        align: "left",
      });
      text.setOrigin(0.5, 0.5);
      bubble = rexScene.rexUI.add.label({
        x: 0,
        y: 0,
        width: w,
        height: h,
        background,
        text,
        align: "center",
        space: { left: 8, right: 8, top: 8, bottom: 8 },
      }) as Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => void };
    } else {
      const bg = scene.add.graphics();
      bg.fillStyle(THEME.colors.card, 0.95);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, THEME.spacing.radius);
      text = scene.add.text(0, 0, "", {
        fontSize: THEME.font.label,
        fontFamily: "Arial",
        color: THEME.css.primary,
        wordWrap: { width: w - 16 },
        align: "center",
      });
      text.setOrigin(0.5, 0.5);
      bubble = scene.add.container(0, 0, [bg, text]) as Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => void };
    }

    this.bubbleLabel = bubble;
    this.textObj = text;
    this.container.add(bubble);
    bubble.setVisible(false);

    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (agent: AgentFullState | null) => {
        this.selectedAgent = agent;
        if (agent) {
          this.networkManager.requestThinkingHistory(agent.id, 20);
        } else {
          this.thinkingHistory = [];
        }
        this.updateContent();
      }
    );

    this.stateManager.on<"state:thinking:updated", Map<number, ThinkingProcess[]>>(
      "state:thinking:updated",
      (thinkingMap: Map<number, ThinkingProcess[]>) => {
        if (this.selectedAgent) {
          this.thinkingHistory = thinkingMap.get(this.selectedAgent.id) ?? [];
          this.updateContent();
        }
      }
    );

    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) {
      this.selectedAgent = initialAgent;
      this.networkManager.requestThinkingHistory(initialAgent.id, 20);
      this.updateContent();
    }
  }

  private updateContent(): void {
    if (!this.textObj) return;

    const latest = this.thinkingHistory.length > 0
      ? this.thinkingHistory[this.thinkingHistory.length - 1]
      : null;

    let content: string;
    if (!this.selectedAgent) {
      content = "";
    } else if (!latest) {
      content = "Thinking...";
    } else {
      const reasonShort =
        latest.reasoning.length > AIThinkingUI.REASON_TRUNCATE
          ? latest.reasoning.substring(0, AIThinkingUI.REASON_TRUNCATE) + "..."
          : latest.reasoning;
      content = `Decision: ${latest.action}\nReason: ${reasonShort}`;
    }

    this.textObj.setText(content);
    if (this.bubbleLabel) this.bubbleLabel.setVisible(!!this.selectedAgent);
  }

  update(_time: number, _delta: number): void {
    if (!this.selectedAgent || !this.bubbleLabel) return;

    const displayStates = this.displayStateManager.getDisplayStates();
    const displayState = displayStates.get(this.selectedAgent.id);
    const displayX = displayState ? displayState.displayX : this.selectedAgent.x;
    const displayY = displayState ? displayState.displayY : this.selectedAgent.y;

    const worldX = displayX * CELL_SIZE + CELL_SIZE / 2;
    const worldY = displayY * CELL_SIZE + CELL_SIZE / 2;

    const { x: screenX, y: screenY } = this.cameraManager.worldToScreen(worldX, worldY);
    const bubbleY = screenY + AIThinkingUI.BUBBLE_OFFSET_Y;

    this.container.setPosition(screenX, bubbleY);
  }

  destroy(): void {
    super.destroy();
  }
}
