# 摄像机系统架构设计

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        浏览器窗口                                 │
│                  (响应式大小: 800x600 etc)                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Phaser 游戏画布                          │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │             摄像机视口 (游戏看到的部分)              │ │ │
│  │  │         (会随摄像机位置和缩放而改变)                │ │ │
│  │  │                                                     │ │ │
│  │  │  ┌────────────────────────────────────────────┐   │ │ │
│  │  │  │                                             │   │ │ │
│  │  │  │      游戏对象显示区域                       │   │ │ │
│  │  │  │      (格子、代理、物品等)                   │   │ │ │
│  │  │  │                                             │   │ │ │
│  │  │  └────────────────────────────────────────────┘   │ │ │
│  │  │                                                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────┐
    │         游戏世界坐标系                   │
    │       (6400 x 6400 像素)              │
    │                                        │
    │  ┌──────────────────────────────────┐ │
    │  │ (0,0)                            │ │
    │  │                                  │ │
    │  │  ┌─────────────────────────────┐ │ │
    │  │  │ 摄像机可见区域              │ │ │
    │  │  │ 位置: (x, y)                │ │ │
    │  │  │ 大小: (w, h)                │ │ │
    │  │  └─────────────────────────────┘ │ │
    │  │                                  │ │
    │  │                  (6400,6400)     │ │
    │  └──────────────────────────────────┘ │
    └────────────────────────────────────────┘
```

## CameraManager 工作流

```
输入事件
    ↓
┌─────────────────────────────────────┐
│         CameraManager               │
├─────────────────────────────────────┤
│ • setupInputHandlers()              │
│   - onMouseWheel()   → 缩放          │
│   - onPointerDown()  → 开始拖拽      │
│   - onPointerMove()  → 拖拽移动      │
│   - onPointerUp()    → 停止拖拽      │
│   - onKeyDown/Up()   → 键盘按键      │
│                                     │
│ • update()                          │
│   - 处理键盘平移                    │
│   - 检查边界                        │
│                                     │
│ • setCameraPosition()               │
│   - 验证边界 (clamping)             │
│   - 考虑缩放因子                    │
│   - 更新摄像机位置                  │
└─────────────────────────────────────┘
    ↓
更新 Phaser 摄像机
    ↓
下一帧渲染新视口区域
```

## 坐标转换

### 屏幕坐标 → 世界坐标

```typescript
// 鼠标在屏幕上的位置 (screenX, screenY)
// 需要转换为游戏世界中的位置

worldX = camera.scrollX + (screenX / camera.zoom);
worldY = camera.scrollY + (screenY / camera.zoom);
```

### 世界坐标 → 屏幕坐标

```typescript
// 游戏世界中的位置 (worldX, worldY)
// 需要显示在屏幕上

screenX = (worldX - camera.scrollX) * camera.zoom;
screenY = (worldY - camera.scrollY) * camera.zoom;
```

## 拖拽计算流程

```
鼠标按下 (dragStartX, dragStartY)
  ↓
记录:
  - dragStartX, dragStartY (屏幕坐标)
  - cameraStartX, cameraStartY (摄像机位置)
  ↓
鼠标移动 (currentX, currentY)
  ↓
计算差值:
  deltaX = currentX - dragStartX
  deltaY = currentY - dragStartY
  ↓
转换为世界坐标变化:
  worldDeltaX = deltaX / camera.zoom
  worldDeltaY = deltaY / camera.zoom
  ↓
新摄像机位置:
  newX = cameraStartX - worldDeltaX
  newY = cameraStartY - worldDeltaY
  ↓
应用边界检查 → setCameraPosition()
  ↓
鼠标释放 → 停止拖拽
```

## 缩放机制（围绕鼠标位置缩放）

```
鼠标滚轮事件
  ↓
获取鼠标屏幕坐标:
  mouseScreenX = pointer.x
  mouseScreenY = pointer.y
  ↓
计算缩放前的世界坐标（鼠标指向的游戏世界位置）:
  worldX = scrollX + (mouseScreenX / oldZoom)
  worldY = scrollY + (mouseScreenY / oldZoom)
  ↓
判断滚动方向并计算新缩放:
  - deltaY < 0: 向上滚动 → newZoom = oldZoom + 0.1
  - deltaY > 0: 向下滚动 → newZoom = oldZoom - 0.1
  ↓
限制范围:
  clampedZoom = Clamp(newZoom, 0.3, 3.0)
  ↓
设置新缩放:
  camera.setZoom(clampedZoom)
  ↓
关键步骤：调整摄像机位置保持世界坐标在屏幕相同位置:
  newScrollX = worldX - (mouseScreenX / clampedZoom)
  newScrollY = worldY - (mouseScreenY / clampedZoom)
  ↓
应用边界检查:
  setCameraPosition(newScrollX, newScrollY)
  ↓
完成：鼠标指向的世界位置保持在屏幕相同位置
```

### 关键公式

```
缩放前的世界坐标:
  W = S + M / Z_old
  其中: W = 世界坐标，S = 摄像机滚动，M = 鼠标屏幕坐标，Z_old = 旧缩放

缩放后的摄像机位置:
  S' = W - M / Z_new
  其中: S' = 新的摄像机滚动位置，Z_new = 新缩放

结果: 鼠标指向的世界点 W 在屏幕上的位置不变
```

## 边界管理

```
摄像机边界约束条件:

设定:
  - worldWidth = 6400
  - worldHeight = 6400
  - zoom = 当前缩放级别
  - viewportWidth = camera.displayWidth / zoom
  - viewportHeight = camera.displayHeight / zoom

约束:
  scrollX 范围: [0, worldWidth - viewportWidth]
  scrollY 范围: [0, worldHeight - viewportHeight]

当 zoom < 某个阈值 时:
  viewportWidth > worldWidth (摄像机看到的比世界更宽)
  此时不能让摄像机露出黑边，必须 clamp
```

## 事件流程时序图

```
Frame 1: 初始化
  ├─ create()
  │  └─ new CameraManager(this)
  │     ├─ init()
  │     ├─ setWorldBounds()
  │     ├─ setupInputHandlers()
  │     └─ centerCamera()
  └─ ✓ 摄像机准备就绪

Frame N: 用户交互 - 鼠标拖拽
  ├─ Input: pointerdown
  │  └─ onPointerDown()
  │     ├─ isDragging = true
  │     └─ 记录初始位置
  ├─ Input: pointermove (连续多次)
  │  └─ onPointerMove()
  │     ├─ 计算移动距离
  │     ├─ 转换为世界坐标
  │     ├─ 更新摄像机位置
  │     └─ camera.setScroll()
  ├─ Input: pointerup
  │  └─ onPointerUp()
  │     └─ isDragging = false
  └─ 画布显示新视口区域

Frame N: 用户交互 - 键盘平移
  ├─ Input: keydown (持续)
  │  └─ panKeys.right = true
  ├─ update()
  │  └─ 检查 panKeys
  │     ├─ scrollX -= PAN_SPEED / zoom
  │     └─ camera.setScroll()
  ├─ Input: keyup
  │  └─ panKeys.right = false
  └─ 摄像机停止移动

Frame N: 用户交互 - 缩放
  ├─ Input: wheel
  │  └─ onMouseWheel()
  │     ├─ 计算新缩放值
  │     ├─ Clamp(0.3, 3.0)
  │     ├─ camera.setZoom()
  │     └─ 自动调整位置
  └─ 画布显示缩放后的内容
```

## 性能优化

### 当前实现的优化

1. **事件监听优化**
   - 使用 Phaser 内置的输入系统
   - 避免全局 mousemove 监听
   - 只在需要时计算坐标变换

2. **边界检查**
   - 一次性 clamp 操作（3 次比较）
   - 避免重复计算

3. **缩放考虑**
   - 在 onPointerMove 时实时考虑 zoom
   - 不需要额外的缩放后处理

### 潜在的进一步优化

```
1. 添加缓存
   - 缓存 viewportWidth/Height 计算
   - 仅在 zoom 变化时重算

2. 限制更新频率
   - 鼠标移动时使用 requestAnimationFrame
   - 避免过度频繁的摄像机更新

3. 平滑过渡
   - 使用 Tween 实现平滑动画
   - 而不是每帧直接设置位置
```

## 与其他系统的集成

```
GameScene
├─ CameraManager
│  ├─ 处理用户输入
│  ├─ 计算摄像机位置
│  └─ 管理缩放级别
│
├─ UIManager
│  ├─ 显示 UI 组件
│  └─ UI 跟踪摄像机位置（可选）
│
├─ GameSceneRenderer
│  ├─ 根据摄像机位置裁剪绘制
│  └─ 只绘制视口范围内的对象
│
└─ DisplayStateManager
   ├─ 管理代理显示状态
   └─ 计算屏幕坐标（基于摄像机）
```

## 扩展点

### 1. 自动跟踪功能
```typescript
// 在 GameScene.update() 中
const selectedAgent = this.stateManager.getSelectedAgent();
if (selectedAgent && this.cameraFollowing) {
  this.cameraManager.panToPosition(agent.x, agent.y, 500);
}
```

### 2. 小地图集成
```typescript
// 显示小地图，显示摄像机视口范围
const viewport = this.cameraManager.getViewportDimensions();
const scroll = this.cameraManager.getScrollPosition();
minimap.drawCamera(scroll, viewport);
```

### 3. 快捷键导航
```typescript
// 按数字键快速移动到不同地点
onKeyDown(event) {
  if (event.key === '1') {
    this.cameraManager.panToPosition(800, 800); // 快速移动到特定位置
  }
}
```

### 4. 摄像机约束
```typescript
// 只允许在特定区域内移动
setCameraConstraint(minX, minY, maxX, maxY) {
  // 修改 setCameraPosition() 中的 clamp 范围
}
```
