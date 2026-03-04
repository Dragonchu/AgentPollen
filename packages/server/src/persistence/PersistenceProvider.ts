/**
 * Persistence layer for saving/restoring world state.
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

  async saveEvent(_event: unknown): Promise<void> {}
}
