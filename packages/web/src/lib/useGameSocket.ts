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
  ThinkingHistoryPayload,
  ThinkingProcess,
  Waypoint,
  TileMap,
  ItemState,
} from "@battle-royale/shared";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Support both absolute URLs (development) and relative paths (production behind proxy)
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

// Helper to determine if we should use relative path
function getSocketConfig(url: string) {
  // If URL starts with /, it's a relative path (proxied)
  if (url.startsWith("/")) {
    return {
      path: url + "/socket.io",
      // Use current window location as base
      url: undefined,
    };
  }
  // Otherwise it's an absolute URL
  return {
    path: "/socket.io",
    url: url,
  };
}

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
    thinkingHistory: new Map(),
  });

  useEffect(() => {
    const config = getSocketConfig(SERVER_URL);
    const socket: GameSocket = config.url 
      ? io(config.url, { path: config.path })
      : io({ path: config.path });
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

    // Thinking history (on demand)
    socket.on("thinking:history", (data: ThinkingHistoryPayload) => {
      setState((s) => {
        const thinkingHistory = new Map(s.thinkingHistory);
        thinkingHistory.set(data.agentId, data.history);
        return { ...s, thinkingHistory };
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
    // Request thinking history when inspecting an agent
    socketRef.current?.emit("thinking:request", agentId, 20);
    setState((s) => {
      const agent = s.agents.get(agentId) ?? null;
      return { ...s, selectedAgent: agent };
    });
  }, []);

  const clearSelection = useCallback(() => {
    socketRef.current?.emit("agent:follow", null);
    setState((s) => ({ ...s, selectedAgent: null }));
  }, []);

  const requestThinkingHistory = useCallback((agentId: number, limit: number = 10) => {
    socketRef.current?.emit("thinking:request", agentId, limit);
  }, []);

  return { state, submitVote, inspectAgent, clearSelection, requestThinkingHistory };
}
