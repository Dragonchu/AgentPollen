import OpenAI from "openai";
import {
  DecisionEngine,
  DecisionContext,
  ReflectionContext,
  Decision,
  DecisionType,
} from "@battle-royale/shared";
import { RuleBasedEngine } from "./RuleBasedEngine.js";

/**
 * LLM-based decision engine using DeepSeek.
 *
 * This implementation uses DeepSeek's OpenAI-compatible API to make
 * intelligent decisions for agents in the battle royale.
 *
 * Usage:
 *   const engine = new LLMEngine({ apiKey: "sk-..." });
 *   const world = new World(config, engine);
 *
 * Key features:
 * - DeepSeek API integration via OpenAI SDK
 * - Intelligent fallback to RuleBasedEngine on errors or rate limits
 * - Concurrency limiting to avoid rate limit issues
 * - Context-aware prompting with agent personality and memories
 *
 * Environment variables:
 * - DEEPSEEK_API_KEY: Your DeepSeek API key
 * - DEEPSEEK_MODEL: Model to use (default: deepseek-chat)
 */
export interface LLMEngineConfig {
  apiKey: string;
  model?: string;
  /** Base URL for DeepSeek API */
  baseURL?: string;
  /** Max concurrent LLM calls (rate limiting) */
  maxConcurrency?: number;
  /** Temperature for LLM responses (0-1, higher = more creative) */
  temperature?: number;
}

export class LLMEngine implements DecisionEngine {
  readonly name = "llm-deepseek";
  private config: Required<LLMEngineConfig> & { temperature: number };
  private client: OpenAI;
  private fallbackEngine: RuleBasedEngine;
  private activeCalls = 0;
  private callQueue: Array<() => void> = [];

  constructor(config: LLMEngineConfig) {
    this.config = {
      model: "deepseek-chat", // Valid models: deepseek-chat, deepseek-reasoner
      baseURL: "https://api.deepseek.com",
      maxConcurrency: 10,
      temperature: 0.7,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });

    this.fallbackEngine = new RuleBasedEngine();
  }

  async decide(ctx: DecisionContext): Promise<Decision> {
    try {
      // Use concurrency limiting to avoid rate limits
      await this.acquireLock();

      const prompt = this.buildDecisionPrompt(ctx);
      const response = await this.callLLM(prompt, 150);
      const decision = this.parseDecision(response, ctx);

      this.releaseLock();
      return decision;
    } catch (error) {
      this.releaseLock();
      console.warn(
        `LLM decision failed for ${ctx.agent.name}, using fallback:`,
        error instanceof Error ? error.message : error
      );
      return this.fallbackEngine.decide(ctx);
    }
  }

  async reflect(ctx: ReflectionContext): Promise<string | null> {
    try {
      await this.acquireLock();

      const prompt = this.buildReflectionPrompt(ctx);
      const response = await this.callLLM(prompt, 100);

      this.releaseLock();
      return response.trim() || null;
    } catch (error) {
      this.releaseLock();
      console.warn(
        `LLM reflection failed for ${ctx.agent.name}, using fallback:`,
        error instanceof Error ? error.message : error
      );
      return this.fallbackEngine.reflect(ctx);
    }
  }

  // --- Private Methods ---

  private async acquireLock(): Promise<void> {
    if (this.activeCalls >= this.config.maxConcurrency) {
      await new Promise<void>((resolve) => this.callQueue.push(resolve));
    }
    this.activeCalls++;
  }

  private releaseLock(): void {
    this.activeCalls--;
    const next = this.callQueue.shift();
    if (next) next();
  }

  private async callLLM(prompt: string, maxTokens: number): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: this.config.temperature,
    });

    return completion.choices[0]?.message?.content ?? "";
  }

  private buildDecisionPrompt(ctx: DecisionContext): string {
    const { agent, nearbyAgents, nearbyItems, worldState, recentMemories, innerVoice } = ctx;

    const memoryText = recentMemories
      .slice(-5)
      .map((m) => `- ${m.text}`)
      .join("\n");

    const nearbyAgentText = nearbyAgents
      .map((a) => 
        `${a.agent.name} (HP: ${a.agent.hp}/${a.agent.maxHp}, dist: ${a.distance})`
      )
      .join(", ");

    const nearbyItemText = nearbyItems.map((i) => i.type).join(", ");

    const allyNames = nearbyAgents
      .filter((a) => agent.alliances.includes(a.agent.id))
      .map((a) => a.agent.name)
      .join(", ");

    const enemyNames = nearbyAgents
      .filter((a) => agent.enemies.includes(a.agent.id))
      .map((a) => a.agent.name)
      .join(", ");

    return `You are ${agent.name}, a ${agent.personality} fighter in a battle royale.

YOUR STATUS:
- HP: ${agent.hp}/${agent.maxHp}
- Weapon: ${agent.weapon}
- Kills: ${agent.killCount}
- Position: (${agent.x}, ${agent.y})

NEARBY AGENTS: ${nearbyAgentText || "none"}
ALLIES: ${allyNames || "none"}
ENEMIES: ${enemyNames || "none"}
NEARBY ITEMS: ${nearbyItemText || "none"}

RECENT MEMORIES:
${memoryText}

${innerVoice ? `INNER VOICE (player suggestion): "${innerVoice}"\n` : ""}
WORLD INFO:
- Alive: ${worldState.aliveCount}
- Border: ${worldState.shrinkBorder}

Choose ONE action:
- attack [target_name]: Attack a nearby agent
- ally [target_name]: Form alliance with a neutral agent
- betray [target_name]: Betray an ally
- loot [item_type]: Pick up nearby item
- flee: Run from danger
- explore: Move randomly to find opportunities
- rest: Stay and recover

Respond in this format:
ACTION: [action]
REASON: [brief reason]

Examples:
ACTION: attack Kael
REASON: Kael is wounded and an easy target for my aggressive nature

ACTION: ally Lyra
REASON: Need allies to survive, Lyra is nearby and neutral

ACTION: flee
REASON: Low HP and outnumbered, must retreat to safety

ACTION: loot sword
REASON: Better weapon will increase my combat effectiveness`;
  }

  private buildReflectionPrompt(ctx: ReflectionContext): string {
    const { agent, recentMemories } = ctx;

    const memoryText = recentMemories
      .map((m) => `- ${m.text}`)
      .join("\n");

    return `You are ${agent.name}, a ${agent.personality} fighter.

Recent experiences:
${memoryText}

Given these experiences, what is ONE key insight or strategy you've learned? Keep it brief (1-2 sentences).

Examples:
- "I've been in many fights recently. I need to be more strategic and pick battles I can win."
- "Alliances have kept me alive. I should maintain my relationships and avoid betraying allies."
- "My HP is low after multiple combats. Avoiding fights and finding items is my priority now."`;
  }

  private parseDecision(response: string, ctx: DecisionContext): Decision {
    const lines = response.trim().split("\n");
    let actionLine = "";
    let reasonLine = "";

    for (const line of lines) {
      if (line.toUpperCase().startsWith("ACTION:")) {
        actionLine = line.substring(7).trim();
      } else if (line.toUpperCase().startsWith("REASON:")) {
        reasonLine = line.substring(7).trim();
      }
    }

    const actionLower = actionLine.toLowerCase();
    const reason = reasonLine || "LLM decision";

    // Parse attack action
    if (actionLower.startsWith("attack")) {
      const targetName = this.extractTargetName(actionLine);
      const target = ctx.nearbyAgents.find(
        (a) => a.agent.name.toLowerCase() === targetName.toLowerCase()
      );
      if (target) {
        return { type: DecisionType.Attack, targetId: target.agent.id, reason };
      }
    }

    // Parse ally action
    if (actionLower.startsWith("ally")) {
      const targetName = this.extractTargetName(actionLine);
      const target = ctx.nearbyAgents.find((a) => a.agent.name.toLowerCase() === targetName.toLowerCase());
      if (target) {
        return { type: DecisionType.Ally, targetId: target.agent.id, reason };
      }
    }

    // Parse betray action
    if (actionLower.startsWith("betray")) {
      const targetName = this.extractTargetName(actionLine);
      const target = ctx.nearbyAgents.find((a) => a.agent.name.toLowerCase() === targetName.toLowerCase());
      if (target) {
        return { type: DecisionType.Betray, targetId: target.agent.id, reason };
      }
    }

    // Parse loot action
    if (actionLower.startsWith("loot") && ctx.nearbyItems.length > 0) {
      const itemType = this.extractTargetName(actionLine);
      const item = ctx.nearbyItems.find((i) => i.type.toLowerCase().includes(itemType.toLowerCase()));
      if (item) {
        return { type: DecisionType.Loot, targetId: item.id, reason };
      }
      return { type: DecisionType.Loot, targetId: ctx.nearbyItems[0].id, reason };
    }

    // Parse flee action
    if (actionLower.includes("flee") || actionLower.includes("run")) {
      return { type: DecisionType.Flee, reason };
    }

    // Parse rest action
    if (actionLower.includes("rest") || actionLower.includes("recover")) {
      return { type: DecisionType.Rest, reason };
    }

    // Default to explore
    return { type: DecisionType.Explore, reason: reason || "Exploring" };
  }

  private extractTargetName(actionLine: string): string {
    const match = actionLine.match(/\[([^\]]+)\]/);
    if (match) return match[1];

    const words = actionLine.split(" ");
    return words.slice(1).join(" ").trim();
  }
}
