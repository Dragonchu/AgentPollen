"use client";

import dynamic from "next/dynamic";

// Import GameCanvas dynamically with no SSR to prevent window access during build
const GameCanvas = dynamic(
  () => import("@/game/GameCanvas").then(mod => ({ default: mod.GameCanvas })),
  { ssr: false, loading: () => <div className="w-screen h-screen bg-background" /> }
);

export default function ArenaPage() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-background">
      <GameCanvas />
    </div>
  );
}
