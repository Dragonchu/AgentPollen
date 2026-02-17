import * as Phaser from "phaser";
import { VoteState, AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";

type RexScene = Phaser.Scene & {
  rexUI?: {
    add: {
      lineProgress: (x: number, y: number, w: number, h: number, color: number, value: number, config?: object) => Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
    };
  };
};

/**
 * VotePanelUI displays voting interface.
 * Simplified: countdown bar + 3 vote buttons (custom input and stats removed).
 */
export class VotePanelUI extends BaseUI {
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;

  private countdownText?: Phaser.GameObjects.Text;
  private countdownBar?: Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
  private voteCards: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentVotes: VoteState | null = null;
  private selectedAgent: number | null = null;
  private lastTimeUpdate = 0;

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

    this.drawText(-this.width / 2 + padding, startY, "Time Remaining:", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    }).setOrigin(0, 0);

    this.countdownText = this.drawText(this.width / 2 - padding, startY, "0.0s", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
    });
    this.countdownText.setOrigin(1, 0);

    const countdownBarY = startY + 18;
    const barW = this.width - padding * 2;
    const barH = 10;

    const scene = this.scene as RexScene;
    if (scene.rexUI?.add?.lineProgress) {
      const bar = scene.rexUI.add.lineProgress(0, countdownBarY, barW, barH, 0x00ff00, 1);
      this.countdownBar = bar as Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
      this.container.add(bar);
    } else {
      const bg = this.scene.add.rectangle(0, countdownBarY, barW, barH, 0x222222);
      const fill = this.scene.add.rectangle(-barW / 2, countdownBarY, barW, barH, 0x00ff00);
      this.container.add(bg);
      this.container.add(fill);
      this.countdownBar = {
        setValue: (v: number) => {
          const w = barW * Phaser.Math.Clamp(v, 0, 1);
          fill.setPosition(-barW / 2 + w / 2, countdownBarY);
          fill.setDisplaySize(w, barH);
        },
      } as Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
    }

    const votesStartY = countdownBarY + 20;
    const presetActions = ["Attack", "Defend", "Heal"];
    const cardWidth = (this.width - padding * 2 - 6) / 3;
    const cardHeight = 40;

    for (let i = 0; i < 3; i++) {
      const x = -this.width / 2 + padding + i * (cardWidth + 3);
      const card = this.createVoteCard(x, votesStartY, cardWidth, cardHeight, presetActions[i]);
      this.voteCards.set(presetActions[i], card);
      this.container.add(card);
    }

    this.stateManager.on<"state:votes:updated", VoteState>("state:votes:updated", (votes) => {
      this.currentVotes = votes;
      this.updateDisplay();
    });
    this.stateManager.on<"state:agent:selected", AgentFullState | null>("state:agent:selected", (agent) => {
      this.selectedAgent = agent?.id ?? null;
    });

    const initialVotes = this.stateManager.getVotes();
    if (initialVotes) {
      this.currentVotes = initialVotes;
      this.updateDisplay();
    }
    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) this.selectedAgent = initialAgent.id;
  }

  private createVoteCard(x: number, y: number, width: number, height: number, action: string): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a2e, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444444);
    bg.setInteractive();
    card.add(bg);

    const label = this.scene.add.text(width / 2, 10, action, {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#00ffff",
      fontStyle: "bold",
    });
    label.setOrigin(0.5, 0);
    card.add(label);

    const countText = this.scene.add.text(width / 2, 28, "0", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
    });
    countText.setOrigin(0.5, 0.5);
    countText.setName(`${action}-count`);
    card.add(countText);

    bg.on("pointerdown", () => {
      if (this.selectedAgent !== null) this.networkManager.submitVote(this.selectedAgent, action);
    });
    bg.on("pointerover", () => bg.setFillStyle(0x222244, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x1a1a2e, 1));

    return card;
  }

  private updateDisplay(): void {
    if (!this.currentVotes) return;

    const timeMs = this.currentVotes.timeRemainingMs;
    const timeSeconds = Math.max(0, timeMs / 1000);
    this.countdownText?.setText(`${timeSeconds.toFixed(1)}s`);

    const maxTimeMs = 60000;
    const countdownProgress = Math.max(0, Math.min(1, timeMs / maxTimeMs));
    this.countdownBar?.setValue(countdownProgress);

    const actionVotes: Record<string, number> = { Attack: 0, Defend: 0, Heal: 0 };
    for (const agentVotes of Object.values(this.currentVotes.agentVotes)) {
      for (const voteOption of agentVotes) {
        if (voteOption.action in actionVotes) {
          actionVotes[voteOption.action] += voteOption.votes;
        }
      }
    }

    for (const [action, count] of Object.entries(actionVotes)) {
      const card = this.voteCards.get(action);
      if (card) {
        const countText = card.getByName(`${action}-count`) as Phaser.GameObjects.Text;
        if (countText) countText.setText(count.toString());
      }
    }
  }

  update(time: number, _delta: number): void {
    if (this.currentVotes && time - this.lastTimeUpdate > 100) {
      this.updateDisplay();
      this.lastTimeUpdate = time;
    }
  }

  destroy(): void {
    super.destroy();
  }
}
