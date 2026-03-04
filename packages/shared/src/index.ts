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
  /** Sprite atlas key that maps to a character texture (e.g. "乔治"). */
  spriteKey: string;
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
  /** Current plan — the agent's active goal */
  currentPlan: string;
  /** Sprite atlas key identifying which character texture to render */
  spriteKey: string;
  memories: MemoryEntry[];
  /** AI thinking process - the reasoning behind the last decision */
  thinkingProcess?: ThinkingProcess;
}

/** Represents the AI's thinking process for a decision */
export interface ThinkingProcess {
  /** The decision/action taken */
  action: string;
  /** The reasoning/logic behind the decision */
  reasoning: string;
  /** LLM prompt used (optional, for debugging) */
  prompt?: string;
  /** Raw LLM response (optional, for debugging) */
  rawResponse?: string;
  /** Timestamp when the decision was made */
  timestamp: number;
}

// --- Memory ---

export interface MemoryEntry {
  text: string;
  type: MemoryType;
  importance: number;
  timestamp: number;
}

export enum MemoryType {
  Observation = 'observation',
  Reflection = 'reflection',
  Plan = 'plan',
  InnerVoice = 'inner_voice',
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
  /** Base damage per tick when outside safe zone */
  zoneDamageBase: number;
  /** Minimum safe zone size (full width/height) */
  minZoneSize: number;
  /** Maximum steps an agent can move per tick (default: 8) */
  maxStepsPerTick: number;
  /** Maximum path length for pathfinding to prevent over-planning (optional) */
  maxPathLength?: number;
}

export interface WorldSyncState {
  tick: number;
  aliveCount: number;
  shrinkBorder: number;
  phase: GamePhase;
  /** Zone center X coordinate (randomized each game) */
  zoneCenterX: number;
  /** Zone center Y coordinate (randomized each game) */
  zoneCenterY: number;
}

export enum GamePhase {
  WaitingToStart = 'waiting',
  Running = 'running',
  Finished = 'finished',
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
  Kill = 'kill',
  Alliance = 'alliance',
  Betrayal = 'betrayal',
  Combat = 'combat',
  Loot = 'loot',
  ZoneShrink = 'zone_shrink',
  Vote = 'vote',
  GameOver = 'game_over',
  AgentSpawn = 'agent_spawn',
}

// --- Socket.IO Protocol ---
// Defines every message between server and client

/** Server → Client events */
export interface ServerToClientEvents {
  /** Full world state (on connect / reconnect) */
  'sync:full': (data: FullSyncPayload) => void;
  /** World-level tick update */
  'sync:world': (data: WorldSyncState) => void;
  /** Agent position/state changes */
  'sync:agents': (data: AgentSyncPayload) => void;
  /** Game events (kills, alliances, etc.) */
  'sync:events': (data: GameEvent[]) => void;
  /** Item spawns/removals */
  'sync:items': (data: ItemSyncPayload) => void;
  /** Vote state update */
  'vote:state': (data: VoteState) => void;
  /** Agent detail (on demand) */
  'agent:detail': (data: AgentFullState) => void;
  /** Agent paths (waypoints for movement) */
  'sync:paths': (data: PathSyncPayload) => void;
  /** Agent thinking history (on demand) */
  'thinking:history': (data: ThinkingHistoryPayload) => void;
}

/** Client → Server events */
export interface ClientToServerEvents {
  /** Submit a vote */
  'vote:submit': (data: Vote) => void;
  /** Request agent detail */
  'agent:inspect': (agentId: number) => void;
  /** Follow an agent (receive their details on change) */
  'agent:follow': (agentId: number | null) => void;
  /** Request agent thinking history */
  'thinking:request': (agentId: number, limit?: number) => void;
}

// --- Sync Payloads ---

export interface FullSyncPayload {
  world: WorldSyncState;
  agents: AgentFullState[];
  items: ItemState[];
  votes: VoteState;
  events: GameEvent[];
  tileMap: TileMap;
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

export interface PathSyncPayload {
  /** Map of agent ID to their calculated path */
  paths: Record<number, Waypoint[]>;
}

export interface ThinkingHistoryPayload {
  /** Agent ID this history belongs to */
  agentId: number;
  /** Array of thinking processes, newest first */
  history: ThinkingProcess[];
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
  /**
   * The agent's current active plan.
   * Plan retrieval step:
   * the decision engine receives the current plan and may propose a new one
   * via Decision.newPlan.
   */
  currentPlan: string;
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
  /**
   * If set, the agent will adopt this as its new plan.
   * Plan revision mechanism.
   */
  newPlan?: string;
  /** Thinking process behind this decision */
  thinking?: ThinkingProcess;
}

export enum DecisionType {
  Attack = 'attack',
  Flee = 'flee',
  Ally = 'ally',
  Betray = 'betray',
  Loot = 'loot',
  Explore = 'explore',
  Rest = 'rest',
}

// --- Pathfinding & Map ---

/** Tile types for the tile-based map */
export enum TileType {
  Passable = 0,
  Blocked = 1,
}

/** A single tile in the map grid */
export interface Tile {
  type: TileType;
  /** Movement weight/cost, extensible for future terrain types (default: 1) */
  weight?: number;
  /** Items or objects on this tile (extensible for future features) */
  items?: number[];
}

/** Tile-based map structure */
export interface TileMap {
  width: number;
  height: number;
  tiles: Tile[][];
}

/** A waypoint in a calculated path */
export interface Waypoint {
  x: number;
  y: number;
}

/** A calculated path from start to goal */
export interface Path {
  waypoints: Waypoint[];
  /** Total cost of the path */
  cost: number;
}

/** Pathfinding engine plugin interface */
export interface PathfindingEngine {
  readonly name: string;
  /**
   * Find a path from start to goal on the given tile map.
   * Returns null if no path exists.
   */
  findPath(map: TileMap, start: Waypoint, goal: Waypoint): Path | null;
}

/** Map storage provider plugin interface */
export interface MapStorageProvider {
  readonly name: string;
  /**
   * Serialize a tile map to a storable format (e.g., binary).
   */
  serialize(map: TileMap): Uint8Array;
  /**
   * Deserialize a tile map from storage format.
   */
  deserialize(data: Uint8Array): TileMap;
}

// --- Default Config ---

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  gridSize: 140,
  tickIntervalMs: 1000,
  votingWindowMs: 30000,
  agentCount: 10,
  shrinkIntervalTicks: 30,
  agentTemplates: [],
  zoneDamageBase: 2,
  minZoneSize: 10,
  maxStepsPerTick: 8,
  maxPathLength: 30,
};

/**
 * Default agent templates.
 * Each agent maps to a character texture from the village assets.
 */
export const DEFAULT_AGENT_TEMPLATES: AgentTemplate[] = [
  {
    name: '乔治',
    spriteKey: '乔治',
    personality: '分析型',
    description: '数学家，喜欢解决复杂问题，擅长逻辑分析',
    baseStats: { hp: 100, attack: 8, defense: 8 },
  },
  {
    name: '亚当',
    spriteKey: '亚当',
    personality: '艺术型',
    description: '艺术家，感情丰富，在困境中寻找创意解决方案',
    baseStats: { hp: 90, attack: 7, defense: 7 },
  },
  {
    name: '亚瑟',
    spriteKey: '亚瑟',
    personality: '勇敢型',
    description: '前军人，意志坚定，从不退缩',
    baseStats: { hp: 110, attack: 11, defense: 7 },
  },
  {
    name: '伊莎贝拉',
    spriteKey: '伊莎贝拉',
    personality: '社交型',
    description: '咖啡馆老板，善于与人交流，擅长建立同盟',
    baseStats: { hp: 100, attack: 9, defense: 9 },
  },
  {
    name: '克劳斯',
    spriteKey: '克劳斯',
    personality: '狡猾型',
    description: '商人出身，善于算计，喜欢在背后操控局势',
    baseStats: { hp: 85, attack: 13, defense: 4 },
  },
  {
    name: '卡洛斯',
    spriteKey: '卡洛斯',
    personality: '冲动型',
    description: '热血青年，凭直觉行动，爆发力强',
    baseStats: { hp: 95, attack: 11, defense: 5 },
  },
  {
    name: '卡门',
    spriteKey: '卡门',
    personality: '谨慎型',
    description: '医生，细心谨慎，在危险中保持冷静',
    baseStats: { hp: 120, attack: 6, defense: 10 },
  },
  {
    name: '埃迪',
    spriteKey: '埃迪',
    personality: '忠诚型',
    description: '忠实的伙伴，重视承诺，竭力保护盟友',
    baseStats: { hp: 100, attack: 9, defense: 9 },
  },
  {
    name: '塔玛拉',
    spriteKey: '塔玛拉',
    personality: '机智型',
    description: '记者，眼观六路耳听八方，善于收集情报',
    baseStats: { hp: 100, attack: 7, defense: 8 },
  },
  {
    name: '山姆',
    spriteKey: '山姆',
    personality: '激进型',
    description: '街头混混，以暴制暴，令敌人闻风丧胆',
    baseStats: { hp: 90, attack: 14, defense: 3 },
  },
];

export enum SocketEvents {
  CONNECTED = 'connect',
  CONNECTION = 'connection',
  DISCONNECTED = 'disconnect',
  SYNC_FULL = 'sync:full',
  SYNC_WORLD = 'sync:world',
  SYNC_AGENTS = 'sync:agents',
  SYNC_EVENTS = 'sync:events',
  VOTE_STATE = 'vote:state',
  AGENT_DETAIL = 'agent:detail',
  THINKING_HISTORY = 'thinking:history',
  SYNC_PATHS = 'sync:paths',
  VOTE_SUBMIT = 'vote:submit',
  AGENT_INSPECT = 'agent:inspect',
  AGENT_FOLLOW = 'agent:follow',
  THINKING_REQUEST = 'thinking:request',
}
