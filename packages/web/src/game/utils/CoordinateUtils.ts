import * as Phaser from "phaser";
import type { GridCoord, WorldCoord, ScreenCoord } from "../types/coordinates";

/**
 * Centralized coordinate conversion utilities
 *
 * All coordinate transformations should go through this class to ensure consistency.
 * This eliminates duplicate conversion logic and makes the codebase easier to maintain.
 */
export class CoordinateUtils {
  /**
   * Convert grid coordinates to world coordinates (center of cell)
   *
   * @param grid - Grid coordinates
   * @param cellSize - Size of each cell in pixels (typically CELL_SIZE = 64)
   * @returns World coordinates pointing to the center of the grid cell
   *
   * @example
   * const grid = { gridX: 10, gridY: 15 };
   * const world = CoordinateUtils.gridToWorld(grid, 64);
   * // world = { worldX: 672, worldY: 992 }
   * // Calculation: worldX = 10 * 64 + 64/2 = 672
   */
  static gridToWorld(grid: GridCoord, cellSize: number): WorldCoord {
    return {
      worldX: grid.gridX * cellSize + cellSize / 2,
      worldY: grid.gridY * cellSize + cellSize / 2,
    };
  }

  /**
   * Convert grid coordinates to world coordinates (top-left corner of cell)
   *
   * @param grid - Grid coordinates
   * @param cellSize - Size of each cell in pixels
   * @returns World coordinates pointing to the top-left corner of the grid cell
   */
  static gridToWorldCorner(grid: GridCoord, cellSize: number): WorldCoord {
    return {
      worldX: grid.gridX * cellSize,
      worldY: grid.gridY * cellSize,
    };
  }

  /**
   * Convert world coordinates to grid coordinates (floor)
   *
   * @param world - World coordinates
   * @param cellSize - Size of each cell in pixels
   * @returns Grid coordinates (floored to nearest cell)
   *
   * @example
   * const world = { worldX: 672, worldY: 992 };
   * const grid = CoordinateUtils.worldToGrid(world, 64);
   * // grid = { gridX: 10, gridY: 15 }
   */
  static worldToGrid(world: WorldCoord, cellSize: number): GridCoord {
    return {
      gridX: Math.floor(world.worldX / cellSize),
      gridY: Math.floor(world.worldY / cellSize),
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   *
   * Takes into account camera scroll position and zoom level
   *
   * @param world - World coordinates
   * @param camera - Phaser camera
   * @returns Screen coordinates
   *
   * @example
   * const world = { worldX: 1000, worldY: 1000 };
   * const screen = CoordinateUtils.worldToScreen(world, camera);
   * // If camera.scrollX=500, scrollY=500, zoom=1.5:
   * // screen = { screenX: (1000-500)*1.5=750, screenY: (1000-500)*1.5=750 }
   */
  static worldToScreen(
    world: WorldCoord,
    camera: Phaser.Cameras.Scene2D.Camera
  ): ScreenCoord {
    return {
      screenX: (world.worldX - camera.scrollX) * camera.zoom,
      screenY: (world.worldY - camera.scrollY) * camera.zoom,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   *
   * Inverse of worldToScreen - useful for mouse/touch input handling
   *
   * @param screen - Screen coordinates
   * @param camera - Phaser camera
   * @returns World coordinates
   *
   * @example
   * const screen = { screenX: 100, screenY: 200 };
   * const world = CoordinateUtils.screenToWorld(screen, camera);
   * // If camera.scrollX=0, scrollY=0, zoom=1:
   * // world = { worldX: 100, worldY: 200 }
   */
  static screenToWorld(
    screen: ScreenCoord,
    camera: Phaser.Cameras.Scene2D.Camera
  ): WorldCoord {
    return {
      worldX: camera.scrollX + screen.screenX / camera.zoom,
      worldY: camera.scrollY + screen.screenY / camera.zoom,
    };
  }

  /**
   * Convert screen coordinates to grid coordinates (convenience method)
   *
   * Combines screenToWorld and worldToGrid
   *
   * @param screen - Screen coordinates
   * @param camera - Phaser camera
   * @param cellSize - Size of each cell in pixels
   * @returns Grid coordinates
   */
  static screenToGrid(
    screen: ScreenCoord,
    camera: Phaser.Cameras.Scene2D.Camera,
    cellSize: number
  ): GridCoord {
    const world = this.screenToWorld(screen, camera);
    return this.worldToGrid(world, cellSize);
  }

  /**
   * Convert grid coordinates to screen coordinates (convenience method)
   *
   * Combines gridToWorld and worldToScreen
   *
   * @param grid - Grid coordinates
   * @param camera - Phaser camera
   * @param cellSize - Size of each cell in pixels
   * @returns Screen coordinates
   */
  static gridToScreen(
    grid: GridCoord,
    camera: Phaser.Cameras.Scene2D.Camera,
    cellSize: number
  ): ScreenCoord {
    const world = this.gridToWorld(grid, cellSize);
    return this.worldToScreen(world, camera);
  }

  /**
   * Calculate distance between two grid coordinates (Manhattan distance)
   *
   * @param a - First grid coordinate
   * @param b - Second grid coordinate
   * @returns Manhattan distance (sum of absolute differences)
   */
  static gridDistance(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
  }

  /**
   * Calculate distance between two world coordinates (Euclidean distance)
   *
   * @param a - First world coordinate
   * @param b - Second world coordinate
   * @returns Euclidean distance in pixels
   */
  static worldDistance(a: WorldCoord, b: WorldCoord): number {
    const dx = a.worldX - b.worldX;
    const dy = a.worldY - b.worldY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if grid coordinate is within bounds
   *
   * @param grid - Grid coordinate to check
   * @param gridWidth - Grid width (exclusive upper bound)
   * @param gridHeight - Grid height (exclusive upper bound)
   * @returns True if coordinate is within [0, width) × [0, height)
   */
  static isGridInBounds(
    grid: GridCoord,
    gridWidth: number,
    gridHeight: number
  ): boolean {
    return (
      grid.gridX >= 0 &&
      grid.gridX < gridWidth &&
      grid.gridY >= 0 &&
      grid.gridY < gridHeight
    );
  }

  /**
   * Check if world coordinate is within bounds
   *
   * @param world - World coordinate to check
   * @param worldWidth - World width in pixels
   * @param worldHeight - World height in pixels
   * @returns True if coordinate is within [0, width] × [0, height]
   */
  static isWorldInBounds(
    world: WorldCoord,
    worldWidth: number,
    worldHeight: number
  ): boolean {
    return (
      world.worldX >= 0 &&
      world.worldX <= worldWidth &&
      world.worldY >= 0 &&
      world.worldY <= worldHeight
    );
  }

  /**
   * Clamp grid coordinate to bounds
   *
   * @param grid - Grid coordinate to clamp
   * @param gridWidth - Grid width
   * @param gridHeight - Grid height
   * @returns Clamped grid coordinate
   */
  static clampGrid(
    grid: GridCoord,
    gridWidth: number,
    gridHeight: number
  ): GridCoord {
    return {
      gridX: Phaser.Math.Clamp(grid.gridX, 0, gridWidth - 1),
      gridY: Phaser.Math.Clamp(grid.gridY, 0, gridHeight - 1),
    };
  }

  /**
   * Clamp world coordinate to bounds
   *
   * @param world - World coordinate to clamp
   * @param worldWidth - World width in pixels
   * @param worldHeight - World height in pixels
   * @returns Clamped world coordinate
   */
  static clampWorld(
    world: WorldCoord,
    worldWidth: number,
    worldHeight: number
  ): WorldCoord {
    return {
      worldX: Phaser.Math.Clamp(world.worldX, 0, worldWidth),
      worldY: Phaser.Math.Clamp(world.worldY, 0, worldHeight),
    };
  }
}
