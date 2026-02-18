import * as Phaser from "phaser";
import { GameEvent, GameEventType } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { GameController } from "../managers/GameController";
import { THEME } from "./theme";

type RexScene = Phaser.Scene & {
  rexUI?: {
    add: {
      sizer: (config: object) => Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };
      scrollablePanel: (config: object) => Phaser.GameObjects.GameObject & { layout: () => void };
      roundRectangle: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject;
    };
  };
};

/**
 * EventFeedUI displays a scrollable list of recent game events.
 * Uses RexUI scrollablePanel when available.
 */
export class EventFeedUI extends BaseUI {
  private gameController: GameController;
  private scrollPanel?: Phaser.GameObjects.GameObject & { layout: () => void };
  private contentSizer?: Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };
  private eventItems: Map<number, Phaser.GameObjects.Container> = new Map();
  private lastEventCount = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    gameController: GameController,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.gameController = gameController;
  }

  create(): void {
    const scene = this.scene as RexScene;
    const panelW = this.width - 16;
    const panelH = this.height - 16;

    if (scene.rexUI?.add?.scrollablePanel) {
      const sizer = scene.rexUI.add.sizer({
        orientation: 1,
        width: panelW,
        space: { item: 4 },
      });
      this.contentSizer = sizer as Phaser.GameObjects.GameObject & { add: (child: Phaser.GameObjects.GameObject, config?: object) => void; removeAll: (destroy?: boolean) => void };

      const panel = scene.rexUI.add.scrollablePanel({
        x: 0,
        y: 0,
        width: panelW,
        height: panelH,
        panel: { child: sizer, mask: {} },
        slider: false,
        mouseWheelScroller: { focus: true, speed: 0.1 },
        background: scene.rexUI.add.roundRectangle(0, 0, panelW, panelH, THEME.spacing.radius, THEME.colors.card, 0.8),
      });
      this.scrollPanel = panel as Phaser.GameObjects.GameObject & { layout: () => void };
      this.container.add(this.scrollPanel);
    } else {
      const placeholder = this.scene.add.text(0, 0, "RexUI required", { fontSize: "12px", fontFamily: "Arial", color: THEME.css.destructive });
      this.container.add(placeholder);
    }

    this.gameController.getGameState().on("state:events:updated", this.onEventsUpdate, this);
    this.updateEvents(this.gameController.getGameState().getEvents());
  }

  private onEventsUpdate(events: GameEvent[]): void {
    this.updateEvents(events);
  }

  private updateEvents(events: GameEvent[]): void {
    if (!this.contentSizer || !this.scrollPanel) return;

    const eventCount = events.length;
    if (eventCount === this.lastEventCount && eventCount > 0) return;
    this.lastEventCount = eventCount;

    for (const item of this.eventItems.values()) item.destroy();
    this.eventItems.clear();
    this.contentSizer.removeAll(true);

    const maxEvents = Math.min(50, events.length);
    for (let i = events.length - 1; i >= Math.max(0, events.length - maxEvents); i--) {
      const ev = events[i];
      if (!ev) continue;
      const item = this.createEventItem(ev);
      this.contentSizer.add(item, { padding: { top: 4, bottom: 4 }, expand: false });
      this.eventItems.set(i, item);
    }

    this.scrollPanel.layout();
  }

  private createEventItem(event: GameEvent): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, 0);
    item.setAlpha(0);
    this.scene.tweens.add({
      targets: item,
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });
    const iconEmoji = this.getEventEmoji(event.type);
    const iconText = this.scene.add.text(0, 0, iconEmoji, {
      fontSize: "16px",
      fontFamily: "Arial",
      color: THEME.css.foreground,
    });
    iconText.setOrigin(0, 0.5);
    item.add(iconText);

    const descText = this.scene.add.text(24, 0, event.message, {
      fontSize: THEME.font.label,
      fontFamily: "Arial",
      color: THEME.css.mutedForeground,
      wordWrap: { width: 250 },
    });
    descText.setOrigin(0, 0.5);
    item.add(descText);

    return item;
  }

  private getEventEmoji(type: string): string {
    const t = type as GameEventType;
    switch (t) {
      case GameEventType.Kill: return "💀";
      case GameEventType.Alliance: return "🤝";
      case GameEventType.Betrayal: return "🔪";
      case GameEventType.Combat: return "⚔️";
      case GameEventType.Loot: return "📦";
      case GameEventType.ZoneShrink: return "🌪️";
      case GameEventType.Vote: return "🗳️";
      case GameEventType.GameOver: return "🏆";
      case GameEventType.AgentSpawn: return "🛬";
      default: return "📝";
    }
  }

  destroy(): void {
    // Unsubscribe from state events
    this.gameController.getGameState().off("state:events:updated", this.onEventsUpdate, this);
    super.destroy();
  }
}
