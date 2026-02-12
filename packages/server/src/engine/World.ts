import {
  WorldConfig,
  WorldSyncState,
  GamePhase,
  GameEvent,
  GameEventType,
  ItemState,
  Decision,
  DecisionEngine,
  DecisionType,
  DecisionContext,
  MemoryType,
  AgentActionState,
  FullSyncPayload,
  AgentSyncState,
  DEFAULT_WORLD_CONFIG,
  TileMap,
  PathfindingEngine,
  Waypoint,
} from "@battle-royale/shared";
import { Agent } from "./Agent.js";
import { AgentFactory } from "./AgentFactory.js";
import { VoteManager } from "./VoteManager.js";
import { MapGenerator } from "../pathfinding/MapGenerator.js";

/**
 * The game world. Manages the simulation loop.
 *
 * Extension points:
 * - `decisionEngine`: swap rule-based for LLM
 * - `agentFactory`: custom agent generation
 * - `onEvent` callbacks: hook into game events for persistence, analytics
 * - `serialize/restore`: for persistence layer
 */
export class World {
  readonly config: WorldConfig;
  agents: Agent[] = [];
  items: ItemState[] = [];
  tick = 0;
  aliveCount = 0;
  shrinkBorder: number;
  phase: GamePhase = GamePhase.WaitingToStart;
  winner: Agent | null = null;
  pendingEvents: GameEvent[] = [];
  tileMap: TileMap;

  private decisionEngine: DecisionEngine;
  private pathfindingEngine: PathfindingEngine;
  private agentFactory: AgentFactory;
  private voteManager: VoteManager;
  private nextItemId = 0;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  /** Previous tick state for delta computation */
  private prevAgentStates: Map<number, string> = new Map();
  
  /** Agent paths to broadcast to clients */
  agentPaths: Map<number, Waypoint[]> = new Map();

  constructor(
    config: Partial<WorldConfig>, 
    engine: DecisionEngine, 
    pathfinder: PathfindingEngine,
    factory?: AgentFactory
  ) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    this.decisionEngine = engine;
    this.pathfindingEngine = pathfinder;
    this.agentFactory = factory ?? new AgentFactory(this.config.agentTemplates.length > 0 ? this.config.agentTemplates : undefined);
    this.voteManager = new VoteManager(this.config.votingWindowMs);
    this.shrinkBorder = this.config.gridSize;

    // Initialize tile map
    this.tileMap = MapGenerator.createEmpty(this.config.gridSize, this.config.gridSize);
    MapGenerator.addRandomObstacles(this.tileMap, 0.15); // 15% obstacle density

    // Wire vote resolution → agent inner voice
    this.voteManager.setOnResolve((results) => {
      for (const [agentId, action] of results) {
        const agent = this.agents.find((a) => a.id === agentId);
        if (agent?.alive) {
          agent.hearInnerVoice(action);
          this.emitEvent(GameEventType.Vote, `Players whispered to ${agent.name}: "${action}"`, [agentId]);
        }
      }
    });
  }

  /** Initialize the world with agents and items */
  init(): void {
    // Reset per-run world state for restarts
    this.tick = 0;
    this.aliveCount = 0;
    this.winner = null;
    this.items = [];
    this.pendingEvents = [];
    this.nextItemId = 0;
    this.prevAgentStates.clear();
    this.agentPaths.clear();
    this.shrinkBorder = this.config.gridSize;
    this.phase = GamePhase.WaitingToStart;

    // Spawn agents on passable tiles
    const agents: Agent[] = [];
    for (let i = 0; i < this.config.agentCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = this.config.gridSize * this.config.gridSize * 2; // Safety limit
      
      do {
        x = Math.floor(Math.random() * this.config.gridSize);
        y = Math.floor(Math.random() * this.config.gridSize);
        attempts++;
        
        // If we've tried many times, throw an error - the map may be too crowded
        if (attempts >= maxAttempts) {
          throw new Error(
            `Failed to find passable spawn location for agent ${i} after ${maxAttempts} attempts. ` +
            `Map may have too few passable tiles (gridSize: ${this.config.gridSize}, agentCount: ${this.config.agentCount})`
          );
        }
      } while (!MapGenerator.isPassable(this.tileMap, x, y));
      
      agents.push(this.agentFactory.createAgent(x, y));
    }
    this.agents = agents;
    this.aliveCount = this.agents.length;
    this.spawnItems(Math.floor(this.config.agentCount / 2));
    this.phase = GamePhase.Running;

    for (const agent of this.agents) {
      this.emitEvent(GameEventType.AgentSpawn, `${agent.name} enters the arena`, [agent.id]);
    }
  }

  /** Main simulation tick */
  async update(): Promise<GameEvent[]> {
    if (this.phase !== GamePhase.Running) return [];

    this.tick++;
    this.pendingEvents = [];

    // 1. Shrinking zone
    this.handleZoneShrink();

    // 2. Spawn items periodically
    if (this.tick % 10 === 0) this.spawnItems(3);

    // 3. Process votes
    const voteResult = this.voteManager.tick();

    // 4. Agent loop: perceive → decide → execute
    const shuffled = this.agents.filter((a) => a.alive).sort(() => Math.random() - 0.5);
    for (const agent of shuffled) {
      if (!agent.alive) continue;

      // Perceive
      const perception = agent.perceive(this.agents, this.items);

      // Decide (via engine plugin)
      const context = this.buildDecisionContext(agent, perception);
      const decision = await this.decisionEngine.decide(context);
      agent.currentDecision = decision;

      // Store thinking process if available
      if (decision.thinking) {
        agent.thinkingProcess = decision.thinking;
      }

      // Execute
      this.executeDecision(agent, decision);

      // Reflect periodically
      if (this.tick % 5 === 0) {
        const reflection = await this.decisionEngine.reflect({
          agent: agent.toFullState(),
          recentMemories: agent.memory.getRecent(10),
        });
        if (reflection) {
          agent.memory.add(reflection, 7, MemoryType.Reflection);
        }
      }
    }

    // 5. Check win condition
    const alive = this.agents.filter((a) => a.alive);
    if (alive.length <= 1) {
      this.winner = alive[0] ?? null;
      this.phase = GamePhase.Finished;
      if (this.winner) {
        this.emitEvent(
          GameEventType.GameOver,
          `${this.winner.name} WINS! Kills: ${this.winner.killCount}`,
          [this.winner.id],
        );
      }
    }

    return this.pendingEvents;
  }

  // --- Decision Execution ---

  private executeDecision(agent: Agent, decision: Decision): void {
    switch (decision.type) {
      case DecisionType.Attack:
        this.executeAttack(agent, decision.targetId!);
        break;
      case DecisionType.Ally:
        this.executeAlly(agent, decision.targetId!);
        break;
      case DecisionType.Betray:
        this.executeBetray(agent, decision.targetId!);
        break;
      case DecisionType.Loot:
        this.executeLoot(agent, decision.targetId!);
        break;
      case DecisionType.Flee:
        this.executeFlee(agent);
        break;
      default:
        agent.moveRandom(this.config.gridSize, this.tileMap);
        agent.actionState = AgentActionState.Exploring;
        agent.currentAction = decision.reason ?? "Exploring";
        // Clear path since agent is not using pathfinding
        this.agentPaths.delete(agent.id);
        break;
    }
  }

  private executeAttack(agent: Agent, targetId: number): void {
    const target = this.agents.find((a) => a.id === targetId);
    if (!target?.alive) return;

    const dist = Math.abs(target.x - agent.x) + Math.abs(target.y - agent.y);
    if (dist <= 1) {
      const dmg = Math.max(1, agent.attack - target.defense / 2 + Math.floor(Math.random() * 5));
      target.takeDamage(dmg, agent.name);
      agent.memory.add(`I attacked ${target.name} for ${dmg} damage`, 7, MemoryType.Observation);
      agent.enemies.add(target.id);
      target.enemies.add(agent.id);
      agent.actionState = AgentActionState.Fighting;
      agent.currentAction = `Fighting ${target.name}`;

      this.emitEvent(GameEventType.Combat, `${agent.name} hit ${target.name} for ${dmg} damage`, [agent.id, target.id]);

      if (!target.alive) {
        agent.killCount++;
        this.aliveCount--;
        this.emitEvent(GameEventType.Kill, `${agent.name} eliminated ${target.name}! (${this.aliveCount} remain)`, [agent.id, target.id]);
        agent.memory.add(`I eliminated ${target.name}. Kill count: ${agent.killCount}`, 9, MemoryType.Observation);
        // Remove dead agent from all alliances
        for (const a of this.agents) a.alliances.delete(target.id);
        // Clear any remaining path data for the eliminated agent
        this.agentPaths.delete(target.id);
      }
    } else {
      // Use pathfinding to move toward target
      this.moveAgentToward(agent, target.x, target.y);
      agent.actionState = AgentActionState.Fighting;
      agent.currentAction = `Pursuing ${target.name}`;
    }
  }

  private executeAlly(agent: Agent, targetId: number): void {
    const target = this.agents.find((a) => a.id === targetId);
    if (!target?.alive) return;

    const dist = Math.abs(target.x - agent.x) + Math.abs(target.y - agent.y);
    if (dist <= 2) {
      const accepted = !target.enemies.has(agent.id) && Math.random() < 0.6;
      if (accepted) {
        agent.alliances.add(target.id);
        target.alliances.add(agent.id);
        agent.memory.add(`I formed an alliance with ${target.name}`, 7, MemoryType.Observation);
        target.memory.add(`${agent.name} proposed an alliance and I accepted`, 7, MemoryType.Observation);
        this.emitEvent(GameEventType.Alliance, `${agent.name} and ${target.name} formed an alliance!`, [agent.id, target.id]);
      }
      agent.actionState = AgentActionState.Allying;
      agent.currentAction = accepted ? `Allied with ${target.name}` : `Alliance rejected by ${target.name}`;
    } else {
      this.moveAgentToward(agent, target.x, target.y);
      agent.actionState = AgentActionState.Allying;
      agent.currentAction = `Approaching ${target.name}`;
    }
  }

  private executeBetray(agent: Agent, targetId: number): void {
    const target = this.agents.find((a) => a.id === targetId);
    if (!target?.alive) return;

    agent.alliances.delete(target.id);
    target.alliances.delete(agent.id);
    agent.enemies.add(target.id);
    target.enemies.add(agent.id);

    const dmg = Math.max(1, agent.attack + 5 - target.defense / 2);
    target.takeDamage(dmg, `${agent.name}'s betrayal`);
    agent.memory.add(`I betrayed ${target.name} for ${dmg} damage`, 9, MemoryType.Observation);
    target.memory.add(`${agent.name} BETRAYED me!`, 10, MemoryType.Observation);
    agent.actionState = AgentActionState.Betraying;
    agent.currentAction = `Betrayed ${target.name}!`;

    this.emitEvent(GameEventType.Betrayal, `${agent.name} BETRAYED ${target.name}! ${dmg} damage!`, [agent.id, target.id]);

    if (!target.alive) {
      agent.killCount++;
      this.aliveCount--;
      this.emitEvent(GameEventType.Kill, `${agent.name} eliminated ${target.name} through betrayal! (${this.aliveCount} remain)`, [agent.id, target.id]);
      // Clear any remaining path data for the eliminated agent
      this.agentPaths.delete(target.id);
    }
  }

  private executeLoot(agent: Agent, itemId: number): void {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    const dist = Math.abs(item.x - agent.x) + Math.abs(item.y - agent.y);
    if (dist <= 1) {
      agent.weapon = item.type;
      agent.attack += item.bonus;
      this.items = this.items.filter((i) => i.id !== itemId);
      agent.memory.add(`Found a ${item.type} (+${item.bonus} ATK)`, 6, MemoryType.Observation);
      agent.actionState = AgentActionState.Looting;
      agent.currentAction = `Found ${item.type}!`;
      this.emitEvent(GameEventType.Loot, `${agent.name} found a ${item.type}!`, [agent.id]);
    } else {
      this.moveAgentToward(agent, item.x, item.y);
      agent.actionState = AgentActionState.Looting;
      agent.currentAction = "Moving to item";
    }
  }

  private executeFlee(agent: Agent): void {
    const perception = agent.perceive(this.agents, this.items);
    if (perception.nearbyAgents.length > 0) {
      let avgX = 0, avgY = 0;
      for (const a of perception.nearbyAgents) { avgX += a.agent.x; avgY += a.agent.y; }
      avgX /= perception.nearbyAgents.length;
      avgY /= perception.nearbyAgents.length;
      agent.moveAwayFrom(avgX, avgY, this.config.gridSize, this.tileMap);
    } else {
      agent.moveRandom(this.config.gridSize, this.tileMap);
    }
    agent.actionState = AgentActionState.Fleeing;
    agent.currentAction = "Fleeing!";
    agent.memory.add("I fled from danger", 5, MemoryType.Observation);
    // Clear path since agent is not using pathfinding
    this.agentPaths.delete(agent.id);
  }

  /**
   * Move agent toward a target using pathfinding.
   * Falls back to simple movement if pathfinding fails.
   * 
   * Note: If an agent is on a blocked tile (e.g., spawned before obstacles
   * were added, or map changed dynamically), pathfinding may fail. The
   * fallback ensures agents can still attempt movement.
   */
  private moveAgentToward(agent: Agent, targetX: number, targetY: number): void {
    const start = { x: agent.x, y: agent.y };
    const goal = { x: targetX, y: targetY };
    
    // Try to find a path (will fail if start is blocked or unreachable)
    const path = this.pathfindingEngine.findPath(this.tileMap, start, goal);
    
    if (path && path.waypoints.length > 0) {
      // Set the path and move along it
      agent.setPath(path.waypoints);
      agent.followPath(this.tileMap);
      // Store path for client sync
      this.agentPaths.set(agent.id, path.waypoints);
    } else {
      // Fallback to simple movement if pathfinding fails
      agent.moveToward(targetX, targetY, this.config.gridSize, this.tileMap);
      this.agentPaths.delete(agent.id);
    }
  }

  // --- Zone ---

  private handleZoneShrink(): void {
    if (this.tick % this.config.shrinkIntervalTicks !== 0) return;
    if (this.shrinkBorder <= 6) return;

    this.shrinkBorder -= 1;
    this.emitEvent(GameEventType.ZoneShrink, `Safe zone shrinks! Border: ${this.shrinkBorder}`, []);

    const cx = this.config.gridSize / 2;
    const cy = this.config.gridSize / 2;
    const half = this.shrinkBorder / 2;

    for (const agent of this.agents) {
      if (!agent.alive) continue;
      if (Math.abs(agent.x - cx) > half || Math.abs(agent.y - cy) > half) {
        agent.takeDamage(10, "zone");
        if (!agent.alive) {
          this.aliveCount--;
          this.emitEvent(GameEventType.Kill, `${agent.name} eliminated by the zone! (${this.aliveCount} remain)`, [agent.id]);
        }
      }
    }
  }

  // --- Items ---

  private spawnItems(count: number): void {
    const weapons = ["knife", "sword", "bow", "spear", "axe", "mace"];
    itemLoop: for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * weapons.length);
      
      // Find a passable tile for item spawning
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = this.config.gridSize * this.config.gridSize * 2; // Safety limit
      
      do {
        x = Math.floor(Math.random() * this.config.gridSize);
        y = Math.floor(Math.random() * this.config.gridSize);
        attempts++;
        
        // If we can't find a spot after many attempts, skip this item
        if (attempts >= maxAttempts) {
          console.warn(
            `Could not find passable location for item ${i} after ${maxAttempts} attempts, skipping`
          );
          continue itemLoop; // Skip to next item
        }
      } while (!MapGenerator.isPassable(this.tileMap, x, y));
      
      this.items.push({
        id: this.nextItemId++,
        x,
        y,
        type: weapons[idx],
        bonus: 2 + idx * 2,
      });
    }
  }

  // --- Context builders ---

  private buildDecisionContext(agent: Agent, perception: Agent["perceive"] extends (...args: any[]) => infer R ? R : never): DecisionContext {
    const innerVoiceMemories = agent.memory
      .getRecent(5)
      .filter((m) => m.type === MemoryType.InnerVoice && Date.now() - m.timestamp < 30000);

    return {
      agent: agent.toFullState(),
      nearbyAgents: perception.nearbyAgents.map((a) => ({
        agent: a.agent.toFullState(),
        distance: a.distance,
      })),
      nearbyItems: perception.nearbyItems,
      worldState: this.getWorldState(),
      recentMemories: agent.memory.getRecent(10),
      innerVoice: innerVoiceMemories.length > 0 ? innerVoiceMemories[0].text.replace("[Inner Voice] ", "") : null,
    };
  }

  // --- Event system ---

  private emitEvent(type: GameEventType, message: string, agentIds: number[]): void {
    const event: GameEvent = { type, tick: this.tick, message, agentIds, timestamp: Date.now() };
    this.pendingEvents.push(event);
    this.emit("event", event);
  }

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(listener);
  }

  private emit(event: string, ...args: any[]): void {
    for (const listener of this.eventListeners.get(event) ?? []) {
      listener(...args);
    }
  }

  // --- Public API ---

  getVoteManager(): VoteManager {
    return this.voteManager;
  }

  getWorldState(): WorldSyncState {
    return {
      tick: this.tick,
      aliveCount: this.aliveCount,
      shrinkBorder: this.shrinkBorder,
      phase: this.phase,
    };
  }

  /** Full sync payload for new connections */
  getFullSync(): FullSyncPayload {
    return {
      world: this.getWorldState(),
      agents: this.agents.map((a) => a.toFullState()),
      items: [...this.items],
      votes: this.voteManager.getState(),
      events: this.pendingEvents.slice(-20),
      tileMap: this.tileMap,
    };
  }

  /**
   * Compute delta: which agents changed since last tick.
   * Extension point: in production, also compute item deltas.
   */
  computeAgentDelta(): AgentSyncState[] {
    const changes: AgentSyncState[] = [];
    for (const agent of this.agents) {
      const curr = agent.toSyncState();
      const key = `${curr.x},${curr.y},${curr.hp},${curr.alive},${curr.actionState}`;
      if (this.prevAgentStates.get(agent.id) !== key) {
        changes.push(curr);
        this.prevAgentStates.set(agent.id, key);
      }
    }
    return changes;
  }

  // --- Serialization for persistence ---

  serialize(): string {
    return JSON.stringify({
      version: 1,
      tick: this.tick,
      aliveCount: this.aliveCount,
      shrinkBorder: this.shrinkBorder,
      phase: this.phase,
      agents: this.agents.map((a) => ({
        ...a.toFullState(),
        memories: a.memory.serialize(),
        alliances: [...a.alliances],
        enemies: [...a.enemies],
      })),
      items: this.items,
      nextItemId: this.nextItemId,
    });
  }
}
