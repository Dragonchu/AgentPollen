import { readFileSync } from "node:fs";
import { TileMap, TileType, Tile, Waypoint } from "@battle-royale/shared";

/**
 * Compact collision format stored in server/data/village_collision.json.
 * Generated from the GenerativeAgentsCN tilemap.json Collisions layer.
 */
interface VillageCollisionData {
  width: number;
  height: number;
  /** Row-major 2-D grid: 0 = passable, 1 = blocked */
  tiles: number[][];
  /** Pre-defined agent spawn positions from the Spawning Blocks layer */
  spawnPoints: Waypoint[];
}

/**
 * Loads village collision data and converts it to the game's TileMap format.
 *
 * The source data is derived from the GenerativeAgentsCN tilemap.json
 * "Collisions" layer so that the server-side pathfinding and boundary checks
 * are aligned with the visual map rendered on the client.
 */
export class TiledMapLoader {
  /**
   * Load the village collision data from a JSON file and return a TileMap.
   * @param filePath Absolute path to village_collision.json
   */
  static loadFromFile(filePath: string): { tileMap: TileMap; spawnPoints: Waypoint[] } {
    const raw = readFileSync(filePath, "utf-8");
    const data: VillageCollisionData = JSON.parse(raw);
    return TiledMapLoader.fromCollisionData(data);
  }

  /**
   * Convert raw collision data to the game's TileMap.
   */
  static fromCollisionData(data: VillageCollisionData): { tileMap: TileMap; spawnPoints: Waypoint[] } {
    const tiles: Tile[][] = data.tiles.map((row) =>
      row.map((cell): Tile => ({ type: cell !== 0 ? TileType.Blocked : TileType.Passable }))
    );

    const tileMap: TileMap = {
      width: data.width,
      height: data.height,
      tiles,
    };

    if (!data.spawnPoints || data.spawnPoints.length === 0) {
      console.warn("[TiledMapLoader] No spawn points found in collision data. Agents will use random passable tiles.");
    }

    return { tileMap, spawnPoints: data.spawnPoints ?? [] };
  }
}
