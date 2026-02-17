import * as Phaser from "phaser";
import { WorldSyncState, GamePhase } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameStateManager } from "../managers/GameStateManager";
import { THEME } from "./theme";

/**
 * HeaderUI displays game information at the top of the screen:
 * - Logo/Title
 * - LIVE indicator with breathing animation
 * - Round/Phase information
 * - Countdown timer
 * - Alive agent count
 */
export class HeaderUI extends BaseUI {
  private stateManager: GameStateManager;

  // UI Elements
  private liveIndicator?: Phaser.GameObjects.Graphics;
  private roundText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private aliveCountText?: Phaser.GameObjects.Text;

  // State
  private currentWorld: WorldSyncState | null = null;

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
    const padding = 16;
    const leftX = -this.width / 2 + padding;

    const rexScene = this.scene as Phaser.Scene & { rexUI?: { add: { roundRectangle: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject } } };
    if (rexScene.rexUI?.add?.roundRectangle) {
      const bg = rexScene.rexUI.add.roundRectangle(0, 0, this.width, this.height, 0, THEME.colors.background, 0.9);
      this.container.addAt(bg, 0);
    }

    // Title/Logo
    const titleText = this.drawText(leftX, 0, "⚔ AI BATTLE ROYALE", {
      fontSize: THEME.font.title,
      fontFamily: "Arial",
      color: THEME.css.primary,
      fontStyle: "bold",
    });
    titleText.setOrigin(0, 0.5);

    // LIVE indicator with breathing animation
    const liveX = leftX + 200;
    const liveCircle = this.createGraphics();
    liveCircle.setPosition(liveX, 0);
    liveCircle.fillStyle(THEME.colors.destructive, 1);
    liveCircle.fillCircle(0, 0, 6);
    this.liveIndicator = liveCircle;

    // LIVE text
    const liveText = this.drawText(liveX + 12, 0, "LIVE", {
      fontSize: THEME.font.label,
      fontFamily: "Arial",
      color: THEME.css.destructive,
      fontStyle: "bold",
    });
    liveText.setOrigin(0, 0.5);

    // Add breathing animation to the indicator
    this.setupBreathingAnimation();

    // Round information (right side)
    const rightX = this.width / 2 - padding;

    // Alive count
    this.aliveCountText = this.drawText(rightX - 80, 0, "Alive: 0", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: THEME.css.primary,
      fontStyle: "bold",
    });
    this.aliveCountText.setOrigin(1, 0.5);

    // Countdown timer
    this.countdownText = this.drawText(rightX - 180, 0, "Time: --:--", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: THEME.css.accent,
      fontStyle: "bold",
    });
    this.countdownText.setOrigin(1, 0.5);

    // Round/Phase
    this.roundText = this.drawText(rightX - 280, 0, "Phase: Waiting", {
      fontSize: THEME.font.label,
      fontFamily: "Arial",
      color: THEME.css.mutedForeground,
    });
    this.roundText.setOrigin(1, 0.5);

    // Subscribe to state changes
    this.stateManager.on("state:world:updated", this.onWorldUpdate, this);

    // Initial state
    const initialWorld = this.stateManager.getWorld();
    if (initialWorld) {
      this.currentWorld = initialWorld;
      this.updateWorldDisplay();
    }
  }

  private onWorldUpdate(world: WorldSyncState): void {
    this.currentWorld = world;
    this.updateWorldDisplay();
  }

  private setupBreathingAnimation(): void {
    if (!this.liveIndicator) return;

    // Breathing animation: alpha oscillates between 0.3 and 1
    this.scene.tweens.add({
      targets: this.liveIndicator,
      alpha: { from: 0.3, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private updateWorldDisplay(): void {
    if (!this.currentWorld) return;

    // Update phase/round text
    if (this.roundText) {
      let phaseLabel = "Waiting";
      if (this.currentWorld.phase === GamePhase.Running) {
        phaseLabel = "Running";
      } else if (this.currentWorld.phase === GamePhase.Finished) {
        phaseLabel = "Finished";
      }
      this.roundText.setText(`Phase: ${phaseLabel}`);
    }

    // Update alive count
    if (this.aliveCountText) {
      this.aliveCountText.setText(`Alive: ${this.currentWorld.aliveCount}`);
    }

    // Update countdown
    this.updateCountdown();
  }

  private updateCountdown(): void {
    if (!this.currentWorld || !this.countdownText) return;

    // Convert tick to seconds and format as MM:SS
    const totalSeconds = Math.floor(this.currentWorld.tick / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    this.countdownText.setText(`Time: ${timeStr}`);
  }

  update(_time: number, _delta: number): void {
    // Update countdown every frame for smooth animation
    this.updateCountdown();
  }

  destroy(): void {
    // Unsubscribe from state events
    this.stateManager.off("state:world:updated", this.onWorldUpdate, this);
    super.destroy();
  }
}
