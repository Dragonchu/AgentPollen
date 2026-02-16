"use client";

import { useEffect, useRef } from "react";
import { PreloadScene } from "@/game/scenes/PreloadScene";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let destroyed = false;

    // Dynamic import to avoid SSR issues – Phaser accesses browser globals at load time.
    Promise.all([
      import("phaser"),
      import("./scenes/GameScene"),
    ]).then(([Phaser, { GameScene }]) => {
      if (destroyed || !containerRef.current) return;

      // Destroy old game if exists
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: containerRef.current,
        backgroundColor: "#0a0a14",
        scene: [PreloadScene, GameScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.NO_CENTER,
          expandParent: false,
        },
        render: { antialias: true },
        audio: { noAudio: true },
        banner: false,
        dom: { createContainer: true },
      });
      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-background overflow-hidden"
    />
  );
}
