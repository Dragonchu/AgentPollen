# Pathfinding System & Map Storage

This document describes the pathfinding and map storage features implemented in the AI Battle Royale game.

## Overview

The game now includes:
1. **Server-side pathfinding** with A* algorithm
2. **Tile-based map system** with obstacles
3. **Binary map storage** for efficient persistence
4. **Plugin-based architecture** for both pathfinding and storage

## Architecture

### Tile-Based Map System

Maps use a simple 2D grid of tiles, where each tile can be:
- **Passable** (TileType.Passable = 0): Agents can move through
- **Blocked** (TileType.Blocked = 1): Agents cannot pass

The tile system is extensible for future features:
- Tile movement weights (for terrain types like mud, water, etc.)
- Items/objects on tiles
- Dynamic tile states

```typescript
interface Tile {
  type: TileType;
  weight?: number;        // Movement cost (default: 1)
  items?: number[];       // Item IDs on this tile
}
```

### Pathfinding Module

Located in `packages/server/src/pathfinding/`

#### A* Pathfinder (`AStarPathfinder.ts`)

Implements the A* algorithm with:
- **4-directional movement** (up, down, left, right)
- **Manhattan distance heuristic** (admissible for grid-based movement)
- **Obstacle avoidance** (respects blocked tiles)
- **Optimal path guarantee** (finds shortest path)
- **Cost-aware routing** (supports tile weights)

Usage:
```typescript
import { AStarPathfinder } from "./pathfinding/AStarPathfinder.js";

const pathfinder = new AStarPathfinder();
const path = pathfinder.findPath(tileMap, start, goal);

if (path) {
  console.log(`Path found! Cost: ${path.cost}`);
  console.log(`Waypoints: ${path.waypoints.length}`);
}
```

#### Map Generator (`MapGenerator.ts`)

Utility for creating and modifying tile maps:

```typescript
import { MapGenerator } from "./pathfinding/MapGenerator.js";

// Create empty map
const map = MapGenerator.createEmpty(20, 20);

// Add random obstacles (15% density)
MapGenerator.addRandomObstacles(map, 0.15);

// Add specific obstacles
MapGenerator.addRectangle(map, x, y, width, height);
MapGenerator.addBorderWalls(map);

// Check if position is passable
if (MapGenerator.isPassable(map, x, y)) {
  // Agent can move here
}
```

### Map Storage Module

Located in `packages/server/src/storage/`

#### Binary Map Storage (`BinaryMapStorage.ts`)

Efficient binary format for storing tile maps:

**Format:**
- **Header** (8 bytes):
  - Bytes 0-3: Map width (uint32, little endian)
  - Bytes 4-7: Map height (uint32, little endian)
- **Tiles** (1 byte per tile):
  - Bits 0-1: TileType (0=Passable, 1=Blocked)
  - Bits 2-7: Reserved for weight/flags (extensible)

**Storage Efficiency:**
- 20x20 map = 408 bytes (8 header + 400 tiles)
- 100x100 map = 10,008 bytes (~10KB)

Usage:
```typescript
import { BinaryMapStorage } from "./storage/BinaryMapStorage.js";

const storage = new BinaryMapStorage();

// Serialize to binary
const data = storage.serialize(tileMap);
console.log(`Saved ${data.length} bytes`);

// Deserialize from binary
const loadedMap = storage.deserialize(data);
```

#### File-Based Persistence (`FileMapPersistence.ts`)

Demonstrates plugin-based storage with file system:

```typescript
import { FileMapPersistence } from "./persistence/FileMapPersistence.js";

const persistence = new FileMapPersistence();

// Save map
await persistence.save(tileMap, "arena-01");

// Load map
const map = await persistence.load("arena-01");

// List saved maps
const maps = persistence.list();
```

## Integration with Game World

### World Initialization

The `World` class now includes:
```typescript
class World {
  tileMap: TileMap;                          // The tile-based map
  agentPaths: Map<number, Waypoint[]>;       // Agent waypoint paths
  
  constructor(config, engine, pathfinder) {
    // Initialize tile map with obstacles
    this.tileMap = MapGenerator.createEmpty(gridSize, gridSize);
    MapGenerator.addRandomObstacles(this.tileMap, 0.15);
  }
}
```

### Agent Movement

Agents now move along calculated paths:

1. **Path Calculation**: When an agent needs to move (attack, loot, ally), the server calculates a path using A*
2. **Waypoint Following**: Agent follows waypoints one step at a time
3. **Path Broadcasting**: Server sends waypoints to clients via Socket.IO
4. **Fallback**: If pathfinding fails (no path exists), falls back to simple movement

```typescript
// Agent class now has waypoint support
agent.setPath(waypoints);      // Set a path to follow
agent.followPath();            // Move one step along path
agent.clearPath();             // Clear current path
agent.hasPath();               // Check if path exists
```

### Socket.IO Protocol

New event for path synchronization:

```typescript
// Server → Client
"sync:paths": (data: PathSyncPayload) => void;

interface PathSyncPayload {
  paths: Record<number, Waypoint[]>;  // agentId → waypoints
}
```

Clients receive waypoint updates every tick and can render paths/trails for smooth movement visualization.

## Plugin Architecture

Both pathfinding and storage use plugin interfaces for extensibility:

### Pathfinding Engine Plugin

```typescript
interface PathfindingEngine {
  readonly name: string;
  findPath(map: TileMap, start: Waypoint, goal: Waypoint): Path | null;
}
```

**Future plugins:**
- Jump Point Search (JPS) - faster for large open maps
- Theta* - smoother paths with any-angle movement
- Flow Fields - for large numbers of agents moving to same goal

### Map Storage Provider Plugin

```typescript
interface MapStorageProvider {
  readonly name: string;
  serialize(map: TileMap): Uint8Array;
  deserialize(data: Uint8Array): TileMap;
}
```

**Future providers:**
- Compressed storage (gzip, lz4)
- Database storage (PostgreSQL BYTEA, MongoDB BSON)
- Network storage (S3, cloud storage)

## Configuration

No additional environment variables required. The system is automatically enabled when the server starts.

### Customization

To adjust obstacle density, edit `packages/server/src/engine/World.ts`:

```typescript
// In World constructor
MapGenerator.addRandomObstacles(this.tileMap, 0.15); // Change 0.15 (15%)
```

## Testing

The pathfinding and storage systems have been tested with:

1. **Path calculation** - verifies A* finds optimal paths
2. **Obstacle navigation** - ensures paths go around blocked tiles
3. **Impossible paths** - correctly returns null when no path exists
4. **Binary serialization** - round-trip serialize/deserialize preserves data
5. **Integration** - game server runs with pathfinding enabled

Run the server to see pathfinding in action:
```bash
pnpm dev:server
```

## Performance

- **A* Algorithm**: O(b^d) where b=branching factor, d=depth
  - For 20x20 map: ~400 tiles, milliseconds per path
  - Optimized with Set-based open/closed lists
- **Binary Storage**: O(n) where n=tile count
  - Constant-time encode/decode per tile
  - Minimal memory allocation

## Future Enhancements

1. **Path Caching**: Cache paths for frequently used routes
2. **Dynamic Obstacles**: Update paths when map changes
3. **Multi-Agent Pathfinding**: Collision avoidance between agents
4. **Path Smoothing**: Post-process paths for more natural movement
5. **Terrain Types**: Different movement costs for various tile types
6. **Hierarchical Pathfinding**: For very large maps (HPA*, JPS+)
