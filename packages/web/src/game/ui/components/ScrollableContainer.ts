import * as Phaser from "phaser";

/**
 * A container that supports scrolling with mouse wheel.
 * Items inside will be clipped to the container bounds.
 */
export class ScrollableContainer {
  private container: Phaser.GameObjects.Container;
  private contentContainer: Phaser.GameObjects.Container;
  private mask: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private maxScrollY: number = 0;
  private scrollEnabled: boolean = false;
  private cachedBounds: Phaser.Geom.Rectangle | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    // Main container
    this.container = scene.add.container(x, y);

    // Content container for items to scroll
    this.contentContainer = scene.add.container(0, 0);
    this.container.add(this.contentContainer);

    // Mask for clipping
    this.mask = scene.add.graphics();
    this.updateMask();
  }

  /**
   * Add an item to the scrollable container
   */
  addItem(item: Phaser.GameObjects.GameObject, offsetY: number = 0): void {
    this.contentContainer.add(item);
    if (item instanceof Phaser.GameObjects.Container) {
      item.setPosition(item.x, offsetY);
    }
  }

  /**
   * Update the content height and calculate max scroll
   */
  setContentHeight(height: number): void {
    this.contentHeight = height;
    this.maxScrollY = Math.max(0, this.contentHeight - this.height);
  }

  /**
   * Enable scrolling with mouse wheel
   */
  enableScroll(): void {
    if (this.scrollEnabled) return;
    this.scrollEnabled = true;

    // Cache bounds for reuse
    this.updateBoundsCache();

    this.scene.input.on(
      "wheel",
      (pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
        // Only scroll if pointer is over this container (use cached bounds)
        if (this.cachedBounds && Phaser.Geom.Rectangle.Contains(this.cachedBounds, pointer.x, pointer.y)) {
          this.scroll(deltaY);
        }
      }
    );
  }

  /**
   * Disable scrolling
   */
  disableScroll(): void {
    if (!this.scrollEnabled) return;
    this.scrollEnabled = false;
    this.scene.input.off("wheel");
  }

  /**
   * Scroll by an amount
   */
  private scroll(deltaY: number): void {
    this.scrollY += deltaY * 0.5;
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
    this.contentContainer.setY(-this.scrollY);
  }

  /**
   * Set scroll position
   */
  setScroll(scrollY: number): void {
    this.scrollY = Phaser.Math.Clamp(scrollY, 0, this.maxScrollY);
    this.contentContainer.setY(-this.scrollY);
  }

  /**
   * Get current scroll position
   */
  getScroll(): number {
    return this.scrollY;
  }

  /**
   * Update the mask for clipping content
   */
  private updateMask(): void {
    this.mask.clear();
    this.mask.fillStyle(0xffffff, 1);
    this.mask.fillRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );

    // Apply geometric mask to content
    this.contentContainer.setMask(
      new Phaser.Display.Masks.GeometryMask(this.scene, this.mask)
    );
  }

  /**
   * Update the cached bounds (called when position changes)
   */
  private updateBoundsCache(): void {
    if (this.cachedBounds) {
      this.cachedBounds.x = this.x - this.width / 2;
      this.cachedBounds.y = this.y - this.height / 2;
    } else {
      this.cachedBounds = new Phaser.Geom.Rectangle(
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    }
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
    this.updateMask();
    // Update cached bounds after position changes
    this.updateBoundsCache();
  }

  /**
   * Get the main container
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Get the content container
   */
  getContentContainer(): Phaser.GameObjects.Container {
    return this.contentContainer;
  }

  /**
   * Destroy the scrollable container
   */
  destroy(): void {
    this.disableScroll();
    this.mask.destroy();
    this.container.destroy(true);
  }
}
