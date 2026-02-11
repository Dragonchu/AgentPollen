"use client";

import type { GameEvent } from "@battle-royale/shared";

interface EventFeedProps {
  events: GameEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  kill: "\u{1F480}",
  betrayal: "\u{1F5E1}\uFE0F",
  alliance: "\u{1F91D}",
  combat: "\u2694\uFE0F",
  loot: "\u{1F4E6}",
  zone_shrink: "\u{1F534}",
  vote: "\u{1F5E3}\uFE0F",
  game_over: "\u{1F3C6}",
  agent_spawn: "\u2726",
};

export function EventFeed({ events }: EventFeedProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 2,
      maxHeight: 260,
      overflowY: "auto",
    }}>
      {events.length === 0 && (
        <div style={{
          fontSize: 12,
          color: "#555566",
          fontStyle: "italic",
          padding: "20px 12px",
          textAlign: "center",
        }}>
          Waiting for action...
        </div>
      )}
      {events.map((event, i) => {
        const icon = EVENT_ICONS[event.type] ?? "\u00B7";
        return (
          <div
            key={`${event.tick}-${i}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 4,
              background: i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "background 0.2s",
            }}
          >
            <span style={{
              fontSize: 12,
              flexShrink: 0,
              width: 18,
              textAlign: "center",
            }}>
              {icon}
            </span>
            <span style={{
              flex: 1,
              color: "#c8c8d0",
              lineHeight: 1.4,
            }}>
              {event.message}
            </span>
            <span style={{
              fontSize: 10,
              color: "#555566",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              marginTop: 1,
            }}>
              t{event.tick}
            </span>
          </div>
        );
      })}
    </div>
  );
}
