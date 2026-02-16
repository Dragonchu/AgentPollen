"use client";

import { GameCanvas } from "@/game/GameCanvas";

export const dynamic = "force-dynamic";

export default function ArenaPage() {
  return (
    <div className="w-full h-screen bg-background">
      <GameCanvas />
    </div>
  );
}
