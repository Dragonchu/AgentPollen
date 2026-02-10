import {
  DecisionEngine,
  DecisionContext,
  ReflectionContext,
  Decision,
  DecisionType,
  MemoryType,
} from "@battle-royale/shared";

/**
 * Rule-based decision engine for MVP.
 * Implements the DecisionEngine interface with simple heuristics.
 *
 * To upgrade to LLM:
 * 1. Create a new class implementing DecisionEngine
 * 2. In `decide()`, format the context as a prompt and call Claude/GPT
 * 3. Parse the LLM response into a Decision
 * 4. Register the new engine in World constructor
 */
export class RuleBasedEngine implements DecisionEngine {
  readonly name = "rule-based";

  async decide(ctx: DecisionContext): Promise<Decision> {
    const { agent, nearbyAgents, nearbyItems, innerVoice } = ctx;

    // Priority 1: Inner voice (player votes) override
    if (innerVoice) {
      const decision = this.parseInnerVoice(innerVoice, ctx);
      if (decision) return decision;
    }

    // Priority 2: Loot nearby items
    if (nearbyItems.length > 0) {
      return {
        type: DecisionType.Loot,
        targetId: nearbyItems[0].id,
        reason: `Picking up ${nearbyItems[0].type}`,
      };
    }

    // Priority 3: Low HP → flee
    if (agent.hp < agent.maxHp * 0.3 && nearbyAgents.length > 0) {
      return {
        type: DecisionType.Flee,
        reason: "HP critically low, fleeing",
      };
    }

    // Priority 4: Personality-driven behavior
    return this.personalityDecision(ctx);
  }

  private personalityDecision(ctx: DecisionContext): Decision {
    const { agent, nearbyAgents } = ctx;
    const enemies = nearbyAgents.filter((a) => agent.enemies.includes(a.agent.id));
    const allies = nearbyAgents.filter((a) => agent.alliances.includes(a.agent.id));
    const neutrals = nearbyAgents.filter(
      (a) => !agent.enemies.includes(a.agent.id) && !agent.alliances.includes(a.agent.id),
    );

    switch (agent.personality) {
      case "aggressive":
      case "brave":
      case "impulsive": {
        // Attack weakest non-ally
        const targets = nearbyAgents.filter((a) => !agent.alliances.includes(a.agent.id));
        if (targets.length > 0) {
          const weakest = targets.sort((a, b) => a.agent.hp - b.agent.hp)[0];
          return { type: DecisionType.Attack, targetId: weakest.agent.id, reason: `Attacking ${weakest.agent.name} (weakest nearby)` };
        }
        break;
      }

      case "cautious":
      case "strategic":
      case "loyal": {
        // If outnumbered, seek alliance
        if (neutrals.length > 0 && enemies.length > allies.length) {
          return { type: DecisionType.Ally, targetId: neutrals[0].agent.id, reason: `Seeking alliance with ${neutrals[0].agent.name}` };
        }
        // If strong enough, attack enemies
        if (enemies.length > 0 && allies.length >= enemies.length) {
          return { type: DecisionType.Attack, targetId: enemies[0].agent.id, reason: `Attacking enemy ${enemies[0].agent.name}` };
        }
        break;
      }

      case "treacherous":
      case "cunning": {
        // Betray weak allies
        if (allies.length > 0 && Math.random() < 0.2) {
          const weakAlly = allies.sort((a, b) => a.agent.hp - b.agent.hp)[0];
          if (weakAlly.agent.hp < 40) {
            return { type: DecisionType.Betray, targetId: weakAlly.agent.id, reason: `Betraying weakened ally ${weakAlly.agent.name}` };
          }
        }
        // Otherwise attack
        if (neutrals.length > 0) {
          return { type: DecisionType.Attack, targetId: neutrals[0].agent.id, reason: `Ambushing ${neutrals[0].agent.name}` };
        }
        break;
      }

      case "resourceful": {
        // Prefer alliances, avoid fights
        if (neutrals.length > 0 && allies.length < 2) {
          return { type: DecisionType.Ally, targetId: neutrals[0].agent.id, reason: `Building alliance network` };
        }
        break;
      }
    }

    return { type: DecisionType.Explore, reason: "No threats or opportunities, exploring" };
  }

  private parseInnerVoice(voice: string, ctx: DecisionContext): Decision | null {
    const lower = voice.toLowerCase();
    const { nearbyAgents } = ctx;

    if ((lower.includes("attack") || lower.includes("fight")) && nearbyAgents.length > 0) {
      // Try to find named target
      const named = nearbyAgents.find((a) => lower.includes(a.agent.name.toLowerCase()));
      const target = named ?? nearbyAgents[0];
      return { type: DecisionType.Attack, targetId: target.agent.id, reason: `Inner voice: ${voice}` };
    }

    if (lower.includes("flee") || lower.includes("run") || lower.includes("hide")) {
      return { type: DecisionType.Flee, reason: `Inner voice: ${voice}` };
    }

    if ((lower.includes("ally") || lower.includes("alliance") || lower.includes("friend")) && nearbyAgents.length > 0) {
      const target = nearbyAgents.find((a) => !ctx.agent.enemies.includes(a.agent.id));
      if (target) {
        return { type: DecisionType.Ally, targetId: target.agent.id, reason: `Inner voice: ${voice}` };
      }
    }

    return null;
  }

  async reflect(ctx: ReflectionContext): Promise<string | null> {
    const { agent, recentMemories } = ctx;

    // Simple reflection: summarize patterns
    const combatCount = recentMemories.filter((m) => m.text.includes("damage") || m.text.includes("attack")).length;
    const allianceCount = recentMemories.filter((m) => m.text.includes("alliance")).length;

    if (combatCount >= 3) {
      return `I've been in many fights. I should ${agent.personality === "aggressive" ? "keep pressing my advantage" : "be more careful"}.`;
    }
    if (allianceCount >= 2) {
      return "Alliances have been key to my survival. I should maintain my relationships.";
    }
    if (agent.hp < agent.maxHp * 0.4) {
      return `I'm wounded (${agent.hp}/${agent.maxHp}). Survival is the priority right now.`;
    }

    return null;
  }
}
