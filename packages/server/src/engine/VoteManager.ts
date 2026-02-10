import { Vote, VoteOption, VoteState } from "@battle-royale/shared";

/**
 * Manages player voting with time-windowed aggregation.
 *
 * Each voting window lasts N milliseconds. At the end of the window,
 * the top-voted action for each agent is applied as an "inner voice".
 *
 * Extension points:
 * - Add vote weighting (premium users, loyalty points)
 * - Add vote categories (strategic vs tactical)
 * - Add cooldowns per player
 * - Add vote verification / anti-spam
 */
export class VoteManager {
  private windowId = 0;
  private windowStartTime: number;
  private readonly windowDurationMs: number;

  /** agentId → { playerId → action } */
  private currentVotes: Map<number, Map<string, string>> = new Map();

  /** Callback when a voting window resolves */
  private onResolve?: (results: Map<number, string>) => void;

  constructor(windowDurationMs: number) {
    this.windowDurationMs = windowDurationMs;
    this.windowStartTime = Date.now();
  }

  /** Register callback for when votes are resolved */
  setOnResolve(callback: (results: Map<number, string>) => void): void {
    this.onResolve = callback;
  }

  /** Submit a vote. Returns false if invalid. */
  submitVote(vote: Vote): boolean {
    // Each player can only have one active vote per agent
    if (!this.currentVotes.has(vote.agentId)) {
      this.currentVotes.set(vote.agentId, new Map());
    }
    this.currentVotes.get(vote.agentId)!.set(vote.playerId, vote.action);
    return true;
  }

  /**
   * Called every tick. Checks if window has elapsed and resolves votes.
   * Returns the current vote state for broadcasting.
   */
  tick(): { resolved: boolean; state: VoteState } {
    const now = Date.now();
    const elapsed = now - this.windowStartTime;
    const timeRemaining = Math.max(0, this.windowDurationMs - elapsed);

    let resolved = false;

    if (elapsed >= this.windowDurationMs) {
      this.resolveWindow();
      resolved = true;
    }

    return {
      resolved,
      state: this.getState(),
    };
  }

  private resolveWindow(): void {
    const results = new Map<number, string>();

    for (const [agentId, playerVotes] of this.currentVotes) {
      // Count votes per action
      const actionCounts = new Map<string, number>();
      for (const action of playerVotes.values()) {
        actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
      }

      // Find the winning action
      let maxVotes = 0;
      let winningAction = "";
      for (const [action, count] of actionCounts) {
        if (count > maxVotes) {
          maxVotes = count;
          winningAction = action;
        }
      }

      if (winningAction) {
        results.set(agentId, winningAction);
      }
    }

    // Notify
    this.onResolve?.(results);

    // Reset for next window
    this.windowId++;
    this.windowStartTime = Date.now();
    this.currentVotes.clear();
  }

  getState(): VoteState {
    const agentVotes: Record<number, VoteOption[]> = {};

    for (const [agentId, playerVotes] of this.currentVotes) {
      const actionCounts = new Map<string, number>();
      for (const action of playerVotes.values()) {
        actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
      }
      agentVotes[agentId] = Array.from(actionCounts.entries())
        .map(([action, votes]) => ({ action, votes }))
        .sort((a, b) => b.votes - a.votes);
    }

    return {
      windowId: this.windowId,
      timeRemainingMs: Math.max(0, this.windowDurationMs - (Date.now() - this.windowStartTime)),
      agentVotes,
    };
  }
}
