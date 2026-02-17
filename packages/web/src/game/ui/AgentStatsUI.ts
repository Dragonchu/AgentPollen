import * as Phaser from "phaser";
import { AgentFullState } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";
import { THEME } from "./theme";

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
  private lastHealthValue = 0;
  private lastShieldValue = 0;
  private healthTween?: Phaser.Tweens.Tween;
  private shieldTween?: Phaser.Tweens.Tween;

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

    this.nameText = this.drawText(-this.width / 2 + padding, startY, "点击左侧 Agent 选择", {
      fontSize: THEME.font.body,
      fontFamily: "Arial",
      color: THEME.css.primary,
      fontStyle: "bold",
    });
    this.nameText.setOrigin(0, 0);

    const healthY = startY + 30;
    this.drawText(-this.width / 2 + padding, healthY, "HP:", {
      fontSize: THEME.font.label,
      fontFamily: "Arial",
      color: THEME.css.foreground,
    }).setOrigin(0, 0);

    const barW = this.width - padding * 2 - 60;
    const barH = 12;
    const scene = this.scene as RexScene;

    if (scene.rexUI?.add?.lineProgress) {
      const hpBar = scene.rexUI.add.lineProgress(-this.width / 2 + padding + 40 + barW / 2, healthY + 8 + barH / 2, barW, barH, THEME.colors.primary, 1);
      this.healthBar = hpBar as Phaser.GameObjects.GameObject & { setValue: (v: number) => void; setBarColor?: (c: number) => void };
      this.container.add(hpBar);
    } else {
      const bg = this.scene.add.rectangle(-this.width / 2 + padding + 40 + barW / 2, healthY + 8 + barH / 2, barW, barH, THEME.colors.muted);
      const fill = this.scene.add.rectangle(-this.width / 2 + padding + 40, healthY + 8 + barH / 2, barW, barH, THEME.colors.primary);
      this.container.add(bg);
      this.container.add(fill);
      this.healthBar = {
        setValue: (v: number) => {
          const w = barW * Phaser.Math.Clamp(v, 0, 1);
          fill.setDisplaySize(w, barH);
          fill.setPosition(-this.width / 2 + padding + 40 + w / 2, healthY + 8 + barH / 2);
        },
        setBarColor: (c: number) => { fill.setFillStyle(c); },
      } as Phaser.GameObjects.GameObject & { setValue: (v: number) => void; setBarColor?: (c: number) => void };
    }

    const shieldY = healthY + 28;
    this.drawText(-this.width / 2 + padding, shieldY, "Shield:", {
      fontSize: THEME.font.label,
      fontFamily: "Arial",
      color: THEME.css.foreground,
    }).setOrigin(0, 0);

    if (scene.rexUI?.add?.lineProgress) {
      const shBar = scene.rexUI.add.lineProgress(-this.width / 2 + padding + 40 + barW / 2, shieldY + 8 + barH / 2, barW, barH, THEME.colors.primary, 0);
      this.shieldBar = shBar as Phaser.GameObjects.GameObject & { setValue: (v: number) => void };
      this.container.add(shBar);
    } else {
      const bg = this.scene.add.rectangle(-this.width / 2 + padding + 40 + barW / 2, shieldY + 8 + barH / 2, barW, barH, THEME.colors.muted);
      const fill = this.scene.add.rectangle(-this.width / 2 + padding + 40, shieldY + 8 + barH / 2, 0, barH, THEME.colors.primary);
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

    this.stateManager.on("state:agent:selected", this.onAgentSelected, this);

    const initialAgent = this.stateManager.getSelectedAgent();
    if (initialAgent) {
      this.selectedAgent = initialAgent;
      this.lastSelectedAgentId = initialAgent.id;
      this.updateDisplay();
    }
  }

  private onAgentSelected(agent: AgentFullState | null): void {
    this.selectedAgent = agent;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.selectedAgent) {
      if (this.lastSelectedAgentId !== null) {
        this.lastSelectedAgentId = null;
        this.lastHealthValue = 0;
        this.lastShieldValue = 0;
        this.healthTween?.stop();
        this.healthTween = undefined;
        this.shieldTween?.stop();
        this.shieldTween = undefined;
        this.nameText?.setText("点击左侧 Agent 选择");
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
    this.healthTween?.stop();
    this.healthTween = this.scene.tweens.addCounter({
      from: this.lastHealthValue,
      to: healthRatio,
      duration: 300,
      ease: "Power2",
      onUpdate: (tween) => {
        const v = tween.getValue();
        if (v !== null) {
          this.healthBar?.setValue(v);
          this.updateHealthBarColor(v);
        }
      },
      onComplete: () => { this.lastHealthValue = healthRatio; },
    });

    const maxShield = agent.defense * 5;
    const shieldRatio = maxShield > 0 ? Math.min(agent.defense, maxShield) / maxShield : 0;
    this.shieldTween?.stop();
    this.shieldTween = this.scene.tweens.addCounter({
      from: this.lastShieldValue,
      to: shieldRatio,
      duration: 300,
      ease: "Power2",
      onUpdate: (tween) => {
        const v = tween.getValue();
        if (v !== null) this.shieldBar?.setValue(v);
      },
      onComplete: () => { this.lastShieldValue = shieldRatio; },
    });
  }

  private updateHealthBarColor(ratio: number): void {
    if (!this.healthBar?.setBarColor) return;
    let color: number = THEME.colors.primary;
    if (ratio <= 0.3) color = THEME.colors.destructive;
    else if (ratio <= 0.6) color = THEME.colors.accent;
    this.healthBar.setBarColor(color);
  }

  destroy(): void {
    // Unsubscribe from state events
    this.stateManager.off("state:agent:selected", this.onAgentSelected, this);
    super.destroy();
  }
}
