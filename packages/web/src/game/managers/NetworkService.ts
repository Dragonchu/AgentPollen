import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
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
} from '@battle-royale/shared';
import { SocketEvents } from '@battle-royale/shared';
import { NetworkEvents } from '../events/GameEvents';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

/**
 * NetworkService handles Socket.IO communication with the server.
 * Infrastructure layer - only responsible for network I/O.
 * Extends EventEmitter to emit network events for other layers to handle.
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
export class NetworkService extends Phaser.Events.EventEmitter {
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
      console.warn('Already connected to server');
      return;
    }

    this.socket = io(this.serverUrl);

    // Connection events
    this.socket.on(SocketEvents.CONNECTED, () => {
      this.emit(NetworkEvents.CONNECTED);
    });

    this.socket.on(SocketEvents.DISCONNECTED, () => {
      this.emit(NetworkEvents.DISCONNECTED);
    });

    // Full sync on connect
    this.socket.on(SocketEvents.SYNC_FULL, (data: FullSyncPayload) => {
      this.emit(NetworkEvents.SYNC_FULL, data);
    });

    // World state updates
    this.socket.on(SocketEvents.SYNC_WORLD, (data: WorldSyncState) => {
      this.emit(NetworkEvents.SYNC_WORLD, data);
    });

    // Agent updates (full or delta)
    this.socket.on(SocketEvents.SYNC_AGENTS, (data: AgentSyncPayload) => {
      this.emit(NetworkEvents.SYNC_AGENTS, data);
    });

    // Events
    this.socket.on(SocketEvents.SYNC_EVENTS, (events: GameEvent[]) => {
      this.emit(NetworkEvents.SYNC_EVENTS, events);
    });

    // Vote state
    this.socket.on(SocketEvents.VOTE_STATE, (votes: VoteState) => {
      this.emit(NetworkEvents.VOTE_STATE, votes);
    });

    // Agent detail (on demand)
    this.socket.on(SocketEvents.AGENT_DETAIL, (detail) => {
      this.emit(NetworkEvents.AGENT_DETAIL, detail);
    });

    // Thinking history (on demand)
    this.socket.on(SocketEvents.THINKING_HISTORY, (data: ThinkingHistoryPayload) => {
      this.emit(NetworkEvents.THINKING_HISTORY, data);
    });

    // Path updates (for smooth movement visualization)
    this.socket.on(SocketEvents.SYNC_PATHS, (data: PathSyncPayload) => {
      this.emit(NetworkEvents.SYNC_PATHS, data);
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
    this.socket?.emit(SocketEvents.VOTE_SUBMIT, {
      agentId,
      action,
      playerId: this.socket.id ?? 'anon',
    });
  }

  /**
   * Request agent detail and follow the agent
   */
  inspectAgent(agentId: number): void {
    this.socket?.emit(SocketEvents.AGENT_INSPECT, agentId);
    this.socket?.emit(SocketEvents.AGENT_FOLLOW, agentId);
    this.socket?.emit(SocketEvents.THINKING_REQUEST, agentId, 20);

    // Emit event for state manager to handle selection
    this.emit(NetworkEvents.AGENT_INSPECT, agentId);
  }

  /**
   * Clear agent selection
   */
  clearSelection(): void {
    this.socket?.emit(SocketEvents.AGENT_FOLLOW, null);

    // Emit event for state manager to handle deselection
    this.emit(NetworkEvents.AGENT_CLEAR_SELECTION);
  }

  /**
   * Request thinking history for an agent
   */
  requestThinkingHistory(agentId: number, limit: number = 10): void {
    this.socket?.emit(SocketEvents.THINKING_REQUEST, agentId, limit);
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
