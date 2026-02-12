import { Server, Socket } from "socket.io";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  Vote,
  Waypoint,
} from "@battle-royale/shared";
import { World } from "../engine/World.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Manages all Socket.IO communication.
 *
 * Current: full sync every tick (MVP simplicity).
 * Extension: switch broadcastTick() to use world.computeAgentDelta()
 * for delta-only sync when scaling to many viewers.
 */
export class SyncManager {
  private io: IOServer;
  private world: World;

  /** Track which agent each socket is following */
  private following: Map<string, number> = new Map();

  constructor(io: IOServer, world: World) {
    this.io = io;
    this.world = world;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.io.on("connection", (socket: IOSocket) => {
      console.log(`Client connected: ${socket.id}`);

      // Send full state on connect
      this.sendFullSync(socket);

      // Handle vote submissions
      socket.on("vote:submit", (vote: Vote) => {
        const enrichedVote = { ...vote, playerId: socket.id };
        this.world.getVoteManager().submitVote(enrichedVote);
      });

      // Handle agent inspection
      socket.on("agent:inspect", (agentId: number) => {
        this.sendAgentDetail(socket, agentId);
      });

      // Handle agent following
      socket.on("agent:follow", (agentId: number | null) => {
        const prev = this.following.get(socket.id);
        if (prev !== undefined) {
          socket.leave(`follow:${prev}`);
        }
        if (agentId !== null) {
          socket.join(`follow:${agentId}`);
          this.following.set(socket.id, agentId);
          this.sendAgentDetail(socket, agentId);
        } else {
          this.following.delete(socket.id);
        }
      });

      socket.on("disconnect", () => {
        this.following.delete(socket.id);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /** Send full world state to a single socket */
  private sendFullSync(socket: IOSocket): void {
    socket.emit("sync:full", this.world.getFullSync());
  }

  /** Send agent detail to a single socket */
  private sendAgentDetail(socket: IOSocket, agentId: number): void {
    const agent = this.world.agents.find((a) => a.id === agentId);
    if (agent) {
      socket.emit("agent:detail", agent.toFullState());
    }
  }

  /**
   * Broadcast tick update to all connected clients.
   *
   * MVP: sends full agent list every tick (simple, works for <100 viewers).
   * Production: uncomment the delta path below.
   */
  broadcastTick(): void {
    // World state (always small)
    this.io.emit("sync:world", this.world.getWorldState());

    // --- MVP: Full agent sync ---
    const allAgents = this.world.agents.map((a) => a.toSyncState());
    this.io.emit("sync:agents", {
      tick: this.world.tick,
      changes: allAgents,
    });

    // --- Production: Delta sync (uncomment to enable) ---
    // const delta = this.world.computeAgentDelta();
    // if (delta.length > 0) {
    //   this.io.emit("sync:agents", { tick: this.world.tick, changes: delta });
    // }

    // Events
    if (this.world.pendingEvents.length > 0) {
      this.io.emit("sync:events", this.world.pendingEvents);
    }

    // Vote state
    this.io.emit("vote:state", this.world.getVoteManager().getState());

    // Agent paths (waypoints) - always emit, even when empty so clients can clear
    const pathsObj: Record<number, Waypoint[]> = {};
    for (const [agentId, waypoints] of this.world.agentPaths) {
      pathsObj[agentId] = waypoints;
    }
    this.io.emit("sync:paths", { paths: pathsObj });

    // Update followed agents
    this.broadcastFollowedAgents();
  }

  /** Push updated detail to sockets following specific agents */
  private broadcastFollowedAgents(): void {
    const followedIds = new Set(this.following.values());
    for (const agentId of followedIds) {
      const agent = this.world.agents.find((a) => a.id === agentId);
      if (agent) {
        this.io.to(`follow:${agentId}`).emit("agent:detail", agent.toFullState());
      }
    }
  }

  get connectedCount(): number {
    return this.io.engine?.clientsCount ?? 0;
  }
}
