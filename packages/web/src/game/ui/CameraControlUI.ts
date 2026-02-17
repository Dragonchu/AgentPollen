import * as Phaser from "phaser";
import { BaseUI } from "./BaseUI";
import { CameraManager } from "../managers/CameraManager";

/**
 * CameraControlUI displays camera controls:
 * - Toggle dual camera mode button
 */
export class CameraControlUI extends BaseUI {
  private cameraManager: CameraManager;
  private toggleButtonText?: Phaser.GameObjects.Text;
  private buttonBackground?: Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void; setStrokeStyle?: (width: number, color: number, alpha?: number) => void };
  private isHovered = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    cameraManager: CameraManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.cameraManager = cameraManager;
  }

  create(): void {
    const buttonWidth = 140;
    const buttonHeight = 32;

    const rexScene = this.scene as Phaser.Scene & { rexUI?: { add: { roundRectangle: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject } } };

    if (rexScene.rexUI?.add?.roundRectangle) {
      const bg = rexScene.rexUI.add.roundRectangle(0, 0, buttonWidth, buttonHeight, 8, 0x333333, 0.9);
      this.buttonBackground = bg as Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void; setStrokeStyle?: (width: number, color: number, alpha?: number) => void };
      this.container.add(bg);
      bg.setInteractive();
      bg.on("pointerover", () => { this.isHovered = true; this.updateButtonState(); });
      bg.on("pointerout", () => { this.isHovered = false; this.updateButtonState(); });
      bg.on("pointerdown", () => this.toggleDualCamera());
    } else {
      const g = this.createGraphics();
      g.setPosition(0, 0);
      this.buttonBackground = g as Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void; setStrokeStyle?: (width: number, color: number, alpha?: number) => void };
      this.container.add(g);
      const hitArea = new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
      this.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      this.container.on("pointerover", () => { this.isHovered = true; this.updateButtonState(); });
      this.container.on("pointerout", () => { this.isHovered = false; this.updateButtonState(); });
      this.container.on("pointerdown", () => this.toggleDualCamera());
    }

    this.toggleButtonText = this.drawText(10, 0, "Dual Camera", {
      fontSize: "13px",
      fontFamily: "Arial",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.toggleButtonText.setOrigin(0, 0.5);

    this.updateButtonState();
  }

  private updateButtonState(): void {
    const isDualEnabled = this.cameraManager.isDualCameraEnabled();
    this.toggleButtonText?.setText(isDualEnabled ? "Dual: ON" : "Dual Camera");

    if (!this.buttonBackground) return;
    let bgColor = 0x333333;
    let alpha = 0.9;
    if (isDualEnabled) {
      bgColor = 0x00aa00;
      alpha = 0.95;
    }
    if (this.isHovered) alpha = 1;

    const bg = this.buttonBackground as Phaser.GameObjects.GameObject & { setFillStyle?: (c: number, a?: number) => void };
    if (bg.setFillStyle) {
      bg.setFillStyle(bgColor, alpha);
    } else {
      const g = this.buttonBackground as Phaser.GameObjects.Graphics;
      g.clear();
      g.fillStyle(bgColor, alpha);
      g.fillRoundedRect(-70, -16, 140, 32, 8);
      g.lineStyle(2, isDualEnabled ? 0x00ff00 : 0x666666, 1);
      g.strokeRoundedRect(-70, -16, 140, 32, 8);
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
