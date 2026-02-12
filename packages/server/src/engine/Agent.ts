import {
  AgentTemplate,
  AgentSyncState,
  AgentFullState,
  AgentActionState,
  MemoryType,
  Decision,
  ItemState,
  ThinkingProcess,
} from "@battle-royale/shared";
import { MemoryStream } from "./MemoryStream.js";

export interface AgentPerception {
  nearbyAgents: Array<{ agent: Agent; distance: number }>;
  nearbyItems: ItemState[];
}

/**
 * An agent in the battle royale world.
 *
 * Extension points:
 * - Agent creation via AgentFactory (custom templates, procedural generation)
 * - Decision logic is external (DecisionEngine plugin)
 * - Visual representation is client-side (sprite key maps to agent properties)
 */
export class Agent {
  readonly id: number;
  readonly name: string;
  readonly personality: string;
  readonly description: string;
  readonly color: string;

  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  alive: boolean = true;
  weapon: string = "bare fists";
  killCount: number = 0;

  actionState: AgentActionState = AgentActionState.Idle;
  currentAction: string = "Surveying surroundings";
  currentDecision: Decision | null = null;
  thinkingProcess: ThinkingProcess | null = null;

  readonly memory: MemoryStream = new MemoryStream();
  readonly alliances: Set<number> = new Set();
  readonly enemies: Set<number> = new Set();

  constructor(id: number, template: AgentTemplate, x: number, y: number) {
    this.id = id;
    this.name = template.name;
    this.personality = template.personality;
    this.description = template.description;
    this.color = `hsl(${(id * 137) % 360}, 70%, 60%)`;

    this.x = x;
    this.y = y;
    this.hp = template.baseStats.hp + Math.floor(Math.random() * 20) - 10;
    this.maxHp = this.hp;
    this.attack = template.baseStats.attack + Math.floor(Math.random() * 4) - 2;
    this.defense = template.baseStats.defense + Math.floor(Math.random() * 4) - 2;

    // Seed memory with identity
    this.memory.add(
      `I am ${this.name}. I am ${this.personality}. ${this.description}. I must survive.`,
      8,
      MemoryType.Observation,
    );
  }

  /** Hear the inner voice (player vote result) */
  hearInnerVoice(message: string): void {
    this.memory.add(`[Inner Voice] ${message}`, 9, MemoryType.InnerVoice);
  }

  /** Perceive nearby agents and items within vision range */
  perceive(allAgents: Agent[], allItems: ItemState[], visionRange = 4): AgentPerception {
    const nearbyAgents: AgentPerception["nearbyAgents"] = [];
    for (const other of allAgents) {
      if (other.id === this.id || !other.alive) continue;
      const dist = Math.abs(other.x - this.x) + Math.abs(other.y - this.y);
      if (dist <= visionRange) {
        nearbyAgents.push({ agent: other, distance: dist });
      }
    }
    const nearbyItems = allItems.filter(
      (item) => Math.abs(item.x - this.x) + Math.abs(item.y - this.y) <= 2,
    );
    return { nearbyAgents, nearbyItems };
  }

  /** Move toward a target position */
  moveToward(tx: number, ty: number, gridSize: number): void {
    const dx = Math.sign(tx - this.x);
    const dy = Math.sign(ty - this.y);
    this.x = Math.max(0, Math.min(gridSize - 1, this.x + dx));
    this.y = Math.max(0, Math.min(gridSize - 1, this.y + dy));
  }

  /** Move away from a position */
  moveAwayFrom(fx: number, fy: number, gridSize: number): void {
    const dx = Math.sign(this.x - fx) || 1;
    const dy = Math.sign(this.y - fy) || 1;
    this.x = Math.max(0, Math.min(gridSize - 1, this.x + dx));
    this.y = Math.max(0, Math.min(gridSize - 1, this.y + dy));
  }

  /** Random exploration move */
  moveRandom(gridSize: number): void {
    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 3) - 1;
    this.x = Math.max(0, Math.min(gridSize - 1, this.x + dx));
    this.y = Math.max(0, Math.min(gridSize - 1, this.y + dy));
  }

  takeDamage(amount: number, source: string): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.actionState = AgentActionState.Dead;
    }
    this.memory.add(
      `I took ${amount} damage from ${source}. HP: ${this.hp}/${this.maxHp}`,
      7,
      MemoryType.Observation,
    );
  }

  // --- Serialization ---

  toSyncState(): AgentSyncState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      hp: this.hp,
      alive: this.alive,
      actionState: this.actionState,
    };
  }

  toFullState(): AgentFullState {
    return {
      ...this.toSyncState(),
      name: this.name,
      maxHp: this.maxHp,
      attack: this.attack,
      defense: this.defense,
      personality: this.personality,
      weapon: this.weapon,
      killCount: this.killCount,
      alliances: [...this.alliances],
      enemies: [...this.enemies],
      currentAction: this.currentAction,
      memories: this.memory.getRecent(15),
      thinkingProcess: this.thinkingProcess ?? undefined,
    };
  }
}
