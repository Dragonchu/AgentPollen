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
    <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto">
      {events.length === 0 && (
        <div className="text-xs text-muted-foreground/60 italic py-5 px-3 text-center">
          Waiting for action...
        </div>
      )}
      {events.map((event, i) => {
        const icon = EVENT_ICONS[event.type] ?? "\u00B7";
        return (
          <div
            key={`${event.tick}-${i}`}
            className={`flex items-start gap-2 px-2.5 py-1.5 text-xs rounded transition-colors ${
              i === 0 ? "bg-foreground/[0.02]" : "hover:bg-foreground/[0.02]"
            }`}
          >
            <span className="text-xs shrink-0 w-[18px] text-center">
              {icon}
            </span>
            <span className="flex-1 text-foreground/80 leading-relaxed">
              {event.message}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums shrink-0 mt-px">
              t{event.tick}
            </span>
          </div>
        );
      })}
    </div>
  );
}
