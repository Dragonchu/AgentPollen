import * as Phaser from "phaser";
import { BaseUI } from "./BaseUI";
import { CameraManager } from "../managers/CameraManager";

/**
 * CameraControlUI displays camera controls:
 * - Toggle dual camera mode button
 * - Camera zoom level indicator
 */
export class CameraControlUI extends BaseUI {
  private cameraManager: CameraManager;

  // UI Elements
  private toggleButton?: Phaser.GameObjects.Graphics;
  private toggleButtonText?: Phaser.GameObjects.Text;
  private buttonBackground?: Phaser.GameObjects.Graphics;
  private isHovered: boolean = false;

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
    const buttonX = 0;
    const buttonY = 0;

    // Create button background
    this.buttonBackground = this.createGraphics();
    this.buttonBackground.setPosition(buttonX, buttonY);
    this.drawButtonBackground(false);

    // Create button icon (camera icon)
    this.toggleButton = this.createGraphics();
    this.toggleButton.setPosition(buttonX - buttonWidth / 2 + 20, buttonY);
    this.drawCameraIcon();

    // Create button text
    this.toggleButtonText = this.drawText(
      buttonX + 10,
      buttonY,
      "Dual Camera",
      {
        fontSize: "13px",
        fontFamily: "Arial",
        color: "#ffffff",
        fontStyle: "bold",
      }
    );
    this.toggleButtonText.setOrigin(0, 0.5);

    // Set up interactive area
    const hitArea = new Phaser.Geom.Rectangle(
      buttonX - buttonWidth / 2,
      buttonY - buttonHeight / 2,
      buttonWidth,
      buttonHeight
    );

    this.container.setInteractive(
      hitArea,
      Phaser.Geom.Rectangle.Contains
    );

    // Add pointer events
    this.container.on("pointerover", () => {
      this.isHovered = true;
      this.drawButtonBackground(true);
    });

    this.container.on("pointerout", () => {
      this.isHovered = false;
      this.drawButtonBackground(false);
    });

    this.container.on("pointerdown", () => {
      this.toggleDualCamera();
    });

    // Update button state based on current camera mode
    this.updateButtonState();
  }

  private drawButtonBackground(hovered: boolean): void {
    if (!this.buttonBackground) return;

    const buttonWidth = 140;
    const buttonHeight = 32;
    const isDualEnabled = this.cameraManager.isDualCameraEnabled();

    this.buttonBackground.clear();

    // Background color
    let bgColor = 0x333333;
    let alpha = 0.9;

    if (isDualEnabled) {
      bgColor = 0x00aa00;
      alpha = 0.95;
    }

    if (hovered) {
      alpha = 1.0;
    }

    // Draw rounded rectangle
    this.buttonBackground.fillStyle(bgColor, alpha);
    this.buttonBackground.fillRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      8
    );

    // Draw border
    const borderColor = isDualEnabled ? 0x00ff00 : 0x666666;
    this.buttonBackground.lineStyle(2, borderColor, 1);
    this.buttonBackground.strokeRoundedRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      8
    );
  }

  private drawCameraIcon(): void {
    if (!this.toggleButton) return;

    this.toggleButton.clear();

    // Simple camera icon
    this.toggleButton.lineStyle(2, 0xffffff, 1);
    
    // Camera body
    this.toggleButton.strokeRect(-6, -4, 12, 8);
    
    // Lens
    this.toggleButton.fillStyle(0xffffff, 1);
    this.toggleButton.fillCircle(0, 0, 3);
  }

  private toggleDualCamera(): void {
    const currentState = this.cameraManager.isDualCameraEnabled();
    this.cameraManager.setDualCameraEnabled(!currentState);
    this.updateButtonState();
  }

  private updateButtonState(): void {
    this.drawButtonBackground(this.isHovered);

    if (this.toggleButtonText) {
      const isDualEnabled = this.cameraManager.isDualCameraEnabled();
      this.toggleButtonText.setText(isDualEnabled ? "Dual: ON" : "Dual Camera");
    }
  }

  update(_time: number, _delta: number): void {
    // Update button state if camera mode changed externally
    this.updateButtonState();
  }

  destroy(): void {
    super.destroy();
  }
}
