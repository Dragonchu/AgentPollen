import * as Phaser from "phaser";
import { VoteState, AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { ProgressBar } from "./components/ProgressBar";
import { GameStateManager } from "../managers/GameStateManager";
import { NetworkManager } from "../managers/NetworkManager";

/**
 * VotePanelUI displays voting interface and statistics.
 * - Countdown timer with progress bar
 * - Vote option cards (up to 3 preset actions)
 * - Custom input field for custom votes
 * - Vote statistics showing votes per action
 */
export class VotePanelUI extends BaseUI {
  private stateManager: GameStateManager;
  private networkManager: NetworkManager;

  // UI Elements
  private countdownText?: Phaser.GameObjects.Text;
  private countdownBar?: ProgressBar;
  private voteCards: Map<string, Phaser.GameObjects.Container> = new Map();
  private customInputField?: Phaser.GameObjects.DOMElement;
  private voteStatsText?: Phaser.GameObjects.Text;
  private totalVotesText?: Phaser.GameObjects.Text;

  // State
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

    // Countdown section
    const countdownLabel = this.drawText(-this.width / 2 + padding, startY, "Time Remaining:", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    countdownLabel.setOrigin(0, 0);

    this.countdownText = this.drawText(this.width / 2 - padding, startY, "0.0s", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
    });
    this.countdownText.setOrigin(1, 0);

    // Countdown progress bar
    const countdownBarY = startY + 18;
    this.countdownBar = new ProgressBar(this.scene, {
      x: -this.width / 2 + this.width / 2,
      y: countdownBarY,
      width: this.width - padding * 2,
      height: 10,
      backgroundColor: 0x222222,
      fillColor: 0x00ff00,
      borderColor: 0x00ff00,
      borderWidth: 1,
      value: 1,
    });
    this.container.add(this.countdownBar.getContainer());

    // Vote options (3 preset actions)
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

    // Custom input field
    const customInputY = votesStartY + cardHeight + 12;
    const inputLabel = this.drawText(-this.width / 2 + padding, customInputY, "Custom Action:", {
      fontSize: "10px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    inputLabel.setOrigin(0, 0);

    // Create DOMElement for text input - do NOT add to container (Phaser DOMElement+Container causes willRender crash)
    const domRelX = -this.width / 2 + padding + (this.width - padding * 2) / 2;
    const domRelY = customInputY + 20;
    this.customInputField = this.scene.add.dom(
      this.x + domRelX,
      this.y + domRelY,
      "input",
      `
        style="
          width: ${this.width - padding * 2 - 10}px;
          height: 24px;
          padding: 4px 8px;
          background: #1a1a2e;
          border: 1px solid #444;
          color: #00ffff;
          font-family: Arial;
          font-size: 12px;
          outline: none;
        "
        type="text"
        placeholder="Enter custom action..."
      `
    ) as Phaser.GameObjects.DOMElement;
    this.customInputField.setDepth(1000);
    if (this.worldCamera) {
      this.worldCamera.ignore(this.customInputField);
    }

    // Vote stats (show current vote counts)
    const statsY = customInputY + 36;
    this.voteStatsText = this.drawText(-this.width / 2 + padding, statsY, "Vote Stats:\nAttack: 0 | Defend: 0 | Heal: 0", {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#cccccc",
    });
    this.voteStatsText.setOrigin(0, 0);

    this.totalVotesText = this.drawText(this.width / 2 - padding, statsY, "Total Votes: 0", {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#00ff00",
    });
    this.totalVotesText.setOrigin(1, 0);

    // Setup event listeners
    this.stateManager.on<"state:votes:updated", VoteState>(
      "state:votes:updated",
      (votes: VoteState) => {
        this.currentVotes = votes;
        this.updateDisplay();
      }
    );

    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (agent: AgentFullState | null) => {
        this.selectedAgent = agent?.id ?? null;
      }
    );

    // Initial state
    const initialVotes = this.stateManager.getVotes();
    if (initialVotes) {
      this.currentVotes = initialVotes;
      this.updateDisplay();
    }

    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) {
      this.selectedAgent = initialAgent.id;
    }
  }

  private createVoteCard(
    x: number,
    y: number,
    width: number,
    height: number,
    action: string
  ): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a2e, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444444);
    bg.setInteractive();
    card.add(bg);

    // Action label
    const label = this.scene.add.text(width / 2, 10, action, {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#00ffff",
      fontStyle: "bold",
    });
    label.setOrigin(0.5, 0);
    card.add(label);

    // Vote count
    const countText = this.scene.add.text(width / 2, 28, "0", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
    });
    countText.setOrigin(0.5, 0.5);
    countText.setName(`${action}-count`);
    card.add(countText);

    // Click handler
    bg.on("pointerdown", () => {
      if (this.selectedAgent !== null) {
        this.networkManager.submitVote(this.selectedAgent, action);
      }
    });

    // Hover effect
    bg.on("pointerover", () => {
      bg.setFillStyle(0x222244, 1);
    });

    bg.on("pointerout", () => {
      bg.setFillStyle(0x1a1a2e, 1);
    });

    return card;
  }

  private updateDisplay(): void {
    if (!this.currentVotes) {
      return;
    }

    const voteState = this.currentVotes;

    // Update countdown
    const timeMs = voteState.timeRemainingMs;
    const timeSeconds = Math.max(0, timeMs / 1000);
    this.countdownText?.setText(`${timeSeconds.toFixed(1)}s`);

    // Update countdown bar (assume 60s total time)
    const maxTimeMs = 60000;
    const countdownProgress = Math.max(0, Math.min(1, timeMs / maxTimeMs));
    this.countdownBar?.setValue(countdownProgress);

    // Update vote counts
    let totalVotes = 0;
    const actionVotes: Record<string, number> = {
      Attack: 0,
      Defend: 0,
      Heal: 0,
    };

    for (const agentVotes of Object.values(voteState.agentVotes)) {
      for (const voteOption of agentVotes) {
        const action = voteOption.action;
        if (action in actionVotes) {
          actionVotes[action] += voteOption.votes;
        }
        totalVotes += voteOption.votes;
      }
    }

    // Update vote cards
    for (const [action, count] of Object.entries(actionVotes)) {
      const card = this.voteCards.get(action);
      if (card) {
        const countText = card.getByName(`${action}-count`) as Phaser.GameObjects.Text;
        if (countText) {
          countText.setText(count.toString());
        }
      }
    }

    // Update stats text
    const statsStr = `Vote Stats:\nAttack: ${actionVotes.Attack} | Defend: ${actionVotes.Defend} | Heal: ${actionVotes.Heal}`;
    this.voteStatsText?.setText(statsStr);

    // Update total votes
    this.totalVotesText?.setText(`Total Votes: ${totalVotes}`);
  }

  update(time: number, _delta: number): void {
    // Update countdown display every frame
    if (this.currentVotes && time - this.lastTimeUpdate > 100) {
      this.updateDisplay();
      this.lastTimeUpdate = time;
    }
  }

  destroy(): void {
    if (this.countdownBar) {
      this.countdownBar.destroy();
    }
    if (this.customInputField) {
      this.customInputField.destroy();
    }
    super.destroy();
  }
}
