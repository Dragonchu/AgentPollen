import * as Phaser from "phaser";
import {
  AgentFullState,
  AgentSyncPayload,
  GameEvent,
  ItemState,
  ThinkingProcess,
  TileMap,
  VoteState,
  Waypoint,
  WorldSyncState,
} from "@battle-royale/shared";

export interface GameState {
  connected: boolean;
  world: WorldSyncState | null;
  agents: Map<number, AgentFullState>;
  items: ItemState[];
  events: GameEvent[];
  votes: VoteState | null;
  selectedAgent: AgentFullState | null;
  agentPaths: Record<number, Waypoint[]>;
  tileMap: TileMap | null;
  thinkingHistory: Map<number, ThinkingProcess[]>;
}

/**
 * GameStateManager manages all game state independently of React.
 * Extends Phaser.Events.EventEmitter to leverage the framework's event system.
 */
export class GameStateManager extends Phaser.Events.EventEmitter {
  private state: GameState;

  constructor() {
    super();
    this.state = {
      connected: false,
      world: null,
      agents: new Map(),
      items: [],
      events: [],
      votes: null,
      selectedAgent: null,
      agentPaths: {},
      tileMap: null,
      thinkingHistory: new Map(),
    };
  }

  // ============ Getters ============

  getState(): GameState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  getWorld(): WorldSyncState | null {
    return this.state.world;
  }

  getAgents(): Map<number, AgentFullState> {
    return this.state.agents;
  }

  getItems(): ItemState[] {
    return this.state.items;
  }

  getEvents(): GameEvent[] {
    return this.state.events;
  }

  getVotes(): VoteState | null {
    return this.state.votes;
  }

  getSelectedAgent(): AgentFullState | null {
    return this.state.selectedAgent;
  }

  getAgentPaths(): Record<number, Waypoint[]> {
    return this.state.agentPaths;
  }

  getTileMap(): TileMap | null {
    return this.state.tileMap;
  }

  getThinkingHistory(): Map<number, ThinkingProcess[]> {
    return this.state.thinkingHistory;
  }

  getAgent(id: number): AgentFullState | undefined {
    return this.state.agents.get(id);
  }

  getAgentThinkingHistory(id: number): ThinkingProcess[] {
    return this.state.thinkingHistory.get(id) ?? [];
  }

  /**
   * Get grid dimensions from the tilemap (width and height in grid cells)
   * Returns null if tilemap hasn't been loaded yet
   */
  getGridSize(): { width: number; height: number } | null {
    const tileMap = this.state.tileMap;
    if (!tileMap) return null;
    return { width: tileMap.width, height: tileMap.height };
  }

  // ============ Setters with events ============

  setConnected(connected: boolean): void {
    this.state.connected = connected;
    this.emit("state:connected", connected);
  }

  setWorld(world: WorldSyncState): void {
    this.state.world = world;
    this.emit("state:world:updated", world);
  }

  setAgents(agents: Map<number, AgentFullState>): void {
    this.state.agents = agents;
    this.emit("state:agents:updated", agents);
  }

  /**
   * Apply incremental agent updates (merge with existing agents)
   */
  updateAgents(payload: AgentSyncPayload): void {
    const agents = new Map(this.state.agents);
    for (const change of payload.changes) {
      const existing = agents.get(change.id);
      if (existing) {
        agents.set(change.id, { ...existing, ...change });
      }
    }
    this.state.agents = agents;
    this.emit("state:agents:updated", agents);
  }

  setItems(items: ItemState[]): void {
    this.state.items = items;
    this.emit("state:items:updated", items);
  }

  setEvents(events: GameEvent[]): void {
    this.state.events = events;
    this.emit("state:events:updated", events);
  }

  /**
   * Prepend new events (maintain max 50 events)
   */
  addEvents(newEvents: GameEvent[]): void {
    this.state.events = [...newEvents, ...this.state.events].slice(0, 50);
    this.emit("state:events:updated", this.state.events);
  }

  setVotes(votes: VoteState): void {
    this.state.votes = votes;
    this.emit("state:votes:updated", votes);
  }

  selectAgent(agent: AgentFullState | null): void {
    this.state.selectedAgent = agent;
    this.emit("state:agent:selected", agent);
  }

  setAgentPaths(paths: Record<number, Waypoint[]>): void {
    this.state.agentPaths = paths;
    this.emit("state:paths:updated", paths);
  }

  setTileMap(tileMap: TileMap): void {
    this.state.tileMap = tileMap;
    this.emit("state:tilemap:updated", tileMap);
  }

  setThinkingHistory(agentId: number, history: ThinkingProcess[]): void {
    const thinkingHistory = new Map(this.state.thinkingHistory);
    thinkingHistory.set(agentId, history);
    this.state.thinkingHistory = thinkingHistory;
    this.emit("state:thinking:updated", thinkingHistory);
  }

  /**
   * Reset state (e.g., on game restart)
   */
  reset(): void {
    this.state = {
      connected: false,
      world: null,
      agents: new Map(),
      items: [],
      events: [],
      votes: null,
      selectedAgent: null,
      agentPaths: {},
      tileMap: null,
      thinkingHistory: new Map(),
    };
  }

  /**
   * Clean up all event listeners
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
