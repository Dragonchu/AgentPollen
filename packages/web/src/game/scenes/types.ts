import type {AgentActionState, Waypoint} from "@battle-royale/shared";
import type { SpriteDirection } from "@/constants/Assets";

/**
 * 代理显示状态
 * 用于跟踪每个代理的渲染位置，实现平滑的移动动画
 * 通过在当前位置和目标位置之间插值，使代理移动看起来流畅
 */
export interface AgentDisplayState {
  displayX: number;
  displayY: number;
  targetX: number;
  targetY: number;
  prevX: number;
  prevY: number;
  progress: number;
  currentAnimation?: AgentActionState;
  path: Waypoint[];
  pathIndex: number;
  facing: SpriteDirection;
}

export type Direction = SpriteDirection;
