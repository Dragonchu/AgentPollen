# 摄像机系统文档

## 概述

摄像机系统允许玩家在大型游戏地图上自由移动视口，并支持缩放功能。游戏世界大小为 6400x6400 像素（100x100 个格子，每个格子 64 像素），而摄像机视口大小等于浏览器窗口大小。

## 架构

### 核心组件

- **游戏世界**: 6400x6400 像素的完整地图
- **摄像机视口**: 浏览器窗口大小的可视区域
- **CameraManager**: 管理摄像机位置、缩放和输入交互

### 坐标系统

```
游戏世界坐标 (0, 0) ---- (6400, 6400)
    |
    | 摄像机
    |
显示到屏幕 (0, 0) ---- (window.width, window.height)
```

## 用户交互

### 1. 平移（Pan）摄像机

#### 鼠标拖拽
- **操作**: 左键按住并拖拽
- **效果**: 摄像机跟随鼠标移动
- **范围**: 受游戏世界边界限制

**代码示例**:
```typescript
// 这是自动处理的，无需手动调用
// onPointerDown -> onPointerMove -> onPointerUp 流程
```

#### 键盘控制
- **W / ↑**: 摄像机向上移动
- **A / ←**: 摄像机向左移动
- **S / ↓**: 摄像机向下移动
- **D / →**: 摄像机向右移动

**代码示例**:
```typescript
// 在 update() 中自动处理
// 按住任何方向键保持移动
```

### 2. 缩放（Zoom）地图

#### 鼠标滚轮（围绕鼠标位置缩放）
- **向上滚动**: 放大（zoom in）
- **向下滚动**: 缩小（zoom out）
- **范围**: 0.3x 到 3x
- **步长**: 0.1x 每次滚动
- **关键特性**: 缩放时以鼠标指向位置为中心

**行为说明**:
```
用户将鼠标移到地图上的某个位置，滚动鼠标滚轮：
- 鼠标所指向的游戏世界坐标始终保持在屏幕的相同位置
- 这样用户可以快速放大查看特定区域，而不需要先移动到中心
- 类似 Google Maps、Figma 等工具的表现
```

**缩放级别说明**:
- **0.3x**: 鸟瞰图，可以看到整个地图
- **1.0x**: 默认缩放，每个格子占 64 像素
- **3.0x**: 最大缩放，看到详细细节

**例子**:
```
场景 1: 放大特定区域
1. 将鼠标移动到敌人位置
2. 向上滚动鼠标滚轮
3. 敌人会被放大，且始终保持在鼠标指向位置

场景 2: 查看整个地图
1. 向下滚动鼠标滚轮到 0.3x
2. 可以一次看到整个地图
3. 然后拖拽鼠标或键盘移动查看不同区域
```

### 3. 重置摄像机

#### R 键
- **操作**: 按下 R 键
- **效果**: 摄像机回到中心位置，缩放重置为 1.0x

## API 参考

### CameraManager 类

#### 初始化
```typescript
const cameraManager = new CameraManager(scene);
```

#### 方法

##### `update(): void`
在每一帧调用，处理键盘平移。
```typescript
// 在 GameScene.update() 中调用
this.cameraManager.update();
```

##### `centerCamera(): void`
立即将摄像机居中到地图中心。
```typescript
cameraManager.centerCamera();
```

##### `resetCamera(): void`
重置摄像机到初始状态（中心 + 缩放 1.0x）。
```typescript
cameraManager.resetCamera();
```

##### `panToPosition(targetX: number, targetY: number, duration?: number): void`
平滑地将摄像机移动到指定位置。
```typescript
// 快速移动到代理的位置
cameraManager.panToPosition(agent.x, agent.y, 500); // 500ms

// 默认 500ms
cameraManager.panToPosition(centerX, centerY);
```

##### `setZoom(zoom: number): void`
设置摄像机缩放级别（自动限制在 0.3-3.0）。
```typescript
cameraManager.setZoom(2); // 放大 2 倍
cameraManager.setZoom(0.5); // 缩小为 0.5 倍
```

##### `getZoom(): number`
获取当前缩放级别。
```typescript
const currentZoom = cameraManager.getZoom();
```

##### `getScrollPosition(): { x: number; y: number }`
获取摄像机的当前滚动位置（世界坐标）。
```typescript
const pos = cameraManager.getScrollPosition();
console.log(`摄像机位置: (${pos.x}, ${pos.y})`);
```

##### `getViewportDimensions(): { width: number; height: number }`
获取摄像机视口在世界坐标系中的尺寸（考虑缩放）。
```typescript
const viewport = cameraManager.getViewportDimensions();
// 当 zoom=0.5 时，viewport.width > camera.displayWidth
```

##### `getWorldBounds(): { width: number; height: number }`
获取游戏世界的总大小。
```typescript
const bounds = cameraManager.getWorldBounds();
// { width: 6400, height: 6400 }
```

##### `destroy(): void`
清理所有输入监听器。
```typescript
// 在场景关闭时调用
cameraManager.destroy();
```

## 缩放级别说明

| 缩放 | 用途 | 视角 |
|------|------|------|
| 0.3x | 鸟瞰图 | 可以看到整个地图 |
| 0.5x | 总览 | 看到大约 1/4 的代理 |
| 1.0x | 标准 | 每个格子占 64 像素 |
| 1.5x | 详细 | 更好地看到代理细节 |
| 3.0x | 近距离 | 看到代理的详细信息 |

## 边界管理

摄像机有以下限制：

1. **世界边界**: 摄像机不能超出 (0, 0) 到 (6400, 6400)
2. **动态边界**: 边界随缩放级别自动调整
   - 当缩放较小时，摄像机视口可能大于世界
   - 系统自动处理，防止黑边显示

## 代理跟踪（高级用法）

跟踪特定代理的位置：

```typescript
// 在 GameScene.update() 中
if (selectedAgent) {
  const { x, y } = selectedAgent;
  cameraManager.panToPosition(x, y, 1000); // 1秒平滑过渡
}
```

## 性能考虑

- **鼠标拖拽**: 在每个 `pointermove` 事件时更新（高频率）
- **键盘平移**: 在每个 `update()` 帧更新
- **缩放**: 仅在 `wheel` 事件时更新
- **优化**: 摄像机边界计算已优化，不会造成性能问题

## 常见问题

### Q: 如何禁用摄像机平移？
A: 在 CameraManager.setupInputHandlers() 中注释掉相关的事件监听器。

### Q: 如何实现自动跟踪代理？
A: 在 GameScene.update() 中调用 `panToPosition()`。

### Q: 如何锁定缩放级别？
A: 修改 MIN_ZOOM 和 MAX_ZOOM 常数，或在 setZoom() 中添加检查。

### Q: 摄像机拖拽很慢？
A: 增加 `PAN_SPEED` 常数值（行 37）。

## 集成示例

完整的使用示例：

```typescript
// GameScene.ts
export class GameScene extends Phaser.Scene {
  private cameraManager!: CameraManager;

  create(): void {
    // 初始化摄像机管理器
    this.cameraManager = new CameraManager(this);

    // 其他初始化...
  }

  update(time: number, delta: number): void {
    // 更新摄像机
    this.cameraManager.update();

    // 可选：跟踪选中的代理
    const selectedAgent = this.stateManager.getSelectedAgent();
    if (selectedAgent) {
      this.cameraManager.panToPosition(
        selectedAgent.x * CELL_SIZE,
        selectedAgent.y * CELL_SIZE,
        1000
      );
    }

    // 其他更新...
  }

  shutdown(): void {
    // 清理
    this.cameraManager.destroy();
  }
}
```

## 更新日志

### v1.0.0 (2026-02-16)
- ✅ 实现基础摄像机管理
- ✅ 鼠标拖拽平移
- ✅ 鼠标滚轮缩放
- ✅ 键盘平移
- ✅ 边界管理
- ✅ 平滑过渡动画
