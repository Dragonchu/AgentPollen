import * as Phaser from "phaser";
import type { AgentFullState } from "@battle-royale/shared";
import { THEME } from "../theme";

/** Deterministic HSL colour for an agent based on their ID. */
function agentHexColor(agentId: number): number {
  const hue = (agentId * 137) % 360;
  return Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6).color;
}

/**
 * Build a single agent row for the sidebar list.
 * Returns a rexUI Sizer that can be added to a parent Sizer.
 *
 * @param onSelect   Called on single click (select agent)
 * @param onFollow   Called on double click (camera follow)
 */
export function buildAgentRow(
  scene: Phaser.Scene,
  rexUI: NonNullable<Phaser.Scene["rexUI"]>,
  agent: AgentFullState,
  isSelected: boolean,
  onSelect: () => void,
  onFollow: () => void,
): RexUI.Sizer {
  const bg = rexUI.add.roundRectangle(
    0, 0, 0, 36,
    4,
    isSelected ? THEME.colors.secondary : THEME.colors.card,
    isSelected ? 1 : 0.7,
  ) as Phaser.GameObjects.GameObject & { setInteractive(config?: object): typeof bg; on(event: string, cb: () => void): typeof bg };

  const dot = scene.add.circle(0, 0, 5, agentHexColor(agent.id));

  const nameText = scene.add.text(0, 0, `${agent.alive ? "●" : "○"} ${agent.name}`, {
    fontSize: THEME.font.body,
    color: agent.alive ? THEME.css.foreground : THEME.css.mutedForeground,
    fontFamily: "monospace",
  });

  const statsText = scene.add.text(
    0, 0,
    `${agent.killCount}💀 ${Math.round(agent.hp)}hp`,
    { fontSize: THEME.font.small, color: THEME.css.mutedForeground, fontFamily: "monospace" },
  );

  // Double-click detection
  let lastClick = 0;
  bg.setInteractive({ cursor: "pointer" }).on("pointerdown", () => {
    const now = Date.now();
    if (now - lastClick < 300) {
      onFollow();
    } else {
      onSelect();
    }
    lastClick = now;
  });

  return rexUI.add
    .sizer({ height: 36, orientation: "horizontal", background: bg, space: { left: 8, right: 8, item: 6 } })
    .add(dot, { proportion: 0, align: "center" })
    .add(nameText, { proportion: 1, align: "center" })
    .add(statsText, { proportion: 0, align: "center" });
}
