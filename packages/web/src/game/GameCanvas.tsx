"use client";

import { useEffect, useRef } from "react";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    let destroyed = false;

    // Dynamic import to avoid SSR issues – Phaser accesses browser globals at load time.
    // RexUI plugin expects Phaser on window, so we must set it before loading the plugin.
    Promise.all([
      import("phaser"),
      import("./scenes/GameScene"),
    ]).then(([PhaserModule, { GameScene }]) => {
      const Phaser = (PhaserModule as { default?: typeof import("phaser") }).default ?? PhaserModule;
      (window as unknown as { Phaser?: typeof import("phaser") }).Phaser = Phaser;

      return import("phaser3-rex-plugins/templates/ui/ui-plugin.js").then((RexUIPluginModule) => ({
        Phaser,
        GameScene,
        RexUIPluginModule,
      }));
    }).then(({ Phaser, GameScene, RexUIPluginModule }) => {
      if (destroyed || !containerRef.current) return;

      // Destroy old game if exists
      const prevGame = gameRef.current as { destroy?: (flag?: boolean) => void } | null;
      if (prevGame?.destroy) {
        prevGame.destroy(true);
      }

      const mod = RexUIPluginModule as { default?: unknown };
      const RexUIPlugin = mod.default ?? RexUIPluginModule;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: containerRef.current,
        backgroundColor: "#0a0a14",
        scene: GameScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.NO_CENTER,
          expandParent: false,
        },
        render: { antialias: true },
        audio: { noAudio: true },
        banner: false,
        dom: { createContainer: true },
        plugins: {
          scene: [
            {
              key: "rexUI",
              plugin: RexUIPlugin,
              mapping: "rexUI",
            },
          ],
        },
      });
      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      const game = gameRef.current as { destroy?: (flag?: boolean) => void } | null;
      if (game?.destroy) {
        game.destroy(true);
      }
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-background overflow-hidden"
    />
  );
}
