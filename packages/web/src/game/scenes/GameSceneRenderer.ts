import type { AgentFullState } from "@battle-royale/shared";
import type { AgentDisplayState } from "./types";

/** 绘制所需的状态（安全区、代理、选中等） */
export interface GameSceneRenderState {
  agents: Map<number, AgentFullState>;
  agentDisplayStates: Map<number, AgentDisplayState>;
  selectedAgentId: number | null;
  shrinkBorder: number;
  zoneCenterX: number;
  zoneCenterY: number;
}
