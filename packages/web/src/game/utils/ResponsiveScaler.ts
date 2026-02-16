/**
 * ResponsiveScaler helps scale UI elements based on canvas dimensions
 * This ensures the UI looks good at any screen size
 */
export class ResponsiveScaler {
  private canvasWidth: number;
  private canvasHeight: number;
  private baseWidth: number = 1280; // Reference width
  private baseHeight: number = 720; // Reference height

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Get the scale factor based on canvas size
   */
  getScaleFactor(): number {
    const scaleX = this.canvasWidth / this.baseWidth;
    const scaleY = this.canvasHeight / this.baseHeight;
    return Math.min(scaleX, scaleY);
  }

  /**
   * Scale a font size based on canvas dimensions
   */
  scaleFontSize(baseSize: number): number {
    const scale = this.getScaleFactor();
    // Ensure minimum and maximum bounds
    return Math.max(8, Math.min(baseSize * scale, baseSize * 2));
  }

  /**
   * Scale a dimension (width, height, padding, etc.)
   */
  scaleDimension(baseDimension: number): number {
    return Math.round(baseDimension * this.getScaleFactor());
  }

  /**
   * Get adjusted sidebar width
   */
  getSidebarWidth(): number {
    const baseWidth = 220;
    return Math.max(150, this.scaleDimension(baseWidth));
  }

  /**
   * Get adjusted right panel width
   */
  getRightPanelWidth(): number {
    const baseWidth = 340;
    return Math.max(250, this.scaleDimension(baseWidth));
  }

  /**
   * Get adjusted header height
   */
  getHeaderHeight(): number {
    const baseHeight = 56;
    return Math.max(40, this.scaleDimension(baseHeight));
  }

  /**
   * Get adjusted padding
   */
  getPadding(): number {
    return Math.max(4, this.scaleDimension(8));
  }

  /**
   * Get canvas dimensions
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Update canvas dimensions (call when canvas is resized)
   */
  updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
