/**
 * ResponsiveScaler helps calculate UI element sizes based on canvas dimensions
 * using percentage-based layout for better responsiveness across screen sizes.
 * 
 * Layout percentages are calculated based on the reference design at 1280x720:
 * - Sidebar: 220px / 1280px = 17% of width
 * - Right Panel: 340px / 1280px = 26.5% of width
 * - Header: 56px / 720px = 7.8% of height
 * - Padding: 8px / 1280px = 0.625% of width
 * 
 * This ensures consistent proportions across all screen sizes while maintaining
 * minimum dimensions for usability on small screens.
 */
export class ResponsiveScaler {
  private canvasWidth: number;
  private canvasHeight: number;
  
  // Percentage-based layout configuration
  private readonly sidebarWidthPercent: number = 0.17; // 17% of canvas width
  private readonly rightPanelWidthPercent: number = 0.265; // 26.5% of canvas width
  private readonly headerHeightPercent: number = 0.078; // 7.8% of canvas height
  private readonly paddingPercent: number = 0.00625; // 0.625% of canvas width

  // Minimum dimensions to ensure usability on very small screens
  private readonly minSidebarWidth: number = 150;
  private readonly minRightPanelWidth: number = 250;
  private readonly minHeaderHeight: number = 40;
  private readonly minPadding: number = 4;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Get the scale factor based on canvas size (for font scaling)
   * Uses 1280x720 as reference for backward compatibility
   */
  getScaleFactor(): number {
    const baseWidth = 1280;
    const baseHeight = 720;
    const scaleX = this.canvasWidth / baseWidth;
    const scaleY = this.canvasHeight / baseHeight;
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
   * Scale a dimension based on the scale factor (for backward compatibility)
   * Uses 1280x720 as reference and scales proportionally
   */
  scaleDimension(baseDimension: number): number {
    // For backward compatibility, scale based on the scale factor
    return Math.round(baseDimension * this.getScaleFactor());
  }

  /**
   * Get sidebar width as percentage of canvas width
   */
  getSidebarWidth(): number {
    const width = Math.round(this.canvasWidth * this.sidebarWidthPercent);
    return Math.max(this.minSidebarWidth, width);
  }

  /**
   * Get right panel width as percentage of canvas width
   */
  getRightPanelWidth(): number {
    const width = Math.round(this.canvasWidth * this.rightPanelWidthPercent);
    return Math.max(this.minRightPanelWidth, width);
  }

  /**
   * Get header height as percentage of canvas height
   */
  getHeaderHeight(): number {
    const height = Math.round(this.canvasHeight * this.headerHeightPercent);
    return Math.max(this.minHeaderHeight, height);
  }

  /**
   * Get padding as percentage of canvas width
   */
  getPadding(): number {
    const padding = Math.round(this.canvasWidth * this.paddingPercent);
    return Math.max(this.minPadding, padding);
  }

  /**
   * Get a percentage-based width
   * @param ratio - A value between 0 and 1 representing the percentage (e.g., 0.5 for 50%)
   * @returns The calculated width in pixels
   */
  getPercentageWidth(ratio: number): number {
    if (ratio < 0 || ratio > 1) {
      console.warn(`getPercentageWidth: ratio ${ratio} is outside [0,1] range`);
    }
    return Math.round(this.canvasWidth * ratio);
  }

  /**
   * Get a percentage-based height
   * @param ratio - A value between 0 and 1 representing the percentage (e.g., 0.5 for 50%)
   * @returns The calculated height in pixels
   */
  getPercentageHeight(ratio: number): number {
    if (ratio < 0 || ratio > 1) {
      console.warn(`getPercentageHeight: ratio ${ratio} is outside [0,1] range`);
    }
    return Math.round(this.canvasHeight * ratio);
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
