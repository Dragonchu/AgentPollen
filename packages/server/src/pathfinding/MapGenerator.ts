import { TileMap, Tile, TileType } from "@battle-royale/shared";

/**
 * Utility for generating tile-based maps with obstacles.
 */
export class MapGenerator {
  /**
   * Create a map with all passable tiles.
   */
  static createEmpty(width: number, height: number): TileMap {
    const tiles: Tile[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        row.push({ type: TileType.Passable });
      }
      tiles.push(row);
    }
    return { width, height, tiles };
  }

  /**
   * Add random obstacles to a map.
   * @param map The map to modify
   * @param density Percentage of tiles to make blocked (0-1)
   * @param seed Random seed for reproducible generation
   */
  static addRandomObstacles(map: TileMap, density: number = 0.1, seed?: number): void {
    const rng = seed !== undefined ? this.seededRandom(seed) : Math.random;
    
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (rng() < density) {
          map.tiles[y][x].type = TileType.Blocked;
        }
      }
    }
  }

  /**
   * Add walls around the map border.
   */
  static addBorderWalls(map: TileMap): void {
    for (let x = 0; x < map.width; x++) {
      map.tiles[0][x].type = TileType.Blocked;
      map.tiles[map.height - 1][x].type = TileType.Blocked;
    }
    for (let y = 0; y < map.height; y++) {
      map.tiles[y][0].type = TileType.Blocked;
      map.tiles[y][map.width - 1].type = TileType.Blocked;
    }
  }

  /**
   * Add rectangular obstacles.
   */
  static addRectangle(map: TileMap, x: number, y: number, width: number, height: number): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < map.width && py >= 0 && py < map.height) {
          map.tiles[py][px].type = TileType.Blocked;
        }
      }
    }
  }

  /**
   * Check if a position is passable.
   */
  static isPassable(map: TileMap, x: number, y: number): boolean {
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      return false;
    }
    return map.tiles[y][x].type === TileType.Passable;
  }

  /**
   * Seeded random number generator for reproducible maps.
   */
  private static seededRandom(seed: number): () => number {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}
