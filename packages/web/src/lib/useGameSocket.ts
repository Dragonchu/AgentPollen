"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  Waypoint,
  TileMap,
  ItemState,
} from "@battle-royale/shared";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

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
}

export function useGameSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const [state, setState] = useState<GameState>({
    connected: false,
    world: null,
    agents: new Map(),
    items: [],
    events: [],
    votes: null,
    selectedAgent: null,
    agentPaths: {},
    tileMap: null,
  });

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setState((s) => ({ ...s, connected: true }));
    });

    socket.on("disconnect", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    // Full sync on connect
    socket.on("sync:full", (data: FullSyncPayload) => {
      const agentMap = new Map<number, AgentFullState>();
      for (const a of data.agents) agentMap.set(a.id, a);
      setState((s) => ({
        ...s,
        world: data.world,
        agents: agentMap,
        items: data.items,
        votes: data.votes,
        events: data.events,
        tileMap: data.tileMap,
      }));
    });

    // World state updates
    socket.on("sync:world", (data: WorldSyncState) => {
      setState((s) => ({ ...s, world: data }));
    });

    // Agent updates (full or delta - client doesn't care)
    socket.on("sync:agents", (data: AgentSyncPayload) => {
      setState((s) => {
        const agents = new Map(s.agents);
        for (const change of data.changes) {
          const existing = agents.get(change.id);
          if (existing) {
            agents.set(change.id, { ...existing, ...change });
          }
        }
        return { ...s, agents };
      });
    });

    // Events
    socket.on("sync:events", (events: GameEvent[]) => {
      setState((s) => ({
        ...s,
        events: [...events, ...s.events].slice(0, 50),
      }));
    });

    // Vote state
    socket.on("vote:state", (votes: VoteState) => {
      setState((s) => ({ ...s, votes }));
    });

    // Agent detail (on demand)
    socket.on("agent:detail", (detail: AgentFullState) => {
      setState((s) => {
        const agents = new Map(s.agents);
        agents.set(detail.id, detail);
        return {
          ...s,
          agents,
          selectedAgent: s.selectedAgent?.id === detail.id ? detail : s.selectedAgent,
        };
      });
    });

    // Path updates (for smooth movement visualization)
    socket.on("sync:paths", (data: PathSyncPayload) => {
      setState((s) => ({ ...s, agentPaths: data.paths }));
    });

    return () => {
      // Clear agent paths on disconnect to avoid carrying over stale path data
      setState((s) => ({ ...s, agentPaths: {} }));
      socket.disconnect();
    };
  }, []);

  // Actions
  const submitVote = useCallback((agentId: number, action: string) => {
    socketRef.current?.emit("vote:submit", {
      agentId,
      action,
      playerId: socketRef.current.id ?? "anon",
    });
  }, []);

  const inspectAgent = useCallback((agentId: number) => {
    socketRef.current?.emit("agent:inspect", agentId);
    socketRef.current?.emit("agent:follow", agentId);
    setState((s) => {
      const agent = s.agents.get(agentId) ?? null;
      return { ...s, selectedAgent: agent };
    });
  }, []);

  const clearSelection = useCallback(() => {
    socketRef.current?.emit("agent:follow", null);
    setState((s) => ({ ...s, selectedAgent: null }));
  }, []);

  return { state, submitVote, inspectAgent, clearSelection };
}
