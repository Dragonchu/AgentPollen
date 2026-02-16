"use client";

import { useEffect, useRef, useState } from "react";
import {PreloadScene} from "@/game/scenes/PreloadScene";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  const [mounted, setMounted] = useState(false);

  // Initialize dimensions after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Calculate game dimensions based on window size
    const updateDimensions = () => {
      if (!containerRef.current || typeof window === "undefined") return;

      // Get available space (with some padding)
      const width = window.innerWidth - 32;
      const height = window.innerHeight - 32;

      // Use the smaller dimension to maintain game aspect
      const size = Math.min(width, height);
      setDimensions({
        width: size,
        height: size,
      });
    };

    // Set initial dimensions
    updateDimensions();

    // Update on window resize
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [mounted]);

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
        width: dimensions.width,
        height: dimensions.height,
        parent: containerRef.current,
        backgroundColor: "#0a0a14",
        scene: [PreloadScene, GameScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          expandParent: true,
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
    };
  }, [dimensions]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-background overflow-hidden"
    />
  );
}
