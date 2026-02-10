import {
  DecisionEngine,
  DecisionContext,
  ReflectionContext,
  Decision,
  DecisionType,
} from "@battle-royale/shared";

/**
 * LLM-based decision engine (STUB - implement for production).
 *
 * This shows the interface you need to implement when upgrading
 * from RuleBasedEngine to an LLM like Claude.
 *
 * Usage:
 *   const engine = new LLMEngine({ apiKey: "sk-..." });
 *   const world = new World(config, engine);
 *
 * Key considerations:
 * - Rate limiting: 100 agents × 1 tick/sec = 100 calls/sec (too many)
 * - Solution: Only use LLM for critical decisions, batch requests
 * - Cache similar situations
 * - Use RuleBasedEngine as fallback for routine actions
 */
export interface LLMEngineConfig {
  apiKey: string;
  model?: string;
  /** Only invoke LLM for decisions with importance above this threshold */
  importanceThreshold?: number;
  /** Max concurrent LLM calls */
  maxConcurrency?: number;
}

export class LLMEngine implements DecisionEngine {
  readonly name = "llm";
  private config: Required<LLMEngineConfig>;

  constructor(config: LLMEngineConfig) {
    this.config = {
      model: "claude-sonnet-4-20250514",
      importanceThreshold: 5,
      maxConcurrency: 10,
      ...config,
    };
  }

  async decide(ctx: DecisionContext): Promise<Decision> {
    // TODO: Implement LLM decision making
    //
    // 1. Format context as prompt:
    //    const prompt = this.buildPrompt(ctx);
    //
    // 2. Call LLM API:
    //    const response = await this.callLLM(prompt);
    //
    // 3. Parse response into Decision:
    //    return this.parseDecision(response);
    //
    // 4. Fallback to rule-based if LLM fails:
    //    return this.fallbackEngine.decide(ctx);

    throw new Error("LLMEngine not implemented. Use RuleBasedEngine for MVP.");
  }

  async reflect(ctx: ReflectionContext): Promise<string | null> {
    // TODO: Implement LLM reflection
    //
    // const prompt = `Given these memories, what high-level insight can you draw?
    //   ${ctx.recentMemories.map(m => m.text).join('\n')}`;
    //
    // return await this.callLLM(prompt);

    throw new Error("LLMEngine not implemented. Use RuleBasedEngine for MVP.");
  }

  // private async callLLM(prompt: string): Promise<string> {
  //   const response = await fetch("https://api.anthropic.com/v1/messages", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "x-api-key": this.config.apiKey,
  //       "anthropic-version": "2023-06-01",
  //     },
  //     body: JSON.stringify({
  //       model: this.config.model,
  //       max_tokens: 200,
  //       messages: [{ role: "user", content: prompt }],
  //     }),
  //   });
  //   const data = await response.json();
  //   return data.content[0].text;
  // }
}
