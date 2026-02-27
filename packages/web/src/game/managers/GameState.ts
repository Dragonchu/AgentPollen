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
  FullSyncPayload,
  PathSyncPayload,
  ThinkingHistoryPayload,
} from "@battle-royale/shared";
import { NetworkService } from "./NetworkService";

export interface GameStateData {
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
 * GameState manages all game state independently of React.
 * Domain/State layer - only responsible for state storage and emission.
 * Extends Phaser.Events.EventEmitter to leverage the framework's event system.
 * Listens to NetworkService events to update state.
 */
export class GameState extends Phaser.Events.EventEmitter {
  private state: GameStateData;
  private networkService: NetworkService;

  constructor(networkService: NetworkService) {
    super();
    this.networkService = networkService;
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

    // Setup network event listeners
    this.setupNetworkListeners();
  }

  /**
   * Setup listeners for network events
   */
  private setupNetworkListeners(): void {
    this.networkService.on("network:connected", this.handleConnected, this);
    this.networkService.on("network:disconnected", this.handleDisconnected, this);
    this.networkService.on("network:sync:full", this.handleFullSync, this);
    this.networkService.on("network:sync:world", this.handleWorldSync, this);
    this.networkService.on("network:sync:agents", this.handleAgentsSync, this);
    this.networkService.on("network:sync:events", this.handleEventsSync, this);
    this.networkService.on("network:sync:paths", this.handlePathsSync, this);
    this.networkService.on("network:vote:state", this.handleVoteState, this);
    this.networkService.on("network:agent:detail", this.handleAgentDetail, this);
    this.networkService.on("network:thinking:history", this.handleThinkingHistory, this);
    this.networkService.on("network:agent:inspect", this.handleAgentInspect, this);
    this.networkService.on("network:agent:clear-selection", this.handleClearSelection, this);
  }

  // ============ Network Event Handlers ============

  private handleConnected(): void {
    this.setConnected(true);
  }

  private handleDisconnected(): void {
    this.setConnected(false);
    // Clear paths on disconnect to avoid stale data
    this.setAgentPaths({});
  }

  private handleFullSync(data: FullSyncPayload): void {
    const agentMap = new Map<number, AgentFullState>();
    for (const a of data.agents) {
      agentMap.set(a.id, a);
    }
    this.setWorld(data.world);
    this.setAgents(agentMap);
    this.setItems(data.items);
    this.setVotes(data.votes);
    this.setEvents(data.events);
    this.setTileMap(data.tileMap);
  }

  private handleWorldSync(world: WorldSyncState): void {
    this.setWorld(world);
  }

  private handleAgentsSync(payload: AgentSyncPayload): void {
    this.updateAgents(payload);
  }

  private handleEventsSync(events: GameEvent[]): void {
    this.addEvents(events);
  }

  private handlePathsSync(data: PathSyncPayload): void {
    this.setAgentPaths(data.paths);
  }

  private handleVoteState(votes: VoteState): void {
    this.setVotes(votes);
  }

  private handleAgentDetail(detail: AgentFullState): void {
    const agents = new Map(this.state.agents);
    agents.set(detail.id, detail);
    this.setAgents(agents);
    // If this agent is currently selected, update it
    if (this.state.selectedAgent?.id === detail.id) {
      this.selectAgent(detail);
    }
  }

  private handleThinkingHistory(data: ThinkingHistoryPayload): void {
    this.setThinkingHistory(data.agentId, data.history);
  }

  private handleAgentInspect(agentId: number): void {
    const agent = this.getAgent(agentId);
    if (agent) {
      this.selectAgent(agent);
    }
  }

  private handleClearSelection(): void {
    this.selectAgent(null);
  }

  // ============ Getters ============

  getState(): GameStateData {
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
    // Unsubscribe from network events
    this.networkService.off("network:connected", this.handleConnected, this);
    this.networkService.off("network:disconnected", this.handleDisconnected, this);
    this.networkService.off("network:sync:full", this.handleFullSync, this);
    this.networkService.off("network:sync:world", this.handleWorldSync, this);
    this.networkService.off("network:sync:agents", this.handleAgentsSync, this);
    this.networkService.off("network:sync:events", this.handleEventsSync, this);
    this.networkService.off("network:sync:paths", this.handlePathsSync, this);
    this.networkService.off("network:vote:state", this.handleVoteState, this);
    this.networkService.off("network:agent:detail", this.handleAgentDetail, this);
    this.networkService.off("network:thinking:history", this.handleThinkingHistory, this);
    this.networkService.off("network:agent:inspect", this.handleAgentInspect, this);
    this.networkService.off("network:agent:clear-selection", this.handleClearSelection, this);

    this.removeAllListeners();
  }
}
