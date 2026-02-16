import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  FullSyncPayload,
  WorldSyncState,
  AgentSyncPayload,
  AgentFullState,
  GameEvent,
  VoteState,
  PathSyncPayload,
  ThinkingHistoryPayload,
} from "@battle-royale/shared";
import { GameStateManager } from "./GameStateManager";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

/**
 * NetworkManager handles Socket.IO communication with the server.
 * It forwards all server updates to GameStateManager.
 */
export class NetworkManager {
  private socket: GameSocket | null = null;
  private stateManager: GameStateManager;
  private serverUrl: string;

  constructor(stateManager: GameStateManager, serverUrl: string = SERVER_URL) {
    this.stateManager = stateManager;
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to the server and setup event listeners
   */
  connect(): void {
    if (this.socket) {
      console.warn("Already connected to server");
      return;
    }

    this.socket = io(this.serverUrl);

    this.socket.on("connect", () => {
      this.stateManager.setConnected(true);
    });

    this.socket.on("disconnect", () => {
      this.stateManager.setConnected(false);
      // Clear paths on disconnect to avoid stale data
      this.stateManager.setAgentPaths({});
    });

    // Full sync on connect
    this.socket.on("sync:full", (data: FullSyncPayload) => {
      const agentMap = new Map<number, AgentFullState>();
      for (const a of data.agents) {
        agentMap.set(a.id, a);
      }
      this.stateManager.setWorld(data.world);
      this.stateManager.setAgents(agentMap);
      this.stateManager.setItems(data.items);
      this.stateManager.setVotes(data.votes);
      this.stateManager.setEvents(data.events);
      this.stateManager.setTileMap(data.tileMap);
    });

    // World state updates
    this.socket.on("sync:world", (data: WorldSyncState) => {
      this.stateManager.setWorld(data);
    });

    // Agent updates (full or delta)
    this.socket.on("sync:agents", (data: AgentSyncPayload) => {
      this.stateManager.updateAgents(data);
    });

    // Events
    this.socket.on("sync:events", (events: GameEvent[]) => {
      this.stateManager.addEvents(events);
    });

    // Vote state
    this.socket.on("vote:state", (votes: VoteState) => {
      this.stateManager.setVotes(votes);
    });

    // Agent detail (on demand)
    this.socket.on("agent:detail", (detail: AgentFullState) => {
      const agents = new Map(this.stateManager.getAgents());
      agents.set(detail.id, detail);
      this.stateManager.setAgents(agents);
      // If this agent is currently selected, update it
      if (this.stateManager.getSelectedAgent()?.id === detail.id) {
        this.stateManager.selectAgent(detail);
      }
    });

    // Thinking history (on demand)
    this.socket.on("thinking:history", (data: ThinkingHistoryPayload) => {
      this.stateManager.setThinkingHistory(data.agentId, data.history);
    });

    // Path updates (for smooth movement visualization)
    this.socket.on("sync:paths", (data: PathSyncPayload) => {
      this.stateManager.setAgentPaths(data.paths);
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Submit a vote action
   */
  submitVote(agentId: number, action: string): void {
    this.socket?.emit("vote:submit", {
      agentId,
      action,
      playerId: this.socket.id ?? "anon",
    });
  }

  /**
   * Request agent detail and follow the agent
   */
  inspectAgent(agentId: number): void {
    this.socket?.emit("agent:inspect", agentId);
    this.socket?.emit("agent:follow", agentId);
    this.socket?.emit("thinking:request", agentId, 20);

    // Update selected agent in state manager
    const agent = this.stateManager.getAgent(agentId);
    if (agent) {
      this.stateManager.selectAgent(agent);
    }
  }

  /**
   * Clear agent selection
   */
  clearSelection(): void {
    this.socket?.emit("agent:follow", null);
    this.stateManager.selectAgent(null);
  }

  /**
   * Request thinking history for an agent
   */
  requestThinkingHistory(agentId: number, limit: number = 10): void {
    this.socket?.emit("thinking:request", agentId, limit);
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the socket instance (for advanced usage)
   */
  getSocket(): GameSocket | null {
    return this.socket;
  }
}
