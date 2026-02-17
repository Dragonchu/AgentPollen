import * as Phaser from "phaser";
import { BaseUI } from "./BaseUI";
import { CameraManager } from "../managers/CameraManager";
import { GameStateManager } from "../managers/GameStateManager";
import { THEME } from "./theme";
import {PointerEvents} from "@/game/events/GameEvents";

/**
 * CameraControlUI displays camera controls:
 * - Toggle dual camera mode button
 * - Focus on selected agent button (visible when agent selected)
 */
export class CameraControlUI extends BaseUI {
  private cameraManager: CameraManager;
  private toggleButtonText?: Phaser.GameObjects.Text;
  private buttonBackground?: Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void; setStrokeStyle?: (width: number, color: number, alpha?: number) => void };
  private focusIcon?: Phaser.GameObjects.Text;
  private isHovered = false;

  // Follow status indicator
  private followStatusText?: Phaser.GameObjects.Text;
  private followStatusBackground?: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    cameraManager: CameraManager,
    stateManager: GameStateManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.cameraManager = cameraManager;
  }

  create(): void {
    const dualButtonWidth = 140;
    const buttonHeight = 40;
    const focusSize = 40;
    const gap = 8;
    const dualX = -(dualButtonWidth + gap + focusSize) / 2 + dualButtonWidth / 2;
    const focusX = (dualButtonWidth + gap + focusSize) / 2 - focusSize / 2;

    const rexScene = this.scene as Phaser.Scene & { rexUI?: { add: { roundRectangle: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject } } };

    if (rexScene.rexUI?.add?.roundRectangle) {
      const bg = rexScene.rexUI.add.roundRectangle(dualX, 0, dualButtonWidth, buttonHeight, THEME.spacing.radius, THEME.colors.secondary, 0.9);
      bg.setInteractive();
      bg.on("pointerover", () => { this.isHovered = true; this.updateButtonState(); });
      bg.on("pointerout", () => { this.isHovered = false; this.updateButtonState(); });
      bg.on(PointerEvents.POINTER_DOWN, () => this.toggleDualCamera());
      this.buttonBackground = bg as Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void };
      this.container.add(bg);

      this.focusIcon = this.scene.add.text(focusX, 0, "◎", {
        fontSize: "18px",
        fontFamily: "Arial",
        color: THEME.css.primary,
      });
      this.focusIcon.setOrigin(0.5, 0.5);
      this.container.add(this.focusIcon);
    } else {
      const g = this.createGraphics();
      g.setPosition(dualX, 0);
      this.buttonBackground = g as Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void };
      this.container.add(g);
      const hitArea = new Phaser.Geom.Rectangle(dualX - dualButtonWidth / 2, -buttonHeight / 2, dualButtonWidth, buttonHeight);
      this.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      this.container.on("pointerover", () => { this.isHovered = true; this.updateButtonState(); });
      this.container.on("pointerout", () => { this.isHovered = false; this.updateButtonState(); });
      this.container.on("pointerdown", () => this.toggleDualCamera());
    }

    this.toggleButtonText = this.drawText(dualX - dualButtonWidth / 2 + 10, 0, "Dual Camera", {
      fontSize: THEME.font.body,
      fontFamily: "Arial",
      color: THEME.css.foreground,
      fontStyle: "bold",
    });
    this.toggleButtonText.setOrigin(0, 0.5);

    // Create follow status indicator (positioned below buttons)
    this.followStatusBackground = this.createGraphics();
    this.container.add(this.followStatusBackground);

    this.followStatusText = this.drawText(0, buttonHeight / 2 + 24, "", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: THEME.css.accent,
      fontStyle: "bold",
    });
    this.followStatusText.setOrigin(0.5, 0.5);

    this.updateButtonState();
  }

  private updateButtonState(): void {
    const isDualEnabled = this.cameraManager.isDualCameraEnabled();
    this.toggleButtonText?.setText(isDualEnabled ? "Dual: ON" : "Dual Camera");

    if (!this.buttonBackground) return;
    let bgColor: number = THEME.colors.secondary;
    let alpha = 0.9;
    if (isDualEnabled) {
      bgColor = THEME.colors.primary;
      alpha = 0.95;
    }
    if (this.isHovered) alpha = 1;

    const bg = this.buttonBackground as Phaser.GameObjects.GameObject & { setFillStyle?: (c: number, a?: number) => void };
    if (bg.setFillStyle) {
      bg.setFillStyle(bgColor, alpha);
    } else {
      const g = this.buttonBackground as Phaser.GameObjects.Graphics;
      const dualButtonWidth = 140;
      const buttonHeight = 40;
      g.clear();
      g.fillStyle(bgColor, alpha);
      g.fillRoundedRect(-dualButtonWidth / 2, -buttonHeight / 2, dualButtonWidth, buttonHeight, THEME.spacing.radius);
      g.lineStyle(2, isDualEnabled ? THEME.colors.primary : THEME.colors.border, 1);
      g.strokeRoundedRect(-dualButtonWidth / 2, -buttonHeight / 2, dualButtonWidth, buttonHeight, THEME.spacing.radius);
    }
  }

  private toggleDualCamera(): void {
    this.cameraManager.setDualCameraEnabled(!this.cameraManager.isDualCameraEnabled());
    this.updateButtonState();
  }
  update(): void {
    this.updateButtonState();
  }

  destroy(): void {
    super.destroy();
  }
}
