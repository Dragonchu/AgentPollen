// ============================================================
// @battle-royale/shared - Types & Interfaces
// The single source of truth for server-client communication
// ============================================================

// --- Agent ---

/** Template for creating agents. Extend this for custom agent types. */
export interface AgentTemplate {
  name: string;
  personality: string;
  description: string;
  /** Base stats, will be varied slightly per instance */
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
  };
}

export enum AgentActionState {
  Idle = 0,
  Exploring = 1,
  Fighting = 2,
  Fleeing = 3,
  Looting = 4,
  Allying = 5,
  Betraying = 6,
  Dead = 7,
}

/** Minimal agent state synced every tick to all clients */
export interface AgentSyncState {
  id: number;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  /** Encoded action state for rendering */
  actionState: AgentActionState;
}

/** Full agent info, sent on demand when client inspects an agent */
export interface AgentFullState extends AgentSyncState {
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  personality: string;
  weapon: string;
  killCount: number;
  alliances: number[];
  enemies: number[];
  currentAction: string;
  memories: MemoryEntry[];
}

// --- Memory ---

export interface MemoryEntry {
  text: string;
  type: MemoryType;
  importance: number;
  timestamp: number;
}

export enum MemoryType {
  Observation = "observation",
  Reflection = "reflection",
  Plan = "plan",
  InnerVoice = "inner_voice",
}

// --- World ---

export interface WorldConfig {
  gridSize: number;
  agentCount: number;
  tickIntervalMs: number;
  votingWindowMs: number;
  shrinkIntervalTicks: number;
  /** Agent templates to use for spawning */
  agentTemplates: AgentTemplate[];
}

export interface WorldSyncState {
  tick: number;
  aliveCount: number;
  shrinkBorder: number;
  phase: GamePhase;
}

export enum GamePhase {
  WaitingToStart = "waiting",
  Running = "running",
  Finished = "finished",
}

// --- Items ---

export interface ItemState {
  id: number;
  x: number;
  y: number;
  type: string;
  bonus: number;
}

// --- Voting ---

export interface Vote {
  agentId: number;
  action: string;
  playerId: string;
}

export interface VoteOption {
  action: string;
  votes: number;
}

export interface VoteState {
  /** Current voting window ID */
  windowId: number;
  /** Time remaining in current window (ms) */
  timeRemainingMs: number;
  /** Votes per agent */
  agentVotes: Record<number, VoteOption[]>;
}

// --- Events ---

export interface GameEvent {
  type: GameEventType;
  tick: number;
  message: string;
  agentIds: number[];
  timestamp: number;
}

export enum GameEventType {
  Kill = "kill",
  Alliance = "alliance",
  Betrayal = "betrayal",
  Combat = "combat",
  Loot = "loot",
  ZoneShrink = "zone_shrink",
  Vote = "vote",
  GameOver = "game_over",
  AgentSpawn = "agent_spawn",
}

// --- Socket.IO Protocol ---
// Defines every message between server and client

/** Server → Client events */
export interface ServerToClientEvents {
  /** Full world state (on connect / reconnect) */
  "sync:full": (data: FullSyncPayload) => void;
  /** World-level tick update */
  "sync:world": (data: WorldSyncState) => void;
  /** Agent position/state changes */
  "sync:agents": (data: AgentSyncPayload) => void;
  /** Game events (kills, alliances, etc.) */
  "sync:events": (data: GameEvent[]) => void;
  /** Item spawns/removals */
  "sync:items": (data: ItemSyncPayload) => void;
  /** Vote state update */
  "vote:state": (data: VoteState) => void;
  /** Agent detail (on demand) */
  "agent:detail": (data: AgentFullState) => void;
}

/** Client → Server events */
export interface ClientToServerEvents {
  /** Submit a vote */
  "vote:submit": (data: Vote) => void;
  /** Request agent detail */
  "agent:inspect": (agentId: number) => void;
  /** Follow an agent (receive their details on change) */
  "agent:follow": (agentId: number | null) => void;
}

// --- Sync Payloads ---

export interface FullSyncPayload {
  world: WorldSyncState;
  agents: AgentFullState[];
  items: ItemState[];
  votes: VoteState;
  events: GameEvent[];
}

export interface AgentSyncPayload {
  tick: number;
  /** Only agents that changed since last tick */
  changes: AgentSyncState[];
}

export interface ItemSyncPayload {
  added: ItemState[];
  removed: number[]; // item IDs
}

// --- Decision Engine Plugin Interface ---

/**
 * The core extensibility point for agent AI.
 * MVP: implement with simple rules.
 * Production: implement with LLM calls.
 */
export interface DecisionEngine {
  /** Unique identifier for this engine */
  readonly name: string;

  /**
   * Given an agent's context, decide what to do next.
   * Returns a Decision that the world will execute.
   */
  decide(context: DecisionContext): Promise<Decision>;

  /**
   * Generate a reflection from recent memories.
   * Can return null if no reflection is warranted.
   */
  reflect(context: ReflectionContext): Promise<string | null>;
}

export interface DecisionContext {
  agent: AgentFullState;
  nearbyAgents: Array<{ agent: AgentFullState; distance: number }>;
  nearbyItems: ItemState[];
  worldState: WorldSyncState;
  recentMemories: MemoryEntry[];
  innerVoice: string | null;
}

export interface ReflectionContext {
  agent: AgentFullState;
  recentMemories: MemoryEntry[];
}

export interface Decision {
  type: DecisionType;
  targetId?: number; // agent or item ID
  direction?: { dx: number; dy: number };
  reason?: string; // for logging / display
}

export enum DecisionType {
  Attack = "attack",
  Flee = "flee",
  Ally = "ally",
  Betray = "betray",
  Loot = "loot",
  Explore = "explore",
  Rest = "rest",
}

// --- Default Config ---

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  gridSize: 20,
  tickIntervalMs: 1000,
  votingWindowMs: 30000,
  agentCount: 10,
  shrinkIntervalTicks: 30,
  agentTemplates: [],
};

export const DEFAULT_AGENT_TEMPLATES: AgentTemplate[] = [
  { name: "Kael", personality: "aggressive", description: "A fierce warrior who strikes first", baseStats: { hp: 100, attack: 12, defense: 5 } },
  { name: "Lyra", personality: "strategic", description: "A cunning tactician who plans ahead", baseStats: { hp: 100, attack: 8, defense: 8 } },
  { name: "Ren", personality: "cautious", description: "A careful survivor who avoids risks", baseStats: { hp: 120, attack: 6, defense: 10 } },
  { name: "Zara", personality: "cunning", description: "A deceptive manipulator", baseStats: { hp: 90, attack: 10, defense: 6 } },
  { name: "Orion", personality: "brave", description: "A bold fighter who never backs down", baseStats: { hp: 110, attack: 11, defense: 7 } },
  { name: "Vex", personality: "treacherous", description: "Trust no one, and no one trusts Vex", baseStats: { hp: 85, attack: 13, defense: 4 } },
  { name: "Nova", personality: "loyal", description: "Fiercely protective of allies", baseStats: { hp: 100, attack: 9, defense: 9 } },
  { name: "Thane", personality: "impulsive", description: "Acts on instinct, for better or worse", baseStats: { hp: 95, attack: 11, defense: 5 } },
  { name: "Iris", personality: "resourceful", description: "Always finds a way to survive", baseStats: { hp: 100, attack: 7, defense: 8 } },
  { name: "Ash", personality: "aggressive", description: "Born to fight, lives for battle", baseStats: { hp: 90, attack: 14, defense: 3 } },
];
