import * as Phaser from "phaser";
import { CELL_SIZE, GRID_SIZE } from "../scenes/gameConstants";

/**
 * CameraManager handles camera movement, zooming, and viewport management
 * Supports mouse drag for panning and mouse wheel for zooming
 */
export class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  // World dimensions
  private worldWidth: number = GRID_SIZE * CELL_SIZE;
  private worldHeight: number = GRID_SIZE * CELL_SIZE;

  // Zoom constraints
  private readonly MIN_ZOOM = 0.3;
  private readonly MAX_ZOOM = 3;
  private readonly ZOOM_SPEED = 0.1;

  // Pan speed (pixels per frame when using keyboard)
  private readonly PAN_SPEED = 5;

  // Drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;

  // Keyboard pan state
  private panKeys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.init();
  }

  /**
   * Initialize camera and input handlers
   */
  private init(): void {
    // Set world bounds
    this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Set camera bounds
    this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Center camera on map
    this.centerCamera();

    // Setup input handling
    this.setupInputHandlers();
  }

  /**
   * Setup mouse and keyboard input handlers
   */
  private setupInputHandlers(): void {
    // Mouse wheel zoom
    this.scene.input.on("wheel", this.onMouseWheel, this);

    // Mouse drag for panning
    this.scene.input.on("pointerdown", this.onPointerDown, this);
    this.scene.input.on("pointermove", this.onPointerMove, this);
    this.scene.input.on("pointerup", this.onPointerUp, this);
    this.scene.input.on("pointerleave", this.onPointerUp, this);

    // Keyboard for panning
    const keys = this.scene.input.keyboard?.createCursorKeys();
    if (keys) {
      this.setupKeyboardPanning(keys);
    }

    // R key to reset camera
    const rKey = this.scene.input.keyboard?.addKey("R");
    if (rKey) {
      rKey.on("down", () => this.resetCamera());
    }
  }

  /**
   * Setup keyboard panning with arrow keys
   */
  private setupKeyboardPanning(
    _keys: Phaser.Types.Input.Keyboard.CursorKeys
  ): void {
    this.scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case "arrowup":
        case "w":
          this.panKeys.up = true;
          break;
        case "arrowdown":
        case "s":
          this.panKeys.down = true;
          break;
        case "arrowleft":
        case "a":
          this.panKeys.left = true;
          break;
        case "arrowright":
        case "d":
          this.panKeys.right = true;
          break;
      }
    });

    this.scene.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case "arrowup":
        case "w":
          this.panKeys.up = false;
          break;
        case "arrowdown":
        case "s":
          this.panKeys.down = false;
          break;
        case "arrowleft":
        case "a":
          this.panKeys.left = false;
          break;
        case "arrowright":
        case "d":
          this.panKeys.right = false;
          break;
      }
    });
  }

  /**
   * Handle mouse wheel zoom
   */
  private onMouseWheel(
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ): void {
    const currentZoom = this.camera.zoom;
    const zoomDelta = deltaY > 0 ? -this.ZOOM_SPEED : this.ZOOM_SPEED;
    const newZoom = Phaser.Math.Clamp(
      currentZoom + zoomDelta,
      this.MIN_ZOOM,
      this.MAX_ZOOM
    );

    this.camera.setZoom(newZoom);
  }

  /**
   * Handle pointer down (start dragging)
   */
  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // Only drag with left mouse button
    if (pointer.button !== 0) return;

    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.cameraStartX = this.camera.scrollX;
    this.cameraStartY = this.camera.scrollY;
  }

  /**
   * Handle pointer move (dragging)
   */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    const deltaX = pointer.x - this.dragStartX;
    const deltaY = pointer.y - this.dragStartY;

    // Convert screen delta to world delta (accounting for zoom)
    const worldDeltaX = deltaX / this.camera.zoom;
    const worldDeltaY = deltaY / this.camera.zoom;

    // Calculate new camera position
    const newX = this.cameraStartX - worldDeltaX;
    const newY = this.cameraStartY - worldDeltaY;

    // Apply camera bounds
    this.setCameraPosition(newX, newY);
  }

  /**
   * Handle pointer up (stop dragging)
   */
  private onPointerUp(): void {
    this.isDragging = false;
  }

  /**
   * Update called every frame
   */
  update(): void {
    // Handle keyboard panning
    if (this.panKeys.up || this.panKeys.down || this.panKeys.left || this.panKeys.right) {
      let panX = 0;
      let panY = 0;

      if (this.panKeys.up) panY -= this.PAN_SPEED;
      if (this.panKeys.down) panY += this.PAN_SPEED;
      if (this.panKeys.left) panX -= this.PAN_SPEED;
      if (this.panKeys.right) panX += this.PAN_SPEED;

      // Account for zoom
      this.camera.scrollX -= panX / this.camera.zoom;
      this.camera.scrollY -= panY / this.camera.zoom;
    }
  }

  /**
   * Set camera position with bounds checking
   */
  private setCameraPosition(x: number, y: number): void {
    const camera = this.camera;
    const zoom = camera.zoom;
    const viewportWidth = camera.displayWidth / zoom;
    const viewportHeight = camera.displayHeight / zoom;

    // Clamp to world bounds
    const clampedX = Phaser.Math.Clamp(
      x,
      0,
      this.worldWidth - viewportWidth
    );
    const clampedY = Phaser.Math.Clamp(
      y,
      0,
      this.worldHeight - viewportHeight
    );

    camera.setScroll(clampedX, clampedY);
  }

  /**
   * Center camera on map
   */
  centerCamera(): void {
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;

    const camera = this.camera;
    const viewportWidth = camera.displayWidth / camera.zoom;
    const viewportHeight = camera.displayHeight / camera.zoom;

    this.setCameraPosition(
      centerX - viewportWidth / 2,
      centerY - viewportHeight / 2
    );
  }

  /**
   * Reset camera to initial state (centered, zoom 1)
   */
  resetCamera(): void {
    this.camera.setZoom(1);
    this.centerCamera();
  }

  /**
   * Pan camera to a specific world position (animated)
   */
  panToPosition(targetX: number, targetY: number, duration: number = 500): void {
    const camera = this.camera;
    const zoom = camera.zoom;
    const viewportWidth = camera.displayWidth / zoom;
    const viewportHeight = camera.displayHeight / zoom;

    const scrollX = Phaser.Math.Clamp(
      targetX - viewportWidth / 2,
      0,
      this.worldWidth - viewportWidth
    );
    const scrollY = Phaser.Math.Clamp(
      targetY - viewportHeight / 2,
      0,
      this.worldHeight - viewportHeight
    );

    this.scene.tweens.add({
      targets: camera,
      scrollX,
      scrollY,
      duration,
      ease: "Power2",
    });
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    const clampedZoom = Phaser.Math.Clamp(zoom, this.MIN_ZOOM, this.MAX_ZOOM);
    this.camera.setZoom(clampedZoom);
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.camera.zoom;
  }

  /**
   * Get camera scroll position
   */
  getScrollPosition(): { x: number; y: number } {
    return {
      x: this.camera.scrollX,
      y: this.camera.scrollY,
    };
  }

  /**
   * Get viewport dimensions in world coordinates
   */
  getViewportDimensions(): { width: number; height: number } {
    return {
      width: this.camera.displayWidth / this.camera.zoom,
      height: this.camera.displayHeight / this.camera.zoom,
    };
  }

  /**
   * Get world bounds
   */
  getWorldBounds(): { width: number; height: number } {
    return {
      width: this.worldWidth,
      height: this.worldHeight,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.scene.input.off("wheel", this.onMouseWheel, this);
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.scene.input.off("pointerleave", this.onPointerUp, this);
  }
}
