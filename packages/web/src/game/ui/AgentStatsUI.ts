import * as Phaser from "phaser";
import { AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { ProgressBar } from "./components/ProgressBar";
import { GameStateManager } from "../managers/GameStateManager";

/**
 * AgentStatsUI displays detailed statistics for a selected agent.
 * - Agent name
 * - Health and Shield progress bars
 * - 4 stat boxes (Attack, Defense, Kills, Current Action)
 * - Alliance/Enemy indicators
 */
export class AgentStatsUI extends BaseUI {
  private stateManager: GameStateManager;

  // UI Elements
  private selectedAgent: AgentFullState | null = null;
  private healthBar?: ProgressBar;
  private shieldBar?: ProgressBar;
  private nameText?: Phaser.GameObjects.Text;
  private statBoxes: Map<string, Phaser.GameObjects.Container> = new Map();
  private actionText?: Phaser.GameObjects.Text;
  private allianceText?: Phaser.GameObjects.Text;
  private enemyText?: Phaser.GameObjects.Text;
  private lastSelectedAgentId: number | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    stateManager: GameStateManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.stateManager = stateManager;
  }

  create(): void {
    const padding = 12;
    const startY = -this.height / 2 + padding;

    // Agent name
    this.nameText = this.drawText(-this.width / 2 + padding, startY, "No Agent Selected", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#00ffff",
      fontStyle: "bold",
    });
    this.nameText.setOrigin(0, 0);

    // Health bar
    const healthY = startY + 30;
    const healthLabel = this.drawText(-this.width / 2 + padding, healthY, "HP:", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
    });
    healthLabel.setOrigin(0, 0);

    this.healthBar = new ProgressBar(this.scene, {
      x: -this.width / 2 + padding + 40,
      y: healthY + 8,
      width: this.width - padding * 2 - 60,
      height: 12,
      backgroundColor: 0x222222,
      fillColor: 0x00ff00,
      borderColor: 0x00ff00,
      borderWidth: 1,
      value: 1,
    });
    this.container.add(this.healthBar.getContainer());

    // Shield bar
    const shieldY = healthY + 28;
    const shieldLabel = this.drawText(-this.width / 2 + padding, shieldY, "Shield:", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
    });
    shieldLabel.setOrigin(0, 0);

    this.shieldBar = new ProgressBar(this.scene, {
      x: -this.width / 2 + padding + 40,
      y: shieldY + 8,
      width: this.width - padding * 2 - 60,
      height: 12,
      backgroundColor: 0x222222,
      fillColor: 0x0088ff,
      borderColor: 0x0088ff,
      borderWidth: 1,
      value: 0,
    });
    this.container.add(this.shieldBar.getContainer());

    // Stats boxes (4 columns)
    const statsStartY = shieldY + 30;
    const boxWidth = (this.width - padding * 2 - 12) / 4;
    const boxHeight = 50;
    const statLabels = ["Attack", "Defense", "Kills", "Action"];

    for (let i = 0; i < 4; i++) {
      const x = -this.width / 2 + padding + i * (boxWidth + 3);
      const box = this.createStatBox(x, statsStartY, boxWidth, boxHeight, statLabels[i]);
      this.statBoxes.set(statLabels[i], box);
      this.container.add(box);
    }

    // Current action
    const actionY = statsStartY + boxHeight + 15;
    const actionLabel = this.drawText(-this.width / 2 + padding, actionY, "Current Action:", {
      fontSize: "10px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    actionLabel.setOrigin(0, 0);

    this.actionText = this.drawText(-this.width / 2 + padding, actionY + 16, "Idle", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
    });
    this.actionText.setOrigin(0, 0);

    // Alliances and Enemies
    const alliesY = actionY + 35;
    this.allianceText = this.drawText(-this.width / 2 + padding, alliesY, "Allies: None", {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#00ff00",
    });
    this.allianceText.setOrigin(0, 0);

    this.enemyText = this.drawText(-this.width / 2 + padding, alliesY + 14, "Enemies: None", {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#ff0000",
    });
    this.enemyText.setOrigin(0, 0);

    // Subscribe to state changes
    this.stateManager.on<"state:agent:selected", AgentFullState | null>(
      "state:agent:selected",
      (agent: AgentFullState | null) => {
        this.selectedAgent = agent;
        this.updateDisplay();
      }
    );

    // Initial state
    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) {
      this.selectedAgent = initialAgent;
      this.lastSelectedAgentId = initialAgent.id;
      this.updateDisplay();
    }
  }

  private createStatBox(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string
  ): Phaser.GameObjects.Container {
    const box = this.scene.add.container(x, y);

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1a1a2e, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x444444);
    box.add(bg);

    // Label
    const labelText = this.scene.add.text(4, 4, label, {
      fontSize: "9px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    labelText.setOrigin(0, 0);
    box.add(labelText);

    // Value (placeholder)
    const valueText = this.scene.add.text(width / 2, height / 2 - 2, "0", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffff00",
      fontStyle: "bold",
    });
    valueText.setOrigin(0.5, 0.5);
    valueText.setName(`${label}-value`);
    box.add(valueText);

    return box;
  }

  private updateDisplay(): void {
    if (!this.selectedAgent) {
      // Only update if selection actually changed
      if (this.lastSelectedAgentId !== null) {
        this.lastSelectedAgentId = null;
        this.nameText?.setText("No Agent Selected");
        this.healthBar?.setValue(0);
        this.shieldBar?.setValue(0);
        this.actionText?.setText("None");
        this.allianceText?.setText("Allies: None");
        this.enemyText?.setText("Enemies: None");
        this.updateStatBoxes(0, 0, 0, "");
      }
      return;
    }

    // Optimization: Skip full update if agent didn't change
    if (this.selectedAgent.id === this.lastSelectedAgentId) {
      return; // Same agent, no need to update
    }
    this.lastSelectedAgentId = this.selectedAgent.id;

    const agent = this.selectedAgent;

    // Update name
    this.nameText?.setText(`${agent.name}${agent.alive ? " 🟢" : " 🔴"}`);

    // Update health bar
    const healthRatio = agent.maxHp > 0 ? agent.hp / agent.maxHp : 0;
    this.healthBar?.setValue(healthRatio);
    this.updateHealthBarColor(healthRatio);

    // Update shield bar (Shield = defense * 5)
    const maxShield = agent.defense * 5;
    const shieldRatio = maxShield > 0 ? Math.min(agent.defense, maxShield) / maxShield : 0;
    this.shieldBar?.setValue(shieldRatio);

    // Update current action
    this.actionText?.setText(agent.currentAction || "Idle");

    // Update stat boxes
    this.updateStatBoxes(agent.attack, agent.defense, agent.killCount, agent.currentAction);

    // Update alliances and enemies
    const alliesStr = agent.alliances.length > 0 ? `Allies: ${agent.alliances.join(", ")}` : "Allies: None";
    this.allianceText?.setText(alliesStr);

    const enemiesStr = agent.enemies.length > 0 ? `Enemies: ${agent.enemies.join(", ")}` : "Enemies: None";
    this.enemyText?.setText(enemiesStr);
  }

  private updateHealthBarColor(ratio: number): void {
    if (!this.healthBar) return;

    let color = 0x00ff00; // Green
    if (ratio <= 0.3) {
      color = 0xff0000; // Red
    } else if (ratio <= 0.6) {
      color = 0xffaa00; // Orange
    }

    this.healthBar.setFillColor(color);
  }

  private updateStatBoxes(attack: number, defense: number, kills: number, action: string): void {
    const values = [
      { label: "Attack", value: attack },
      { label: "Defense", value: defense },
      { label: "Kills", value: kills },
      { label: "Action", value: 0 },
    ];

    for (const { label, value } of values) {
      const box = this.statBoxes.get(label);
      if (box) {
        const valueText = box.getByName(`${label}-value`) as Phaser.GameObjects.Text;
        if (valueText) {
          if (label === "Action") {
            valueText.setText(action || "Idle");
            valueText.setColor("#ffff00");
          } else {
            valueText.setText(value.toString());
            valueText.setColor("#00ffff");
          }
        }
      }
    }
  }

  destroy(): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    if (this.shieldBar) {
      this.shieldBar.destroy();
    }
    super.destroy();
  }
}
