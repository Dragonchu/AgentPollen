"use client";

import { useEffect, useRef } from "react";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let destroyed = false;

    // Dynamic import to avoid SSR issues – Phaser accesses browser globals at load time.
    Promise.all([
      import("phaser"),
      import("./scenes/GameScene"),
    ]).then(([Phaser, { GameScene, CANVAS_SIZE }]) => {
      if (destroyed || !containerRef.current) return;

      const scene = new GameScene();

      const game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        parent: containerRef.current,
        backgroundColor: "#0a0a14",
        scene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
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
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-square rounded-lg cursor-pointer border border-border overflow-hidden max-w-[480px]"
    />
  );
}
