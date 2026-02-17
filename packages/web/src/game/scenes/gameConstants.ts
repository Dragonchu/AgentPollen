/**
 * 游戏场景相关常量
 * 格子大小固定，网格尺寸从后端动态获取
 */

// 格子大小：每个格子在像素中的大小（64px，固定值保证跨设备视觉一致）
export const CELL_SIZE = 64;

// 注意：网格大小（gridSize）不再硬编码，而是从后端 tilemap 动态获取
// - MVP 阶段可能是 20×20
// - 生产环境可能是 100×100
// 前端通过 GameStateManager.getGridSize() 获取实际值
