import * as Phaser from "phaser";
import { AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";

type RexScene = Phaser.Scene & {
  rexUI?: {
    add: {
      lineProgress: (x: number, y: number, w: number, h: number, color: number, value: number, config?: object) => Phaser.GameObjects.GameObject & { setValue: (v: number) => void; value?: number; setBarColor?: (c: number) => void };
    };
  };
};

/**
 * AgentStatsUI displays selected agent stats.
 * Simplified: name + health bar + shield bar only.
 */
export class AgentStatsUI extends BaseUI {
  private stateManager: GameStateManager;
  private selectedAgent: AgentFullState | null = null;
  private healthBar?: Phaser.GameObjects.GameObject & { setValue: (v: number) => void; setBarColor?: (c: number) => void };
  private shieldBar?: Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
  private nameText?: Phaser.GameObjects.Text;
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

    this.nameText = this.drawText(-this.width / 2 + padding, startY, "No Agent Selected", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#00ffff",
      fontStyle: "bold",
    });
    this.nameText.setOrigin(0, 0);

    const healthY = startY + 30;
    this.drawText(-this.width / 2 + padding, healthY, "HP:", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
    }).setOrigin(0, 0);

    const barW = this.width - padding * 2 - 60;
    const barH = 12;
    const scene = this.scene as RexScene;

    if (scene.rexUI?.add?.lineProgress) {
      const hpBar = scene.rexUI.add.lineProgress(-this.width / 2 + padding + 40 + barW / 2, healthY + 8 + barH / 2, barW, barH, 0x00ff00, 1);
      this.healthBar = hpBar as Phaser.GameObjects.GameObject & { setValue: (v: number) => void; setBarColor?: (c: number) => void };
      this.container.add(hpBar);
    } else {
      const bg = this.scene.add.rectangle(-this.width / 2 + padding + 40 + barW / 2, healthY + 8 + barH / 2, barW, barH, 0x222222);
      const fill = this.scene.add.rectangle(-this.width / 2 + padding + 40, healthY + 8 + barH / 2, barW, barH, 0x00ff00);
      this.container.add(bg);
      this.container.add(fill);
      this.healthBar = {
        setValue: (v: number) => {
          const w = barW * Phaser.Math.Clamp(v, 0, 1);
          fill.setDisplaySize(w, barH);
          fill.setPosition(-this.width / 2 + padding + 40 + w / 2, healthY + 8 + barH / 2);
        },
        setBarColor: (c: number) => fill.setFillStyle(c),
      } as Phaser.GameObjects.GameObject & { setValue: (v: number) => void; setBarColor?: (c: number) => void };
    }

    const shieldY = healthY + 28;
    this.drawText(-this.width / 2 + padding, shieldY, "Shield:", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
    }).setOrigin(0, 0);

    if (scene.rexUI?.add?.lineProgress) {
      const shBar = scene.rexUI.add.lineProgress(-this.width / 2 + padding + 40 + barW / 2, shieldY + 8 + barH / 2, barW, barH, 0x0088ff, 0);
      this.shieldBar = shBar as Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
      this.container.add(shBar);
    } else {
      const bg = this.scene.add.rectangle(-this.width / 2 + padding + 40 + barW / 2, shieldY + 8 + barH / 2, barW, barH, 0x222222);
      const fill = this.scene.add.rectangle(-this.width / 2 + padding + 40, shieldY + 8 + barH / 2, 0, barH, 0x0088ff);
      this.container.add(bg);
      this.container.add(fill);
      this.shieldBar = {
        setValue: (v: number) => {
          const w = barW * Phaser.Math.Clamp(v, 0, 1);
          fill.setDisplaySize(w, barH);
          fill.setPosition(-this.width / 2 + padding + 40 + w / 2, shieldY + 8 + barH / 2);
        },
      } as Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
    }

    this.stateManager.on<"state:agent:selected", AgentFullState | null>("state:agent:selected", (agent) => {
      this.selectedAgent = agent;
      this.updateDisplay();
    });

    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) {
      this.selectedAgent = initialAgent;
      this.lastSelectedAgentId = initialAgent.id;
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    if (!this.selectedAgent) {
      if (this.lastSelectedAgentId !== null) {
        this.lastSelectedAgentId = null;
        this.nameText?.setText("No Agent Selected");
        this.healthBar?.setValue(0);
        this.shieldBar?.setValue(0);
      }
      return;
    }

    if (this.selectedAgent.id === this.lastSelectedAgentId) return;
    this.lastSelectedAgentId = this.selectedAgent.id;

    const agent = this.selectedAgent;
    this.nameText?.setText(`${agent.name}${agent.alive ? " 🟢" : " 🔴"}`);

    const healthRatio = agent.maxHp > 0 ? agent.hp / agent.maxHp : 0;
    this.healthBar?.setValue(healthRatio);
    this.updateHealthBarColor(healthRatio);

    const maxShield = agent.defense * 5;
    const shieldRatio = maxShield > 0 ? Math.min(agent.defense, maxShield) / maxShield : 0;
    this.shieldBar?.setValue(shieldRatio);
  }

  private updateHealthBarColor(ratio: number): void {
    if (!this.healthBar?.setBarColor) return;
    let color = 0x00ff00;
    if (ratio <= 0.3) color = 0xff0000;
    else if (ratio <= 0.6) color = 0xffaa00;
    this.healthBar.setBarColor(color);
  }

  destroy(): void {
    super.destroy();
  }
}
