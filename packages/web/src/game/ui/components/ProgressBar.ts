import * as Phaser from "phaser";

export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: number;
  fillColor?: number;
  borderColor?: number;
  borderWidth?: number;
  value?: number; // 0-1
}

/**
 * A progress bar component that can be updated with a value (0-1).
 * Useful for displaying health, shield, etc.
 */
export class ProgressBar {
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private border?: Phaser.GameObjects.Rectangle;
  private value: number = 1;

  private width: number;
  private height: number;

  constructor(scene: Phaser.Scene, config: ProgressBarConfig) {
    this.width = config.width;
    this.height = config.height;
    this.value = config.value ?? 1;

    const bgColor = config.backgroundColor ?? 0x333333;
    const fillColor = config.fillColor ?? 0x00ff00;
    const borderColor = config.borderColor ?? 0xffffff;
    const borderWidth = config.borderWidth ?? 2;

    this.container = scene.add.container(config.x, config.y);

    // Background
    this.background = scene.add.rectangle(0, 0, this.width, this.height, bgColor);
    this.container.add(this.background);

    // Fill
    this.fill = scene.add.rectangle(
      -this.width / 2 + (this.width * this.value) / 2,
      0,
      this.width * this.value,
      this.height,
      fillColor
    );
    this.container.add(this.fill);

    // Border (optional)
    if (borderWidth > 0) {
      this.border = scene.add.rectangle(0, 0, this.width, this.height);
      this.border.setFillStyle(undefined);
      this.border.setStrokeStyle(borderWidth, borderColor);
      this.container.add(this.border);
    }
  }

  /**
   * Update the progress bar value (0-1)
   */
  setValue(value: number): void {
    this.value = Phaser.Math.Clamp(value, 0, 1);
    const fillWidth = this.width * this.value;
    const fillX = -this.width / 2 + fillWidth / 2;

    this.fill.setPosition(fillX, 0);
    this.fill.setDisplaySize(fillWidth, this.height);
  }

  /**
   * Get the current value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Set the fill color
   */
  setFillColor(color: number): void {
    this.fill.setFillStyle(color);
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: number): void {
    this.background.setFillStyle(color);
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Get the container
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Destroy the progress bar
   */
  destroy(): void {
    this.container.destroy(true);
  }
}
