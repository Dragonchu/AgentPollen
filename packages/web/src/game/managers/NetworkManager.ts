import * as Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  FullSyncPayload,
  WorldSyncState,
  AgentSyncPayload,
  GameEvent,
  VoteState,
  PathSyncPayload,
  ThinkingHistoryPayload,
} from "@battle-royale/shared";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

/**
 * NetworkManager handles Socket.IO communication with the server.
 * Extends EventEmitter to emit network events for other managers to handle.
 *
 * Events emitted:
 * - 'network:connected': When connected to server
 * - 'network:disconnected': When disconnected from server
 * - 'network:sync:full': Full state synchronization (FullSyncPayload)
 * - 'network:sync:world': World state update (WorldSyncState)
 * - 'network:sync:agents': Agent updates (AgentSyncPayload)
 * - 'network:sync:events': Game events (GameEvent[])
 * - 'network:sync:paths': Path updates (PathSyncPayload)
 * - 'network:vote:state': Vote state update (VoteState)
 * - 'network:agent:detail': Agent detail (AgentFullState)
 * - 'network:thinking:history': Thinking history (ThinkingHistoryPayload)
 */
export class NetworkManager extends Phaser.Events.EventEmitter {
  private socket: GameSocket | null = null;
  private serverUrl: string;

  constructor(serverUrl: string = SERVER_URL) {
    super();
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

    // Connection events
    this.socket.on("connect", () => {
      console.log("Connected to server:", this.socket?.id);
      this.emit("network:connected");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
      this.emit("network:disconnected");
    });

    // Full sync on connect
    this.socket.on("sync:full", (data: FullSyncPayload) => {
      this.emit("network:sync:full", data);
    });

    // World state updates
    this.socket.on("sync:world", (data: WorldSyncState) => {
      this.emit("network:sync:world", data);
    });

    // Agent updates (full or delta)
    this.socket.on("sync:agents", (data: AgentSyncPayload) => {
      this.emit("network:sync:agents", data);
    });

    // Events
    this.socket.on("sync:events", (events: GameEvent[]) => {
      this.emit("network:sync:events", events);
    });

    // Vote state
    this.socket.on("vote:state", (votes: VoteState) => {
      this.emit("network:vote:state", votes);
    });

    // Agent detail (on demand)
    this.socket.on("agent:detail", (detail) => {
      this.emit("network:agent:detail", detail);
    });

    // Thinking history (on demand)
    this.socket.on("thinking:history", (data: ThinkingHistoryPayload) => {
      this.emit("network:thinking:history", data);
    });

    // Path updates (for smooth movement visualization)
    this.socket.on("sync:paths", (data: PathSyncPayload) => {
      this.emit("network:sync:paths", data);
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
    this.removeAllListeners();
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

    // Emit event for state manager to handle selection
    this.emit("network:agent:inspect", agentId);
  }

  /**
   * Clear agent selection
   */
  clearSelection(): void {
    this.socket?.emit("agent:follow", null);

    // Emit event for state manager to handle deselection
    this.emit("network:agent:clear-selection");
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
