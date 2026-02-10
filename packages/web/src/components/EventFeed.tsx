"use client";

import type { GameEvent, GameEventType } from "@battle-royale/shared";

interface EventFeedProps {
  events: GameEvent[];
}

const EVENT_COLORS: Record<string, string> = {
  kill: "#ff4444",
  betrayal: "#ff6622",
  alliance: "#4488ff",
  combat: "#ffaa22",
  loot: "#44cc44",
  zone_shrink: "#aa44ff",
  vote: "#ffaa22",
  game_over: "#ffcc00",
  agent_spawn: "#666",
};

const EVENT_ICONS: Record<string, string> = {
  kill: "💀",
  betrayal: "🗡️",
  alliance: "🤝",
  combat: "⚔️",
  loot: "📦",
  zone_shrink: "🔴",
  vote: "🗣️",
  game_over: "🏆",
  agent_spawn: "✦",
};

export function EventFeed({ events }: EventFeedProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      maxHeight: 300,
      overflowY: "auto",
    }}>
      {events.length === 0 && (
        <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", padding: 8 }}>
          Waiting for action...
        </div>
      )}
      {events.map((event, i) => (
        <div
          key={`${event.tick}-${i}`}
          style={{
            padding: "4px 8px",
            fontSize: 12,
            color: EVENT_COLORS[event.type] ?? "#888",
            borderLeft: `2px solid ${EVENT_COLORS[event.type] ?? "#333"}`,
            background: i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            lineHeight: 1.4,
            animation: i === 0 ? "fadeIn 0.3s" : undefined,
          }}
        >
          <span style={{ marginRight: 4 }}>{EVENT_ICONS[event.type] ?? "·"}</span>
          {event.message}
          <span style={{ float: "right", fontSize: 10, color: "#333" }}>t{event.tick}</span>
        </div>
      ))}
    </div>
  );
}
