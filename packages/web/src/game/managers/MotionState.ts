import * as Phaser from "phaser";
import type { AgentFullState, Waypoint } from "@battle-royale/shared";
import { ASSETS } from "@/constants/Assets";
import type { AgentDisplayState } from "../scenes/types";

/** 单步移动耗时（每格 1 秒） */
const BASE_INTERPOLATION_DURATION_MS = 1000;

/**
 * MotionState manages agent motion states and interpolation.
 * Domain/State layer - manages motion state with smooth interpolation.
 * Extends Phaser.Events.EventEmitter to emit motion update events.
 *
 * Events:
 * - 'motion:updated': Emitted when server data updates motion targets
 * - 'motion:frame-updated': Emitted each frame when interpolation progresses
 */
export class MotionState extends Phaser.Events.EventEmitter {
  private displayStates = new Map<number, AgentDisplayState>();

  constructor() {
    super();
  }

  /** 根据曼哈顿距离计算本段移动耗时（每格 1000ms） */
  private getMovementDuration(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): number {
    const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);
    return Math.max(1, distance) * BASE_INTERPOLATION_DURATION_MS;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 从服务器数据同步代理的显示目标与路径
   * 新代理初始化显示状态，已有代理在目标/路径变化时重置插值
   */
  updateFromServer(
    agents: Map<number, AgentFullState>,
    agentPaths: Record<number, Waypoint[]>
  ): void {
    const defaultFacing = ASSETS.IMAGES.WARRIOR_RUN.DEFAULT_DIRECTION;

    for (const [id, agent] of agents) {
      const displayState = this.displayStates.get(id);
      const path = agentPaths[id] ?? [];

      if (!displayState) {
        const firstWaypoint = path.length > 0 ? path[0] : { x: agent.x, y: agent.y };
        this.displayStates.set(id, {
          displayX: agent.x,
          displayY: agent.y,
          targetX: firstWaypoint.x,
          targetY: firstWaypoint.y,
          prevX: agent.x,
          prevY: agent.y,
          progress: path.length > 0 ? 0 : 1,
          path,
          pathIndex: 0,
          facing: defaultFacing,
        });
      } else {
        const agentFinalX = path.length > 0 ? path[path.length - 1].x : agent.x;
        const agentFinalY = path.length > 0 ? path[path.length - 1].y : agent.y;
        const displayFinalX =
          displayState.path.length > 0
            ? displayState.path[displayState.path.length - 1].x
            : displayState.targetX;
        const displayFinalY =
          displayState.path.length > 0
            ? displayState.path[displayState.path.length - 1].y
            : displayState.targetY;

        if (
          agentFinalX !== displayFinalX ||
          agentFinalY !== displayFinalY ||
          path.length !== displayState.path.length
        ) {
          displayState.prevX = displayState.displayX;
          displayState.prevY = displayState.displayY;
          displayState.path = path;
          displayState.pathIndex = 0;
          if (path.length > 0) {
            displayState.targetX = path[0].x;
            displayState.targetY = path[0].y;
          } else {
            displayState.targetX = agent.x;
            displayState.targetY = agent.y;
          }
          displayState.progress = 0;
        }
      }
    }

    for (const id of this.displayStates.keys()) {
      if (!agents.has(id)) {
        this.displayStates.delete(id);
      }
    }

    // Emit event when motion targets are updated
    this.emit('motion:updated', this.displayStates);
  }

  /**
   * 推进一帧的插值进度，更新每个代理的 displayX/displayY
   */
  tick(delta: number, agents: Map<number, AgentFullState>): void {
    let hasChanged = false;

    for (const [id, displayState] of this.displayStates) {
      const agent = agents.get(id);
      if (!agent?.alive) continue;

      const interpolationDuration = this.getMovementDuration(
        displayState.prevX,
        displayState.prevY,
        displayState.targetX,
        displayState.targetY
      );

      if (displayState.progress < 1) {
        const progressStep = delta / interpolationDuration;
        displayState.progress = Math.min(1, displayState.progress + progressStep);

        const dx = displayState.targetX - displayState.prevX;
        const dy = displayState.targetY - displayState.prevY;
        const totalSteps = (dx !== 0 ? 1 : 0) + (dy !== 0 ? 1 : 0);

        if (totalSteps === 0) {
          displayState.displayX = displayState.prevX;
          displayState.displayY = displayState.prevY;
        } else if (totalSteps === 1) {
          const t = this.easeOutCubic(displayState.progress);
          if (dx !== 0) {
            displayState.displayX = displayState.prevX + dx * t;
            displayState.displayY = displayState.prevY;
          } else {
            displayState.displayX = displayState.prevX;
            displayState.displayY = displayState.prevY + dy * t;
          }
        } else {
          const halfProgress = 0.5;
          if (displayState.progress < halfProgress) {
            const xT = this.easeOutCubic(displayState.progress / halfProgress);
            displayState.displayX = displayState.prevX + dx * xT;
            displayState.displayY = displayState.prevY;
          } else {
            const yT = this.easeOutCubic(
              (displayState.progress - halfProgress) / (1 - halfProgress)
            );
            displayState.displayX = displayState.targetX;
            displayState.displayY = displayState.prevY + dy * yT;
          }
        }

        hasChanged = true;
      } else {
        if (displayState.path?.length > 0) {
          displayState.pathIndex++;
          if (displayState.pathIndex < displayState.path.length) {
            const nextWaypoint = displayState.path[displayState.pathIndex];
            displayState.prevX = displayState.displayX;
            displayState.prevY = displayState.displayY;
            displayState.targetX = nextWaypoint.x;
            displayState.targetY = nextWaypoint.y;
            displayState.progress = 0;
            hasChanged = true;
          } else {
            displayState.displayX = displayState.targetX;
            displayState.displayY = displayState.targetY;
          }
        } else {
          displayState.displayX = displayState.targetX;
          displayState.displayY = displayState.targetY;
        }
      }
    }

    // Emit event only when there are changes (performance optimization)
    if (hasChanged) {
      this.emit('motion:frame-updated', this.displayStates);
    }
  }

  /**
   * Clean up all event listeners
   */
  destroy(): void {
    this.removeAllListeners();
    this.displayStates.clear();
  }
}
