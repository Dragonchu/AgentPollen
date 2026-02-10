import { AgentTemplate, DEFAULT_AGENT_TEMPLATES } from "@battle-royale/shared";
import { Agent } from "./Agent.js";

/**
 * Factory for creating agents.
 *
 * Extension points:
 * - Register custom templates for themed events
 * - Override `createAgent()` for procedural generation
 * - Add post-creation hooks (e.g., inject special memories, items)
 */
export class AgentFactory {
  private templates: AgentTemplate[];
  private nextId = 0;

  constructor(templates?: AgentTemplate[]) {
    this.templates = templates ?? [...DEFAULT_AGENT_TEMPLATES];
  }

  /** Register additional templates */
  addTemplate(template: AgentTemplate): void {
    this.templates.push(template);
  }

  /** Create a single agent at a position */
  createAgent(x: number, y: number, template?: AgentTemplate): Agent {
    const t = template ?? this.templates[this.nextId % this.templates.length];
    const agent = new Agent(this.nextId, t, x, y);
    this.nextId++;
    return agent;
  }

  /** Spawn N agents randomly across a grid */
  spawnAgents(count: number, gridSize: number): Agent[] {
    const agents: Agent[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      agents.push(this.createAgent(x, y));
    }
    return agents;
  }

  get templateCount(): number {
    return this.templates.length;
  }
}
