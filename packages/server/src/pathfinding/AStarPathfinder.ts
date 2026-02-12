import { PathfindingEngine, TileMap, Waypoint, Path, TileType } from "@battle-royale/shared";

/**
 * A* pathfinding algorithm implementation.
 * Finds the shortest path between two points on a tile-based map.
 */
export class AStarPathfinder implements PathfindingEngine {
  readonly name = "astar";

  /**
   * Find a path from start to goal using A* algorithm.
   * Returns null if no path exists or if start/goal are invalid.
   */
  findPath(map: TileMap, start: Waypoint, goal: Waypoint): Path | null {
    // Validate inputs
    if (!this.isValid(map, start) || !this.isValid(map, goal)) {
      return null;
    }

    // If start and goal are the same, return trivial path
    if (start.x === goal.x && start.y === goal.y) {
      return { waypoints: [start], cost: 0 };
    }

    // If start or goal is blocked, return null
    if (
      map.tiles[start.y][start.x].type === TileType.Blocked ||
      map.tiles[goal.y][goal.x].type === TileType.Blocked
    ) {
      return null;
    }

    // Initialize data structures
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, Waypoint>();

    const startKey = this.key(start);
    const goalKey = this.key(goal);

    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, goal));

    // A* main loop
    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let currentKey = "";
      let lowestF = Infinity;
      for (const key of openSet) {
        const f = fScore.get(key) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentKey = key;
        }
      }

      if (currentKey === "") break;

      const current = this.fromKey(currentKey);

      // Goal reached
      if (currentKey === goalKey) {
        return this.reconstructPath(cameFrom, current, gScore.get(currentKey) ?? 0);
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      // Check all neighbors
      for (const neighbor of this.getNeighbors(map, current)) {
        const neighborKey = this.key(neighbor);

        if (closedSet.has(neighborKey)) continue;

        const tile = map.tiles[neighbor.y][neighbor.x];
        const movementCost = tile.weight ?? 1;
        const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + movementCost;

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        } else if (tentativeGScore >= (gScore.get(neighborKey) ?? Infinity)) {
          continue;
        }

        // This path is the best so far
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
      }
    }

    // No path found
    return null;
  }

  /**
   * Reconstruct the path from start to goal by following cameFrom links.
   */
  private reconstructPath(cameFrom: Map<string, Waypoint>, current: Waypoint, cost: number): Path {
    const waypoints: Waypoint[] = [current];
    let currentKey = this.key(current);

    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey)!;
      waypoints.unshift(current);
      currentKey = this.key(current);
    }

    return { waypoints, cost };
  }

  /**
   * Get valid neighboring tiles (4-directional movement).
   */
  private getNeighbors(map: TileMap, pos: Waypoint): Waypoint[] {
    const neighbors: Waypoint[] = [];
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
    ];

    for (const dir of directions) {
      const neighbor = { x: pos.x + dir.x, y: pos.y + dir.y };
      if (this.isValid(map, neighbor) && map.tiles[neighbor.y][neighbor.x].type !== TileType.Blocked) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  /**
   * Manhattan distance heuristic (admissible for 4-directional movement).
   */
  private heuristic(a: Waypoint, b: Waypoint): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Check if a waypoint is within map bounds.
   */
  private isValid(map: TileMap, pos: Waypoint): boolean {
    return pos.x >= 0 && pos.x < map.width && pos.y >= 0 && pos.y < map.height;
  }

  /**
   * Generate a unique string key for a waypoint.
   */
  private key(pos: Waypoint): string {
    return `${pos.x},${pos.y}`;
  }

  /**
   * Parse a waypoint from a string key.
   */
  private fromKey(key: string): Waypoint {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  }
}
