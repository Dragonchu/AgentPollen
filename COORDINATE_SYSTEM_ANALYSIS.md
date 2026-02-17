# 坐标系统分析与改进方案

## 🔍 当前坐标系统梳理

### 1. Grid 坐标（逻辑坐标）
- **定义**：游戏逻辑使用的网格坐标
- **来源**：后端服务器（AgentFullState, Waypoint）
- **范围**：`[0, gridSize-1]`（如 100×100 地图则为 `[0, 99]`）
- **单位**：格子（cell）
- **例子**：`agent.x = 10, agent.y = 15` 表示第 10 列，第 15 行

**使用位置：**
- `AgentFullState.x, AgentFullState.y`
- `Waypoint.x, Waypoint.y`
- `AgentDisplayState.displayX, displayY, targetX, targetY`

### 2. World 坐标（世界像素坐标）
- **定义**：Phaser 世界空间的像素坐标
- **范围**：`[0, worldWidth]` × `[0, worldHeight]`
  - 例如 100×100 地图，CELL_SIZE=64：`[0, 6400]` × `[0, 6400]`
- **单位**：像素（px）
- **转换公式**：
  ```typescript
  worldX = gridX * CELL_SIZE + CELL_SIZE / 2  // 格子中心
  worldY = gridY * CELL_SIZE + CELL_SIZE / 2
  ```

**使用位置：**
- Sprite 位置：`sprite.setPosition(worldX, worldY)`
- 相机滚动：`camera.scrollX, camera.scrollY`
- 世界边界：`camera.setBounds(0, 0, worldWidth, worldHeight)`

### 3. Screen 坐标（屏幕坐标）
- **定义**：浏览器窗口的像素坐标
- **范围**：`[0, window.innerWidth]` × `[0, window.innerHeight]`
- **单位**：像素（px）
- **转换公式**：
  ```typescript
  screenX = (worldX - camera.scrollX) * camera.zoom
  screenY = (worldY - camera.scrollY) * camera.zoom
  ```

**使用位置：**
- 鼠标点击：`pointer.x, pointer.y`
- UI 元素：固定在屏幕位置

---

## 🐛 发现的问题

### 问题 1：Sprite Origin 未显式设置
**位置**：`GameScene.ts:311`
```typescript
sprite = this.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
// ❌ 没有设置 origin，依赖默认值 (0.5, 0.5)
```

**影响**：虽然默认值通常是 (0.5, 0.5)，但不显式设置会导致：
- 代码意图不明确
- 如果 Phaser 版本变化可能导致不一致

**修复**：
```typescript
sprite = this.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
sprite.setOrigin(0.5, 0.5); // ✅ 显式设置中心对齐
```

### 问题 2：坐标转换分散各处
**问题**：Grid → World 转换散落在多个文件中：
- `GameScene.ts:345`：`px = displayState.displayX * CELL_SIZE + CELL_SIZE / 2`
- `GameScene.ts:268`：`targetX = displayState.displayX * CELL_SIZE + CELL_SIZE / 2`
- `CameraManager.ts`：跟随逻辑中的转换

**风险**：
- 公式重复，容易出错
- 修改 CELL_SIZE 或转换逻辑需要改多处
- 没有集中的类型检查

### 问题 3：变量命名不清晰
**问题**：无法从变量名区分坐标类型
```typescript
const position = this.getAgentPosition(agentId);  // 返回什么坐标？Grid 还是 World？
const targetX = ...;  // Grid X 还是 World X？
```

### 问题 4：PiP 相机跟随使用了错误的坐标
**位置**：`GameScene.ts:268`
```typescript
const targetX = displayState
  ? displayState.displayX * CELL_SIZE + CELL_SIZE / 2
  : selectedAgent.x * CELL_SIZE + CELL_SIZE / 2;
```

这里转换了两次（一次在 callback，一次在使用处），可能导致误差。

---

## ✅ 业界最佳实践

### 1. 明确的坐标类型系统
```typescript
// types/coordinates.ts
export type GridCoord = {
  readonly gridX: number;
  readonly gridY: number;
};

export type WorldCoord = {
  readonly worldX: number;
  readonly worldY: number;
};

export type ScreenCoord = {
  readonly screenX: number;
  readonly screenY: number;
};
```

### 2. 集中的坐标转换工具
```typescript
// utils/CoordinateUtils.ts
export class CoordinateUtils {
  /**
   * Convert grid coordinates to world coordinates (center of cell)
   */
  static gridToWorld(grid: GridCoord, cellSize: number): WorldCoord {
    return {
      worldX: grid.gridX * cellSize + cellSize / 2,
      worldY: grid.gridY * cellSize + cellSize / 2,
    };
  }

  /**
   * Convert world coordinates to grid coordinates (floor)
   */
  static worldToGrid(world: WorldCoord, cellSize: number): GridCoord {
    return {
      gridX: Math.floor(world.worldX / cellSize),
      gridY: Math.floor(world.worldY / cellSize),
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  static worldToScreen(
    world: WorldCoord,
    camera: Phaser.Cameras.Scene2D.Camera
  ): ScreenCoord {
    return {
      screenX: (world.worldX - camera.scrollX) * camera.zoom,
      screenY: (world.worldY - camera.scrollY) * camera.zoom,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  static screenToWorld(
    screen: ScreenCoord,
    camera: Phaser.Cameras.Scene2D.Camera
  ): WorldCoord {
    return {
      worldX: camera.scrollX + screen.screenX / camera.zoom,
      worldY: camera.scrollY + screen.screenY / camera.zoom,
    };
  }
}
```

### 3. 命名约定
```typescript
// ✅ 好的命名
const gridPos: GridCoord = { gridX: 10, gridY: 15 };
const worldPos: WorldCoord = CoordinateUtils.gridToWorld(gridPos, CELL_SIZE);

// ❌ 不好的命名
const position = { x: 10, y: 15 };  // 什么坐标？
const targetX = ...;  // Grid 还是 World？
```

### 4. Origin/Anchor 管理
```typescript
// 创建 sprite 时始终显式设置 origin
const sprite = this.add.sprite(worldX, worldY, 'texture');
sprite.setOrigin(0.5, 0.5);  // 中心对齐（明确！）

// 或者统一管理
class SpriteFactory {
  static createAgent(scene, worldPos): Phaser.GameObjects.Sprite {
    const sprite = scene.add.sprite(worldPos.worldX, worldPos.worldY, 'agent');
    sprite.setOrigin(0.5, 0.5);  // 统一设置
    return sprite;
  }
}
```

### 5. 文档注释
```typescript
/**
 * Get agent position in grid coordinates
 * @param agentId - Agent ID
 * @returns Grid coordinates, or null if agent not found
 */
getAgentGridPosition(agentId: number): GridCoord | null {
  // ...
}

/**
 * Move camera to focus on world position
 * @param worldPos - World coordinates to focus on
 */
focusOnWorldPosition(worldPos: WorldCoord): void {
  // ...
}
```

---

## 🔧 建议的改进步骤

### 阶段 1：快速修复（立即）
1. ✅ 显式设置 sprite origin
2. ✅ 修复 PiP 相机跟随的坐标转换
3. ✅ 统一命名约定（添加注释）

### 阶段 2：重构坐标系统（可选）
1. 创建 CoordinateUtils 工具类
2. 创建坐标类型定义
3. 逐步迁移现有代码使用新 API

### 阶段 3：长期优化
1. 使用 TypeScript 严格类型检查
2. 单元测试坐标转换逻辑
3. 性能优化（缓存转换结果）

---

## 📚 参考案例

### Unity
```csharp
// 明确的坐标类型
Vector2 worldPos = new Vector2(10, 15);
Vector2 screenPos = Camera.main.WorldToScreenPoint(worldPos);
```

### Godot
```gdscript
# 集中的坐标转换
var world_pos = Vector2(10, 15)
var screen_pos = get_viewport().get_camera().get_screen_center()
```

### Phaser 官方推荐
- 使用 `setOrigin()` 明确锚点
- 使用 `Camera.worldView` 检查世界边界
- 使用工具函数封装坐标转换

---

## 🎯 总结

**核心问题**：
1. ❌ 缺少显式的坐标类型系统
2. ❌ 坐标转换逻辑分散
3. ❌ 变量命名不清晰
4. ❌ Origin 未显式设置

**解决方案**：
1. ✅ 创建类型化的坐标系统
2. ✅ 集中坐标转换工具
3. ✅ 统一命名约定
4. ✅ 显式设置 sprite origin
