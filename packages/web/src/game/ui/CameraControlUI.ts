import * as Phaser from "phaser";
import { BaseUI } from "./BaseUI";
import { CameraManager } from "../managers/CameraManager";
import { GameStateManager } from "../managers/GameStateManager";
import { AgentDisplayStateManager } from "../scenes/AgentDisplayStateManager";
import { THEME } from "./theme";

/**
 * CameraControlUI displays camera controls:
 * - Toggle dual camera mode button
 * - Focus on selected agent button (visible when agent selected)
 */
export class CameraControlUI extends BaseUI {
  private cameraManager: CameraManager;
  private stateManager: GameStateManager;
  private displayStateManager: AgentDisplayStateManager;
  private toggleButtonText?: Phaser.GameObjects.Text;
  private buttonBackground?: Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void; setStrokeStyle?: (width: number, color: number, alpha?: number) => void };
  private focusButton?: Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => void };
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
    displayStateManager: AgentDisplayStateManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.cameraManager = cameraManager;
    this.stateManager = stateManager;
    this.displayStateManager = displayStateManager;
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
      bg.on("pointerdown", () => this.toggleDualCamera());
      this.buttonBackground = bg as Phaser.GameObjects.GameObject & { setFillStyle?: (color: number, alpha?: number) => void };
      this.container.add(bg);

      const focusBg = rexScene.rexUI.add.roundRectangle(focusX, 0, focusSize, focusSize, THEME.spacing.radius, THEME.colors.secondary, 0.9);
      focusBg.setInteractive();
      focusBg.on("pointerover", () => this.updateFocusButton());
      focusBg.on("pointerout", () => this.updateFocusButton());
      focusBg.on("pointerdown", () => this.focusOnSelectedAgent());
      this.focusButton = focusBg as Phaser.GameObjects.GameObject & { setVisible: (visible: boolean) => void };
      this.container.add(focusBg);

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
    this.updateFocusButton();
    this.updateFollowStatus();
  }

  private focusOnSelectedAgent(): void {
    const agent = this.stateManager.getSelectedAgent();
    if (!agent?.alive) return;
    // Use followAgent instead of deprecated focusOnAgent
    this.cameraManager.followAgent(agent.id, 1.5);
  }

  private updateFocusButton(): void {
    const agent = this.stateManager.getSelectedAgent();
    const visible = !!agent?.alive;
    this.focusButton?.setVisible(visible);
    this.focusIcon?.setVisible(visible);
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

  private updateFollowStatus(): void {
    if (!this.followStatusText || !this.followStatusBackground) return;

    const followingId = this.cameraManager.getFollowingAgentId();

    if (followingId !== null) {
      const agent = this.stateManager.getAgents().get(followingId);
      if (agent) {
        const text = `📍 Following: ${agent.name}`;
        this.followStatusText.setText(text);
        this.followStatusText.setVisible(true);

        // Draw background
        const textBounds = this.followStatusText.getBounds();
        const padding = 8;
        this.followStatusBackground.clear();
        this.followStatusBackground.fillStyle(0x000000, 0.7);
        this.followStatusBackground.fillRoundedRect(
          textBounds.x - padding,
          textBounds.y - padding,
          textBounds.width + padding * 2,
          textBounds.height + padding * 2,
          4
        );
        this.followStatusBackground.setVisible(true);
        return;
      }
    }

    // Not following, hide the indicator
    this.followStatusText.setVisible(false);
    this.followStatusBackground.setVisible(false);
  }

  update(): void {
    this.updateButtonState();
    this.updateFocusButton();
    this.updateFollowStatus();
  }

  destroy(): void {
    super.destroy();
  }
}
