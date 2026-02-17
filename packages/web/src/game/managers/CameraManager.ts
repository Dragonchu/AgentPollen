import * as Phaser from "phaser";
import { CELL_SIZE } from "../scenes/gameConstants";

/**
 * CameraManager handles camera movement, zooming, and viewport management
 * for the world camera. Supports mouse drag panning and mouse wheel zooming.
 * Now supports dual camera mode with a secondary PiP (Picture-in-Picture) camera.
 */
export class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private pipCamera: Phaser.Cameras.Scene2D.Camera | null = null;

  // World dimensions (will be set dynamically from backend gridSize)
  private worldWidth: number = 0;
  private worldHeight: number = 0;

  // Dual camera settings
  private dualCameraEnabled: boolean = false;
  private pipCameraWidth: number = 300;
  private pipCameraHeight: number = 300;
  private pipCameraPadding: number = 20;
  private pipTargetX: number = 0;
  private pipTargetY: number = 0;
  private pipBorderGraphics: Phaser.GameObjects.Graphics | null = null;
  private pipLabelText: Phaser.GameObjects.Text | null = null;

  // Zoom constraints (dynamically computed)
  private fitZoom: number = 1;
  private minZoom: number = 0.3;
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

  // UI overlap check callback
  private isPointerOverUI?: (x: number, y: number) => boolean;

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this.camera = camera;
    // Don't call init() here - camera dimensions not ready yet
  }

  /**
   * Set world dimensions based on backend grid size.
   * This should be called when tilemap is received from server.
   * @param gridWidth - Grid width in cells
   * @param gridHeight - Grid height in cells
   */
  setWorldDimensions(gridWidth: number, gridHeight: number): void {
    this.worldWidth = gridWidth * CELL_SIZE;
    this.worldHeight = gridHeight * CELL_SIZE;

    // If already initialized, update camera bounds and recalculate zoom
    if (this.camera.displayWidth > 0) {
      this.updateCameraBoundsAndZoom();
    }
  }

  /**
   * Update camera bounds and zoom constraints based on current world dimensions
   */
  private updateCameraBoundsAndZoom(): void {
    // Set physics world bounds (if physics is enabled)
    if (this.scene.physics?.world) {
      this.scene.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    // Set camera bounds
    this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Recalculate fitZoom using Math.max to ensure viewport never exceeds map bounds
    // This means on non-square viewports, one dimension will be fully visible
    // and the other will require panning (standard MOBA/RTS behavior)
    this.fitZoom = Math.max(
      this.camera.displayWidth / this.worldWidth,
      this.camera.displayHeight / this.worldHeight
    );

    // Set minZoom = fitZoom to prevent zooming out beyond map bounds
    this.minZoom = this.fitZoom;

    // Clamp current zoom to new constraints
    const currentZoom = this.camera.zoom;
    if (currentZoom < this.minZoom || currentZoom > this.MAX_ZOOM) {
      this.camera.setZoom(Phaser.Math.Clamp(currentZoom, this.minZoom, this.MAX_ZOOM));
    }

    // Re-center camera
    this.centerCamera();

    // Update PiP camera bounds if it exists
    if (this.pipCamera) {
      this.pipCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }
  }

  /**
   * Initialize camera after scale system is ready.
   * MUST be called after scene.create() when camera dimensions are valid.
   */
  initialize(): void {
    // Validate camera dimensions before proceeding
    if (this.camera.displayWidth === 0 || this.camera.displayHeight === 0) {
      console.warn(
        `CameraManager.initialize() called but camera dimensions not ready: ` +
        `${this.camera.displayWidth}x${this.camera.displayHeight}. Retrying...`
      );

      // Retry on next frame when scale system should be ready
      this.scene.time.delayedCall(100, () => this.initialize());
      return;
    }

    this.init();
    this.setupResizeListener();
  }

  /**
   * Set callback to check if pointer is over UI (to block zoom when scrolling UI)
   */
  setPointerOverUICheck(fn: (x: number, y: number) => boolean): void {
    this.isPointerOverUI = fn;
  }

  /**
   * Setup listener for window/canvas resize events
   */
  private setupResizeListener(): void {
    this.scene.scale.on("resize", this.onResize, this);
  }

  /**
   * Initialize camera and input handlers
   */
  private init(): void {
    // If world dimensions are already set (tilemap received), configure camera
    if (this.worldWidth > 0 && this.worldHeight > 0) {
      this.updateCameraBoundsAndZoom();
    } else {
      // Otherwise, set a default zoom and wait for tilemap
      this.camera.setZoom(1);
      console.warn("CameraManager initialized before world dimensions were set. Camera will be configured when tilemap is received.");
    }

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
   * Handle mouse wheel zoom (zoom around mouse cursor)
   */
  private onMouseWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ): void {
    // Don't zoom if pointer is over UI
    if (this.isPointerOverUI?.(pointer.x, pointer.y)) return;

    const oldZoom = this.camera.zoom;

    // 1. Get mouse screen coordinates
    const mouseScreenX = pointer.x;
    const mouseScreenY = pointer.y;

    // 2. Calculate world coordinates at current zoom (before scaling)
    const worldX = this.camera.scrollX + mouseScreenX / oldZoom;
    const worldY = this.camera.scrollY + mouseScreenY / oldZoom;

    // 3. Calculate new zoom level
    const zoomDelta = deltaY > 0 ? -this.ZOOM_SPEED : this.ZOOM_SPEED;
    const newZoom = Phaser.Math.Clamp(
      oldZoom + zoomDelta,
      this.minZoom,
      this.MAX_ZOOM
    );

    // 4. Update camera zoom
    this.camera.setZoom(newZoom);

    // 5. Adjust camera position to keep the world coordinate at the same screen position
    const newScrollX = worldX - mouseScreenX / newZoom;
    const newScrollY = worldY - mouseScreenY / newZoom;

    // 6. Apply bounds checking
    this.setCameraPosition(newScrollX, newScrollY);
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

  // ============ Coordinate Conversion ============

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: this.camera.scrollX + screenX / this.camera.zoom,
      y: this.camera.scrollY + screenY / this.camera.zoom,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.camera.scrollX) * this.camera.zoom,
      y: (worldY - this.camera.scrollY) * this.camera.zoom,
    };
  }

  /**
   * Convert screen coordinates to grid coordinates
   */
  screenToGrid(screenX: number, screenY: number): { gx: number; gy: number } {
    const world = this.screenToWorld(screenX, screenY);
    return {
      gx: Math.floor(world.x / CELL_SIZE),
      gy: Math.floor(world.y / CELL_SIZE),
    };
  }

  // ============ Camera Control ============

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
   * Reset camera to initial state (centered, fitZoom)
   */
  resetCamera(): void {
    this.camera.setZoom(this.fitZoom);
    this.centerCamera();
  }

  /**
   * Focus camera on a world position (smooth pan to center agent)
   */
  focusOnAgent(worldX: number, worldY: number, duration: number = 400): void {
    this.panToPosition(worldX, worldY, duration);
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
    const clampedZoom = Phaser.Math.Clamp(zoom, this.minZoom, this.MAX_ZOOM);
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

  // ============ Dual Camera Management ============

  /**
   * Enable or disable dual camera mode
   */
  setDualCameraEnabled(enabled: boolean): void {
    this.dualCameraEnabled = enabled;

    if (enabled && !this.pipCamera) {
      this.createPipCamera();
    } else if (!enabled && this.pipCamera) {
      this.destroyPipCamera();
    }
  }

  /**
   * Check if dual camera mode is enabled
   */
  isDualCameraEnabled(): boolean {
    return this.dualCameraEnabled;
  }

  /**
   * Create the Picture-in-Picture camera
   */
  private createPipCamera(): void {
    // Calculate PiP camera position (bottom-right corner by default)
    const mainCameraWidth = this.camera.displayWidth;
    const mainCameraHeight = this.camera.displayHeight;

    const pipX = mainCameraWidth - this.pipCameraWidth - this.pipCameraPadding;
    const pipY = mainCameraHeight - this.pipCameraHeight - this.pipCameraPadding;

    // Create the PiP camera
    this.pipCamera = this.scene.cameras.add(
      pipX,
      pipY,
      this.pipCameraWidth,
      this.pipCameraHeight
    );

    // Set up PiP camera properties
    this.pipCamera.setZoom(2); // 2x zoom for close-up view
    this.pipCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Position at center initially
    this.setPipCameraTarget(this.worldWidth / 2, this.worldHeight / 2);

    // Create border graphics (rendered by main camera, not PiP camera)
    this.pipBorderGraphics = this.scene.add.graphics();
    this.pipBorderGraphics.setDepth(10000); // Ensure border is on top of everything
    this.drawPipBorder(pipX, pipY);
  }

  /**
   * Destroy the Picture-in-Picture camera
   */
  private destroyPipCamera(): void {
    if (this.pipCamera) {
      this.scene.cameras.remove(this.pipCamera);
      this.pipCamera = null;
    }

    if (this.pipBorderGraphics) {
      this.pipBorderGraphics.destroy();
      this.pipBorderGraphics = null;
    }

    if (this.pipLabelText) {
      this.pipLabelText.destroy();
      this.pipLabelText = null;
    }
  }

  /**
   * Draw border around PiP camera
   */
  private drawPipBorder(x: number, y: number): void {
    if (!this.pipBorderGraphics) return;

    this.pipBorderGraphics.clear();

    // Draw border
    this.pipBorderGraphics.lineStyle(4, 0x00ff00, 1);
    this.pipBorderGraphics.strokeRect(x, y, this.pipCameraWidth, this.pipCameraHeight);

    // Draw label background
    this.pipBorderGraphics.fillStyle(0x000000, 0.7);
    this.pipBorderGraphics.fillRect(x, y, 100, 24);

    // Destroy old label text if exists
    if (this.pipLabelText) {
      this.pipLabelText.destroy();
    }

    // Create new label text
    this.pipLabelText = this.scene.add.text(x + 5, y + 5, "Close-Up", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#00ff00",
      fontStyle: "bold",
    });
    this.pipLabelText.setDepth(10001);
    
    // Make main camera ignore the border and label
    this.camera.ignore([this.pipBorderGraphics, this.pipLabelText]);
  }

  /**
   * Set the target position for the PiP camera (in world coordinates)
   */
  setPipCameraTarget(worldX: number, worldY: number): void {
    this.pipTargetX = worldX;
    this.pipTargetY = worldY;

    if (this.pipCamera) {
      // Center the PiP camera on the target
      const zoom = this.pipCamera.zoom;
      const viewportWidth = this.pipCamera.displayWidth / zoom;
      const viewportHeight = this.pipCamera.displayHeight / zoom;

      const scrollX = Phaser.Math.Clamp(
        worldX - viewportWidth / 2,
        0,
        this.worldWidth - viewportWidth
      );
      const scrollY = Phaser.Math.Clamp(
        worldY - viewportHeight / 2,
        0,
        this.worldHeight - viewportHeight
      );

      this.pipCamera.setScroll(scrollX, scrollY);
    }
  }

  /**
   * Handle canvas resize - recalculate fitZoom, minZoom, update cameras
   */
  onResize(): void {
    // Validate dimensions before recalculating
    if (this.camera.displayWidth === 0 || this.camera.displayHeight === 0) {
      console.warn("CameraManager.onResize() called with invalid camera dimensions");
      return;
    }

    // Recalculate zoom constraints based on new dimensions
    // Use Math.max to ensure viewport never exceeds map bounds
    this.fitZoom = Math.max(
      this.camera.displayWidth / this.worldWidth,
      this.camera.displayHeight / this.worldHeight
    );
    this.minZoom = this.fitZoom;

    // Clamp current zoom to new constraints
    const currentZoom = this.camera.zoom;
    if (currentZoom < this.minZoom || currentZoom > this.MAX_ZOOM) {
      this.camera.setZoom(Phaser.Math.Clamp(currentZoom, this.minZoom, this.MAX_ZOOM));
    }

    // Update camera bounds (in case they changed)
    this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Re-center if needed to keep viewport within bounds
    this.centerCamera();

    // Update PiP camera position if enabled
    this.updatePipCameraPosition();
  }

  /**
   * Get the PiP camera (for testing/debugging)
   */
  getPipCamera(): Phaser.Cameras.Scene2D.Camera | null {
    return this.pipCamera;
  }

  /**
   * Set PiP camera zoom level
   */
  setPipCameraZoom(zoom: number): void {
    if (this.pipCamera) {
      const clampedZoom = Phaser.Math.Clamp(zoom, 1, 4);
      this.pipCamera.setZoom(clampedZoom);
      // Update target position to maintain center
      this.setPipCameraTarget(this.pipTargetX, this.pipTargetY);
    }
  }

  /**
   * Update PiP camera position when main camera is resized
   */
  private updatePipCameraPosition(): void {
    if (this.pipCamera && this.pipBorderGraphics) {
      const mainCameraWidth = this.camera.displayWidth;
      const mainCameraHeight = this.camera.displayHeight;

      const pipX = mainCameraWidth - this.pipCameraWidth - this.pipCameraPadding;
      const pipY = mainCameraHeight - this.pipCameraHeight - this.pipCameraPadding;

      this.pipCamera.setPosition(pipX, pipY);
      this.drawPipBorder(pipX, pipY);
    }
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

    // Clean up resize listener
    this.scene.scale.off("resize", this.onResize, this);

    this.destroyPipCamera();
  }
}
