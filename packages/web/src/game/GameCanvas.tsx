"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AgentFullState, ItemState, Waypoint, TileMap } from "@battle-royale/shared";
import type { GameScene } from "./scenes/GameScene";

const CELL_SIZE = 64;
const GRID_SIZE = 20;
const CANVAS_SIZE = CELL_SIZE * GRID_SIZE;

interface GameCanvasProps {
  agents: Map<number, AgentFullState>;
  items?: ItemState[];
  selectedAgentId?: number | null;
  shrinkBorder?: number;
  onAgentClick?: (agentId: number) => void;
  agentPaths?: Record<number, Waypoint[]>;
  tileMap?: TileMap | null;
  zoneCenterX?: number;
  zoneCenterY?: number;
  isFullScreen?: boolean;
}

export function GameCanvas({
  agents,
  items = [],
  selectedAgentId,
  shrinkBorder = GRID_SIZE,
  onAgentClick,
  agentPaths = {},
  tileMap = null,
  zoneCenterX = GRID_SIZE / 2,
  zoneCenterY = GRID_SIZE / 2,
  isFullScreen = false,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const readyRef = useRef(false);

  // Keep latest values in refs so the Phaser scene can always access them
  const propsRef = useRef({ agents, items, selectedAgentId: selectedAgentId ?? null, shrinkBorder, agentPaths, tileMap, zoneCenterX, zoneCenterY });
  const onAgentClickRef = useRef(onAgentClick);
  propsRef.current = { agents, items, selectedAgentId: selectedAgentId ?? null, shrinkBorder, agentPaths, tileMap, zoneCenterX, zoneCenterY };
  onAgentClickRef.current = onAgentClick;

  /** Push current props into the Phaser scene (no-op if scene isn't ready). */
  const syncToScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !readyRef.current) return;
    const { agents, items, selectedAgentId, shrinkBorder, agentPaths, tileMap, zoneCenterX, zoneCenterY } = propsRef.current;
    scene.updateData(agents, items, selectedAgentId, shrinkBorder, agentPaths, tileMap, zoneCenterX, zoneCenterY);
  }, []);

  // --------------- Phaser lifecycle ---------------

  useEffect(() => {
    let destroyed = false;

    // Dynamic import to avoid SSR issues – Phaser accesses browser globals at load time.
    Promise.all([
      import("phaser"),
      import("./scenes/GameScene"),
    ]).then(([Phaser, { GameScene }]) => {
      if (destroyed || !containerRef.current) return;

      const scene = new GameScene();
      sceneRef.current = scene;

      // Set up callback before the scene is created
      scene.setOnReady(() => {
        if (destroyed) return;
        scene.setOnAgentClick((id) => onAgentClickRef.current?.(id));
        readyRef.current = true;
        syncToScene();
      });

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
        // Let the parent container handle pointer style
        banner: false,
      });
      gameRef.current = game;
    });

    return () => {
      destroyed = true;
      readyRef.current = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [syncToScene]);

  // --------------- sync React props → Phaser ---------------

  useEffect(() => {
    syncToScene();
  }, [agents, items, selectedAgentId, shrinkBorder, agentPaths, tileMap, syncToScene]);

  // --------------- render ---------------

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-square rounded-lg cursor-pointer border border-border overflow-hidden ${
        isFullScreen ? "" : "max-w-[480px]"
      }`}
    />
  );
}
