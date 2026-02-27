/**
 * 游戏场景相关常量
 * 格子大小与 GenerativeAgentsCN tilemap 的 tile size 对齐（32px）
 */

// 格子大小：与 Tiled tilemap 的 tile size 一致（32px）
export const CELL_SIZE = 32;

// 注意：网格大小（gridSize）不再硬编码，而是从后端 tilemap 动态获取
// - Village tilemap 是 140×100 tiles (4480×3200 px)
// 前端通过 GameState.getGridSize() 获取实际值
