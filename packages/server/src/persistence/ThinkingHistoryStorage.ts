import { ThinkingProcess } from "@battle-royale/shared";

/**
 * Interface for storing agent thinking process history.
 * 
 * Design principles:
 * - Interface-first: Clear contract for all implementations
 * - Bounded resources: Always limit history size
 * - Session-scoped: Clear separation between game sessions
 * - Future-proof: Easy to swap implementations (Redis, PostgreSQL, etc.)
 */
export interface ThinkingHistoryStorage {
  /**
   * Store a thinking process for an agent.
   * Implementations must enforce size limits per agent.
   * 
   * @param sessionId - Unique identifier for the game session
   * @param agentId - Agent identifier
   * @param thinking - The thinking process to store
   */
  store(sessionId: string, agentId: number, thinking: ThinkingProcess): Promise<void>;

  /**
   * Retrieve thinking history for a specific agent.
   * 
   * @param sessionId - Unique identifier for the game session
   * @param agentId - Agent identifier
   * @param limit - Maximum number of entries to return, defaults to 10 (most recent first)
   * @returns Array of thinking processes, newest first
   */
  getHistory(sessionId: string, agentId: number, limit?: number): Promise<ThinkingProcess[]>;

  /**
   * Clear all history for a session.
   * Called when a game session ends or is restarted.
   * 
   * @param sessionId - Unique identifier for the game session
   */
  clearSession(sessionId: string): Promise<void>;

  /**
   * Get the total number of thinking processes stored for an agent in a session.
   * 
   * @param sessionId - Unique identifier for the game session
   * @param agentId - Agent identifier
   * @returns Total count of stored thinking processes
   */
  getCount(sessionId: string, agentId: number): Promise<number>;
}

/**
 * No-op implementation for graceful degradation.
 * System works without storage - thinking processes are not persisted.
 * 
 * Use this when:
 * - Storage is disabled by configuration
 * - Storage backend is unavailable
 * - Testing without persistence
 */
export class NullThinkingHistoryStorage implements ThinkingHistoryStorage {
  async store(_sessionId: string, _agentId: number, _thinking: ThinkingProcess): Promise<void> {
    // No-op: thinking process is discarded
  }

  async getHistory(_sessionId: string, _agentId: number, _limit?: number): Promise<ThinkingProcess[]> {
    // Always returns empty array
    return [];
  }

  async clearSession(_sessionId: string): Promise<void> {
    // No-op: nothing to clear
  }

  async getCount(_sessionId: string, _agentId: number): Promise<number> {
    // Always returns 0
    return 0;
  }
}

/**
 * In-memory implementation with bounded storage.
 * Suitable for MVP and single-server deployments.
 * 
 * Bounds:
 * - MAX_ENTRIES_PER_AGENT: Maximum thinking processes stored per agent
 * - MAX_SESSIONS: Maximum number of concurrent sessions tracked
 * 
 * When limits are exceeded:
 * - Per-agent: Oldest entries are removed (FIFO)
 * - Sessions: Oldest session is evicted completely
 */
export class InMemoryThinkingHistoryStorage implements ThinkingHistoryStorage {
  private static readonly MAX_ENTRIES_PER_AGENT = 50;
  private static readonly MAX_SESSIONS = 10;

  // Storage: sessionId -> agentId -> ThinkingProcess[]
  private storage = new Map<string, Map<number, ThinkingProcess[]>>();
  
  // Track session access time for LRU eviction
  private sessionAccessTimes = new Map<string, number>();

  async store(sessionId: string, agentId: number, thinking: ThinkingProcess): Promise<void> {
    // Update session access time
    this.sessionAccessTimes.set(sessionId, Date.now());

    // Evict oldest session if limit exceeded
    if (this.storage.size >= InMemoryThinkingHistoryStorage.MAX_SESSIONS && !this.storage.has(sessionId)) {
      this.evictOldestSession();
    }

    // Get or create session storage
    let sessionStorage = this.storage.get(sessionId);
    if (!sessionStorage) {
      sessionStorage = new Map<number, ThinkingProcess[]>();
      this.storage.set(sessionId, sessionStorage);
    }

    // Get or create agent history
    let agentHistory = sessionStorage.get(agentId);
    if (!agentHistory) {
      agentHistory = [];
      sessionStorage.set(agentId, agentHistory);
    }

    // Add new thinking process (newest at the end)
    agentHistory.push(thinking);

    // Enforce per-agent limit (keep most recent)
    if (agentHistory.length > InMemoryThinkingHistoryStorage.MAX_ENTRIES_PER_AGENT) {
      agentHistory.shift(); // Remove oldest
    }
  }

  async getHistory(sessionId: string, agentId: number, limit: number = 10): Promise<ThinkingProcess[]> {
    // Validate limit parameter
    if (limit <= 0) {
      return [];
    }

    const sessionStorage = this.storage.get(sessionId);
    if (!sessionStorage) {
      return [];
    }

    const agentHistory = sessionStorage.get(agentId);
    if (!agentHistory || agentHistory.length === 0) {
      return [];
    }

    // Return most recent entries (newest first)
    return agentHistory.slice(-limit).reverse();
  }

  async clearSession(sessionId: string): Promise<void> {
    this.storage.delete(sessionId);
    this.sessionAccessTimes.delete(sessionId);
  }

  async getCount(sessionId: string, agentId: number): Promise<number> {
    const sessionStorage = this.storage.get(sessionId);
    if (!sessionStorage) {
      return 0;
    }

    const agentHistory = sessionStorage.get(agentId);
    return agentHistory?.length ?? 0;
  }

  /**
   * Evict the least recently used session to free up memory.
   * @private
   */
  private evictOldestSession(): void {
    let oldestSessionId: string | null = null;
    let oldestTime = Infinity;

    for (const [sessionId, accessTime] of this.sessionAccessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.storage.delete(oldestSessionId);
      this.sessionAccessTimes.delete(oldestSessionId);
    }
  }

  /**
   * Get statistics about current storage usage.
   * Useful for monitoring and debugging.
   */
  getStats(): {
    sessionCount: number;
    totalEntries: number;
    entriesPerSession: Record<string, number>;
  } {
    const entriesPerSession: Record<string, number> = {};
    let totalEntries = 0;

    for (const [sessionId, sessionStorage] of this.storage) {
      let sessionTotal = 0;
      for (const agentHistory of sessionStorage.values()) {
        sessionTotal += agentHistory.length;
      }
      entriesPerSession[sessionId] = sessionTotal;
      totalEntries += sessionTotal;
    }

    return {
      sessionCount: this.storage.size,
      totalEntries,
      entriesPerSession,
    };
  }
}
