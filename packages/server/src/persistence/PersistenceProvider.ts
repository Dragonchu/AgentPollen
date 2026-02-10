/**
 * Persistence layer (STUB - implement for production).
 *
 * This shows the interface for saving/restoring world state.
 *
 * MVP: No persistence (world resets on restart).
 * Production: Implement with Redis + PostgreSQL.
 *
 * Usage:
 *   const persistence = new RedisPersistence(redisUrl);
 *   // In game loop:
 *   if (tick % 60 === 0) await persistence.saveSnapshot(world.serialize());
 *   // On startup:
 *   const saved = await persistence.loadLatestSnapshot();
 *   if (saved) world = World.restore(saved);
 */

export interface PersistenceProvider {
  /** Save a full world snapshot */
  saveSnapshot(data: string): Promise<void>;

  /** Load the most recent snapshot */
  loadLatestSnapshot(): Promise<string | null>;

  /** Save a game event for analytics/replay */
  saveEvent(event: unknown): Promise<void>;
}

/**
 * No-op persistence for MVP.
 * World state only lives in memory.
 */
export class MemoryPersistence implements PersistenceProvider {
  private snapshots: string[] = [];

  async saveSnapshot(data: string): Promise<void> {
    this.snapshots.push(data);
    // Keep last 5
    if (this.snapshots.length > 5) this.snapshots.shift();
  }

  async loadLatestSnapshot(): Promise<string | null> {
    return this.snapshots.at(-1) ?? null;
  }

  async saveEvent(_event: unknown): Promise<void> {
    // No-op in MVP
  }
}

// --- Production stubs (uncomment and implement) ---

// export class RedisPersistence implements PersistenceProvider {
//   constructor(private redisUrl: string) {}
//   async saveSnapshot(data: string) {
//     // await redis.set("br:snapshot", data);
//   }
//   async loadLatestSnapshot() {
//     // return await redis.get("br:snapshot");
//   }
//   async saveEvent(event: unknown) {
//     // await redis.lpush("br:events", JSON.stringify(event));
//   }
// }

// export class PostgresPersistence implements PersistenceProvider {
//   constructor(private connectionString: string) {}
//   async saveSnapshot(data: string) {
//     // INSERT INTO world_snapshots (data) VALUES ($1)
//   }
//   async loadLatestSnapshot() {
//     // SELECT data FROM world_snapshots ORDER BY created_at DESC LIMIT 1
//   }
//   async saveEvent(event: unknown) {
//     // INSERT INTO game_events (data) VALUES ($1)
//   }
// }
