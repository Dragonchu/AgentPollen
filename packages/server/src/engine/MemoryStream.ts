import { MemoryEntry, MemoryType } from "@battle-royale/shared";

/**
 * Memory stream for an agent.
 * Stores observations, reflections, plans, and inner voice messages.
 * Retrieval is scored by recency × importance × relevance.
 *
 * Extension points:
 * - Override `computeRelevance()` to use embedding-based similarity
 * - Adjust `MAX_MEMORIES` and `DECAY_FACTOR` for different memory profiles
 */
export class MemoryStream {
  private memories: MemoryEntry[] = [];

  static readonly MAX_MEMORIES = 100;
  static readonly DECAY_FACTOR = 0.995;

  add(text: string, importance: number, type: MemoryType): void {
    this.memories.push({
      text,
      importance: Math.min(10, Math.max(1, importance)),
      type,
      timestamp: Date.now(),
    });

    // Prune if over limit: keep most important
    if (this.memories.length > MemoryStream.MAX_MEMORIES) {
      this.memories.sort((a, b) => b.importance - a.importance);
      this.memories = this.memories.slice(0, MemoryStream.MAX_MEMORIES * 0.8);
    }
  }

  /**
   * Retrieve top-K memories relevant to a query.
   * MVP: keyword matching. Production: replace with embedding cosine similarity.
   */
  retrieve(query: string, topK = 5): MemoryEntry[] {
    const now = Date.now();
    const queryWords = query.toLowerCase().split(/\s+/);

    const scored = this.memories.map((m) => {
      const ageSec = (now - m.timestamp) / 1000;
      const recency = Math.pow(MemoryStream.DECAY_FACTOR, ageSec);
      const importance = m.importance / 10;
      const relevance = this.computeRelevance(m.text, queryWords);
      return { memory: m, score: recency * 0.3 + importance * 0.4 + relevance * 0.3 };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.memory);
  }

  /** Override this for embedding-based relevance in production */
  protected computeRelevance(memoryText: string, queryWords: string[]): number {
    const text = memoryText.toLowerCase();
    const matches = queryWords.filter((w) => text.includes(w)).length;
    return matches / Math.max(queryWords.length, 1);
  }

  getRecent(n: number): MemoryEntry[] {
    return this.memories.slice(-n);
  }

  getByType(type: MemoryType): MemoryEntry[] {
    return this.memories.filter((m) => m.type === type);
  }

  getAll(): MemoryEntry[] {
    return [...this.memories];
  }

  /** For serialization / persistence */
  serialize(): MemoryEntry[] {
    return [...this.memories];
  }

  /** Restore from serialized data */
  restore(entries: MemoryEntry[]): void {
    this.memories = [...entries];
  }

  get size(): number {
    return this.memories.length;
  }
}
