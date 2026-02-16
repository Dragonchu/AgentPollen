import * as Phaser from "phaser";
import { GameEvent, GameEventType } from "@battle-royale/shared";
import { BaseUI } from "./BaseUI";
import { ScrollableContainer } from "./components/ScrollableContainer";
import { GameStateManager } from "../managers/GameStateManager";

/**
 * EventFeedUI displays a scrollable list of recent game events.
 * - Shows up to 50 events
 * - Each event has an icon emoji and description
 * - Scrollable with mouse wheel
 */
export class EventFeedUI extends BaseUI {
  private stateManager: GameStateManager;
  private scrollContainer?: ScrollableContainer;
  private eventItems: Map<number, Phaser.GameObjects.Container> = new Map();
  private lastEventCount = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    stateManager: GameStateManager,
    worldCamera?: Phaser.Cameras.Scene2D.Camera
  ) {
    super(scene, x, y, width, height, worldCamera);
    this.stateManager = stateManager;
  }

  create(): void {
    // Create scrollable container
    this.scrollContainer = new ScrollableContainer(
      this.scene,
      0,
      0,
      this.width - 16,
      this.height - 16
    );
    this.container.add(this.scrollContainer.getContainer());

    // Enable mouse wheel scrolling
    this.scrollContainer.enableScroll();

    // Subscribe to event updates
    this.stateManager.on<"state:events:updated", GameEvent[]>(
      "state:events:updated",
      (events: GameEvent[]) => {
        this.updateEvents(events);
      }
    );

    // Initial state
    const initialEvents = this.stateManager.getEvents();
    this.updateEvents(initialEvents);
  }

  private updateEvents(events: GameEvent[]): void {
    if (!this.scrollContainer) return;

    // Optimization: Only update if event count changed
    const eventCount = events.length;
    if (eventCount === this.lastEventCount && eventCount > 0) {
      return; // No new events
    }
    this.lastEventCount = eventCount;

    // Clear old items
    for (const item of this.eventItems.values()) {
      item.destroy();
    }
    this.eventItems.clear();

    // Create new event items (reverse order - newest first, max 50)
    const maxEvents = Math.min(50, events.length);
    let offsetY = 8;
    const contentHeight = maxEvents * 32 + 16;

    for (let i = events.length - 1; i >= events.length - maxEvents; i--) {
      const event = events[i];
      const item = this.createEventItem(event, offsetY);
      this.scrollContainer.getContentContainer().add(item);
      this.eventItems.set(i, item);
      offsetY += 32;
    }

    // Update content height for scrolling
    this.scrollContainer.setContentHeight(contentHeight);
  }

  private createEventItem(event: GameEvent, offsetY: number): Phaser.GameObjects.Container {
    const item = this.scene.add.container(0, offsetY);

    // Event icon emoji
    const iconEmoji = this.getEventEmoji(event.type);
    const iconText = this.scene.add.text(0, 0, iconEmoji, {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
    });
    iconText.setOrigin(0, 0.5);
    item.add(iconText);

    // Event description (use message from event)
    const descText = this.scene.add.text(24, 0, event.message, {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#cccccc",
      wordWrap: { width: 250 },
    });
    descText.setOrigin(0, 0.5);
    item.add(descText);

    // Background highlight (subtle)
    const bg = this.scene.add.rectangle(0, 0, this.width - 32, 28, 0x222222, 0);
    bg.setOrigin(0, 0.5);
    item.add(bg);

    return item;
  }

  private getEventEmoji(type: string): string {
    const eventType = type as GameEventType;

    switch (eventType) {
      case GameEventType.Kill:
        return "💀";
      case GameEventType.Alliance:
        return "🤝";
      case GameEventType.Betrayal:
        return "🔪";
      case GameEventType.Combat:
        return "⚔️";
      case GameEventType.Loot:
        return "📦";
      case GameEventType.ZoneShrink:
        return "🌪️";
      case GameEventType.Vote:
        return "🗳️";
      case GameEventType.GameOver:
        return "🏆";
      case GameEventType.AgentSpawn:
        return "🛬";
      default:
        return "📝";
    }
  }

  destroy(): void {
    if (this.scrollContainer) {
      this.scrollContainer.destroy();
    }
    super.destroy();
  }
}
