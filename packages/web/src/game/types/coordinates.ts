/**
 * Coordinate system type definitions
 *
 * This file defines the three main coordinate systems used in the game:
 * 1. Grid Coordinates - Logical game grid (0 to gridSize-1)
 * 2. World Coordinates - Phaser world space in pixels
 * 3. Screen Coordinates - Browser window pixels
 */

/**
 * Grid coordinates (logical game coordinates)
 * - Used by game logic and server
 * - Range: [0, gridSize-1] for both x and y
 * - Unit: grid cells
 * - Example: gridX=10, gridY=15 means column 10, row 15
 */
export interface GridCoord {
  readonly gridX: number;
  readonly gridY: number;
}

/**
 * World coordinates (Phaser world space)
 * - Used by Phaser game objects (sprites, cameras)
 * - Range: [0, worldWidth] × [0, worldHeight] in pixels
 * - Unit: pixels
 * - Example: worldX=672, worldY=992 (absolute position in game world)
 */
export interface WorldCoord {
  readonly worldX: number;
  readonly worldY: number;
}

/**
 * Screen coordinates (browser window space)
 * - Used by input events (mouse, touch)
 * - Range: [0, window.innerWidth] × [0, window.innerHeight]
 * - Unit: pixels
 * - Affected by camera scroll and zoom
 * - Example: screenX=100, screenY=200 (position on screen)
 */
export interface ScreenCoord {
  readonly screenX: number;
  readonly screenY: number;
}

/**
 * Utility type for any coordinate
 */
export type AnyCoord = GridCoord | WorldCoord | ScreenCoord;

/**
 * Type guard to check if coordinate is GridCoord
 */
export function isGridCoord(coord: AnyCoord): coord is GridCoord {
  return 'gridX' in coord && 'gridY' in coord;
}

/**
 * Type guard to check if coordinate is WorldCoord
 */
export function isWorldCoord(coord: AnyCoord): coord is WorldCoord {
  return 'worldX' in coord && 'worldY' in coord;
}

/**
 * Type guard to check if coordinate is ScreenCoord
 */
export function isScreenCoord(coord: AnyCoord): coord is ScreenCoord {
  return 'screenX' in coord && 'screenY' in coord;
}
