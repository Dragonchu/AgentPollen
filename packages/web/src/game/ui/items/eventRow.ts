import * as Phaser from "phaser";
import { GameEventType } from "@battle-royale/shared";
import type { GameEvent } from "@battle-royale/shared";
import { THEME } from "../theme";

const EMOJI: Partial<Record<GameEventType, string>> = {
  [GameEventType.Kill]: "💀",
  [GameEventType.Alliance]: "🤝",
  [GameEventType.Betrayal]: "🔪",
  [GameEventType.Combat]: "⚔️",
  [GameEventType.Loot]: "📦",
  [GameEventType.ZoneShrink]: "🌪️",
  [GameEventType.Vote]: "🗳️",
  [GameEventType.GameOver]: "🏆",
  [GameEventType.AgentSpawn]: "🛬",
};

/**
 * Build a single event row for the event feed.
 * Returns a Phaser.GameObjects.Text that can be added to a parent Sizer.
 */
export function buildEventRow(scene: Phaser.Scene, event: GameEvent): Phaser.GameObjects.Text {
  const icon = EMOJI[event.type] ?? "📝";
  return scene.add.text(0, 0, `${icon} ${event.message}`, {
    fontSize: THEME.font.small,
    color: THEME.css.mutedForeground,
    fontFamily: "monospace",
    wordWrap: { width: 240 },
  });
}
