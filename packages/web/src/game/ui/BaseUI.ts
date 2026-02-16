import * as Phaser from "phaser";

/**
 * BaseUI is an abstract base class for all UI components in the game.
 * Provides common lifecycle management, container handling, and drawing utilities.
 */
export abstract class BaseUI {
  protected scene: Phaser.Scene;
  protected container: Phaser.GameObjects.Container;
  protected x: number;
  protected y: number;
  protected width: number;
  protected height: number;
  protected visible: boolean = true;
  protected worldCamera?: Phaser.Cameras.Scene2D.Camera;

  constructor(
    scene: Phaser.Scene,
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.worldCamera = worldCamera;

    this.container = scene.add.container(x, y);
    this.container.setDepth(1000); // Ensure UI is on top

    // Make worldCamera ignore this UI container so it doesn't move with world pan/zoom
    if (worldCamera) {
      worldCamera.ignore(this.container);
    }
  }

  /**
   * Initialize the UI component (called after construction)
   */
  abstract create(): void;

  /**
   * Update the UI component (called each frame)
   */
  update(_time: number, _delta: number): void {
    // Override if needed
  }

  /**
   * Destroy the UI component
   */
  destroy(): void {
    this.container.destroy(true);
  }

  /**
   * Show the UI component
   */
  show(): void {
    this.visible = true;
    this.container.setVisible(true);
  }

  /**
   * Hide the UI component
   */
  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  /**
   * Check if the UI component is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Set the position of the UI component
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  /**
   * Set the size of the UI component
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Get the container
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Draw a rectangle
   */
  protected drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number = 1
  ): Phaser.GameObjects.Rectangle {
    const rect = this.scene.add.rectangle(x, y, width, height, color, alpha);
    this.container.add(rect);
    return rect;
  }

  /**
   * Draw text
   */
  protected drawText(
    x: number,
    y: number,
    text: string,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const txtObj = this.scene.add.text(x, y, text, style);
    this.container.add(txtObj);
    return txtObj;
  }

  /**
   * Draw a line
   */
  protected drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    alpha: number = 1
  ): Phaser.GameObjects.Line {
    const line = this.scene.add.line(x1, y1, 0, 0, x2 - x1, y2 - y1, color, alpha);
    this.container.add(line);
    return line;
  }

  /**
   * Create a graphics object for advanced drawing
   */
  protected createGraphics(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    this.container.add(graphics);
    return graphics;
  }

  /**
   * Create a sprite
   */
  protected createSprite(x: number, y: number, texture: string): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(x, y, texture);
    this.container.add(sprite);
    return sprite;
  }

  /**
   * Create an image
   */
  protected createImage(x: number, y: number, texture: string): Phaser.GameObjects.Image {
    const image = this.scene.add.image(x, y, texture);
    this.container.add(image);
    return image;
  }

  /**
   * Add an existing game object to the container
   */
  protected addToContainer(obj: Phaser.GameObjects.GameObject): void {
    this.container.add(obj);
  }

  /**
   * Remove a game object from the container
   */
  protected removeFromContainer(obj: Phaser.GameObjects.GameObject): void {
    this.container.remove(obj, false);
  }

  /**
   * Get the position of the UI component
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get the size of the UI component
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
