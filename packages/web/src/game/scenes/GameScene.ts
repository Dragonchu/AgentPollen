import type { AgentFullState, ItemState, TileMap, Waypoint } from "@battle-royale/shared";
import { TileType, AgentActionState } from "@battle-royale/shared";
import * as Phaser from "phaser";
import {ASSETS, SpriteDirection} from "@/constants/Assets";

// ========== 游戏配置常量 ==========
// 格子大小：每个格子在像素中的大小（24px）
export const CELL_SIZE = 64;
// 网格大小：游戏网格是 20x20 个格子
export const GRID_SIZE = 20;
// 画布大小：总像素大小 = 64 * 20 = 1280px
export const CANVAS_SIZE = CELL_SIZE * GRID_SIZE;

// 从Assets导入朝向定义，避免重复定义
type Direction = SpriteDirection;

// 代理显示状态接口
// 用于跟踪每个代理的渲染位置，实现平滑的移动动画
// 通过在当前位置和目标位置之间插值（通常耗时800ms），
// 使得代理的移动看起来流畅而不是跳跃式的
interface AgentDisplayState {
  // 当前渲染位置（由插值计算）
  displayX: number;
  displayY: number;
  // 目标位置（来自服务器）
  targetX: number;
  targetY: number;
  // 前一个位置（插值起点）
  prevX: number;
  prevY: number;
  // 插值进度（0.0 到 1.0，0表示开始，1表示完成）
  progress: number;
  // 当前播放的动画类型
  currentAnimation?: AgentActionState;
  // 路径相关
  path: Waypoint[];
  pathIndex: number;
  // 精灵朝向（1=向右，-1=向左）
  facing: Direction;
}

export class GameScene extends Phaser.Scene {
  // Graphics 对象（当前使用的几何绘制）
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private zoneGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private allianceGraphics!: Phaser.GameObjects.Graphics;
  private agentGraphics!: Phaser.GameObjects.Graphics;

  // 精灵对象容器（用精灵图时替代上面的 Graphics）
  private agentSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private itemSprites: Map<number, Phaser.GameObjects.Image> = new Map();

  private agents: Map<number, AgentFullState> = new Map();
  private agentDisplayStates: Map<number, AgentDisplayState> = new Map();
  private agentPaths: Record<number, Waypoint[]> = {};
  private items: ItemState[] = [];
  private selectedAgentId: number | null = null;
  private shrinkBorder: number = GRID_SIZE;
  private zoneCenterX: number = GRID_SIZE / 2;
  private zoneCenterY: number = GRID_SIZE / 2;
  private tileMap: TileMap | null = null;
  private onAgentClick?: (agentId: number) => void;
  private onReady?: () => void;

  // Interpolation speed in ms (time to complete interpolation for a single step)
  // Each step takes the same time, so 8 steps = 8 seconds
  private readonly BASE_INTERPOLATION_DURATION_MS = 1000;  // 单步移动耗时（每格1秒）

  constructor() {
    super({ key: "GameScene" });
  }

  setOnReady(callback: () => void): void {
    this.onReady = callback;
  }

  /**
   * Calculate interpolation duration for a movement.
   * Duration is calculated based on actual grid distance moved (Manhattan distance).
   * Each grid cell = 1000ms, ensuring consistent movement speed.
   *
   * For example:
   * - Moving from (0,0) to (1,0): 1 grid = 1000ms
   * - Moving from (0,0) to (1,1): 2 grids (up+right) = 2000ms
   */
  private getMovementDuration(fromX: number, fromY: number, toX: number, toY: number): number {
    // 使用曼哈顿距离计算实际移动的格数
    const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);
    // 每格1000ms，所以总耗时 = distance * 1000ms
    return Math.max(1, distance) * this.BASE_INTERPOLATION_DURATION_MS;
  }

  // ========== 资源加载（Phaser 生命周期：preload → create → update） ==========
  // 这个方法在 create() 之前执行，用来预加载所有图片资源
  // Phaser 会在加载完所有资源后才调用 create()
  preload(): void {
    this.load.image(ASSETS.IMAGES.ROCK2, '/assets/Terrain/Decorations/Rocks/Rock2.png');
    this.load.image(ASSETS.IMAGES.GOLD_RESOURCE, '/assets/Terrain/Resources/Gold/GoldResource/Gold_Resource.png');
    this.load.spritesheet(
        ASSETS.IMAGES.WARRIOR_RUN.KEY,
        ASSETS.IMAGES.WARRIOR_RUN.PATH,
        {frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH, frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT}
    );
    this.load.spritesheet(
        ASSETS.IMAGES.WARRIOR_ATTACK.KEY,
        ASSETS.IMAGES.WARRIOR_ATTACK.PATH,
        {frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH, frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT}
    )
    this.load.spritesheet(
        ASSETS.IMAGES.WARRIOR_IDLE.KEY,
        ASSETS.IMAGES.WARRIOR_IDLE.PATH,
        {frameWidth: ASSETS.IMAGES.WARRIOR_IDLE.WIDTH, frameHeight: ASSETS.IMAGES.WARRIOR_IDLE.HEIGHT}
    )
  }

  create(): void {
    this.gridGraphics = this.add.graphics();
    this.zoneGraphics = this.add.graphics();
    this.connectionGraphics = this.add.graphics();
    this.allianceGraphics = this.add.graphics();
    this.agentGraphics = this.add.graphics();

    this.drawGrid();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });

    this.onReady?.();
  }

  setOnAgentClick(callback: (agentId: number) => void): void {
    this.onAgentClick = callback;
  }

  /**
   * Determine which animation to play based on agent state and movement status.
   */
  private getAnimationForState(actionState: AgentActionState, isMoving: boolean): string {
    if (actionState === AgentActionState.Fighting) {
      return 'attack-anim';
    }
    if (isMoving) {
      return 'walk-anim';
    }
    // 不在移动和战斗中，显示待机动画
    return 'idle-anim';
  }

  /**
   * Determine the direction agent is facing based on movement.
   * If moving left, returns SpriteDirection.Left; otherwise SpriteDirection.Right.
   */
  private getDirectionFromMovement(fromX: number, toX: number): Direction {
    if (toX < fromX) {
      return SpriteDirection.Left;  // 向左走，返回左朝向
    }
    return SpriteDirection.Right;   // 向右走或不动，返回右朝向
  }

  // 更新游戏状态数据（从服务器/父组件接收）
  // 当游戏状态改变时调用此方法：代理位置、物品、选中、缩圈等
  updateData(
    agents: Map<number, AgentFullState>,
    items: ItemState[],
    selectedAgentId: number | null,
    shrinkBorder: number,
    agentPaths: Record<number, Waypoint[]> = {},
    tileMap: TileMap | null,
    zoneCenterX: number = GRID_SIZE / 2,
    zoneCenterY: number = GRID_SIZE / 2,
  ): void {
    // ========== 处理代理位置插值 ==========
    // 为每个代理设置移动的目标位置，然后通过每帧插值实现平滑移动
    for (const [id, agent] of agents) {
      const displayState = this.agentDisplayStates.get(id);

      // Get the path for this agent (if any)
      const path = agentPaths[id] ?? [];

      if (!displayState) {
        // 新代理：初始化显示状态
        // 如果有路径，使用路径的第一个点；否则使用agent当前位置
        const firstWaypoint = path.length > 0 ? path[0] : { x: agent.x, y: agent.y };
        this.agentDisplayStates.set(id, {
          displayX: agent.x,
          displayY: agent.y,
          targetX: firstWaypoint.x,
          targetY: firstWaypoint.y,
          prevX: agent.x,
          prevY: agent.y,
          progress: path.length > 0 ? 0 : 1, // 如果有路径则开始插值，否则已完成
          path: path,
          pathIndex: 0,
          facing: ASSETS.IMAGES.WARRIOR_RUN.DEFAULT_DIRECTION,  // 使用Assets中定义的默认朝向
        });
      } else {
        // 现有代理：检查位置是否改变
        // 注意：我们检查agent的最终目标位置是否改变（而不是当前displayState的目标）
        // 这是因为agent可能还在沿着路径移动
        const agentFinalX = path.length > 0 ? path[path.length - 1].x : agent.x;
        const agentFinalY = path.length > 0 ? path[path.length - 1].y : agent.y;
        const displayFinalX = displayState.path.length > 0 ? displayState.path[displayState.path.length - 1].x : displayState.targetX;
        const displayFinalY = displayState.path.length > 0 ? displayState.path[displayState.path.length - 1].y : displayState.targetY;

        if (agentFinalX !== displayFinalX || agentFinalY !== displayFinalY || path.length !== displayState.path.length) {
          // 位置改变或路径改变：启动新的插值动画
          displayState.prevX = displayState.displayX;  // 记录当前显示位置为起点
          displayState.prevY = displayState.displayY;
          displayState.path = path;                    // 更新路径
          displayState.pathIndex = 0;                  // 重置路径索引

          // 如果有路径，从路径的第一个点开始；否则使用agent最终位置
          if (path.length > 0) {
            displayState.targetX = path[0].x;
            displayState.targetY = path[0].y;
          } else {
            displayState.targetX = agent.x;
            displayState.targetY = agent.y;
          }
          displayState.progress = 0;                  // 重置插值进度
        }
      }
    }

    // ========== 清理已移除的代理 ==========
    // 当代理从游戏中移除时，删除其显示状态
    for (const id of this.agentDisplayStates.keys()) {
      if (!agents.has(id)) {
        this.agentDisplayStates.delete(id);
      }
    }

    // ========== 更新游戏状态 ==========
    this.agents = agents;
    this.items = items;
    this.selectedAgentId = selectedAgentId;
    this.shrinkBorder = shrinkBorder;
    this.zoneCenterX = zoneCenterX;
    this.zoneCenterY = zoneCenterY;
    this.agentPaths = agentPaths;

    // ========== 处理地图障碍物（仅第一次） ==========
    // 障碍物是静态的，只需要绘制一次
    const wasNull = !this.tileMap;
    this.tileMap = tileMap;
    if (tileMap && wasNull) {
      // 地图首次接收时绘制障碍物
      this.drawObstacles();
    }

    // ========== 重新绘制所有动态元素 ==========
    this.redraw();
  }

  // Phaser 每帧更新回调（约60FPS）
  // 主要用于处理平滑的代理移动插值和精灵位置更新
  update(_time: number, delta: number): void {
    // 动画创建标志（仅在第一次时创建）
    let animCreated = false;

    // 更新所有代理的位置插值
    for (const [id, displayState] of this.agentDisplayStates) {
      // 获取该代理的数据
      const agent = this.agents.get(id);
      // 只处理活着的代理
      if (!agent?.alive) {
        // 如果代理已死亡，移除其精灵
        const sprite = this.agentSprites.get(id);
        if (sprite) {
          sprite.destroy();
          this.agentSprites.delete(id);
        }
        continue;
      }

      // 根据实际的移动距离（曼哈顿距离）计算耗时，保证每格速度一致
      // 1格移动 = 1000ms，2格移动 = 2000ms，以此类推
      const interpolationDuration = this.getMovementDuration(
        displayState.prevX, displayState.prevY,
        displayState.targetX, displayState.targetY
      );

      // 如果还没有移动到目标位置
      if (displayState.progress < 1) {
        // 计算这一帧的进度增量（delta 以毫秒为单位）
        const progressStep = delta / interpolationDuration;
        displayState.progress = Math.min(1, displayState.progress + progressStep);

        // 严格4向移动约束：X轴和Y轴分别插值，不混合
        // 这确保agent只沿着4个方向（上下左右）移动，不会斜线移动
        const dx = displayState.targetX - displayState.prevX;
        const dy = displayState.targetY - displayState.prevY;

        // 计算需要多少"步"来完成这次移动（X和Y各最多1步）
        const totalSteps = (dx !== 0 ? 1 : 0) + (dy !== 0 ? 1 : 0);
        let t = displayState.progress;

        if (totalSteps === 0) {
          // 不需要移动（不应该发生）
          displayState.displayX = displayState.prevX;
          displayState.displayY = displayState.prevY;
        } else if (totalSteps === 1) {
          // 只有一个方向移动，直接插值那个方向
          t = this.easeOutCubic(t);
          if (dx !== 0) {
            displayState.displayX = displayState.prevX + dx * t;
            displayState.displayY = displayState.prevY;
          } else {
            displayState.displayX = displayState.prevX;
            displayState.displayY = displayState.prevY + dy * t;
          }
        } else {
          // 两个方向都要移动：X轴优先（占前50%时间），然后Y轴（占后50%时间）
          const halfProgress = 0.5;
          if (displayState.progress < halfProgress) {
            // 前半段：X轴移动
            const xT = this.easeOutCubic(displayState.progress / halfProgress);
            displayState.displayX = displayState.prevX + dx * xT;
            displayState.displayY = displayState.prevY;
          } else {
            // 后半段：Y轴移动（X轴已完成）
            const yT = this.easeOutCubic((displayState.progress - halfProgress) / (1 - halfProgress));
            displayState.displayX = displayState.targetX;
            displayState.displayY = displayState.prevY + dy * yT;
          }
        }
      } else {
        // 到达当前目标位置，尝试移动到路径的下一个点
        if (displayState.path && displayState.path.length > 0) {
          displayState.pathIndex++;
          if (displayState.pathIndex < displayState.path.length) {
            // 还有更多的路径点，继续下一个
            const nextWaypoint = displayState.path[displayState.pathIndex];
            displayState.prevX = displayState.displayX;
            displayState.prevY = displayState.displayY;
            displayState.targetX = nextWaypoint.x;
            displayState.targetY = nextWaypoint.y;
            displayState.progress = 0; // 开始新的插值
          } else {
            // 路径已完成，停留在最后位置
            displayState.displayX = displayState.targetX;
            displayState.displayY = displayState.targetY;
          }
        } else {
          // 没有路径点，确保已经到达目标位置（精确值，避免浮点数误差）
          displayState.displayX = displayState.targetX;
          displayState.displayY = displayState.targetY;
        }
      }

      // 获取或创建代理的精灵
      let sprite = this.agentSprites.get(id);
      if (!sprite) {
        // 首次创建动画（仅创建一次）
        if (!animCreated) {
          // 行走动画
          this.anims.create({
            key: 'walk-anim',
            frames: this.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_RUN.KEY, { start: 0, end: 5 }),
            frameRate: 6,  // 中等降速：从10fps改为6fps
            repeat: -1
          });
          // 攻击动画
          this.anims.create({
            key: 'attack-anim',
            frames: this.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_ATTACK.KEY, { start: 0, end: 5 }),
            frameRate: 6,  // 中等降速：从10fps改为6fps
            repeat: -1
          });
          // 待机动画（移动完成后显示）
          this.anims.create({
            key: 'idle-anim',
            frames: this.anims.generateFrameNumbers(ASSETS.IMAGES.WARRIOR_IDLE.KEY, { start: 0, end: 3 }),
            frameRate: 4,  // 待机动作更慢
            repeat: -1
          });
          animCreated = true;
        }
        // 创建新的精灵
        sprite = this.add.sprite(0, 0, ASSETS.IMAGES.WARRIOR_RUN.KEY);
        // 根据初始状态播放相应动画
        const isMoving = displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;
        const initialAnim = this.getAnimationForState(agent.actionState, isMoving);
        sprite.play(initialAnim);
        displayState.currentAnimation = agent.actionState;
        this.agentSprites.set(id, sprite);
      } else {
        // 检查是否需要切换动画
        const isMoving = displayState.path.length > 0 && displayState.pathIndex < displayState.path.length;
        const newAnim = this.getAnimationForState(agent.actionState, isMoving);

        if (displayState.currentAnimation !== agent.actionState || newAnim !== sprite.anims.currentAnim?.key) {
          sprite.play(newAnim);
          displayState.currentAnimation = agent.actionState;

          // 根据动画类型切换纹理
          if (agent.actionState === AgentActionState.Fighting) {
            sprite.setTexture(ASSETS.IMAGES.WARRIOR_ATTACK.KEY);
          } else if (!isMoving) {
            // 如果不在移动且不在战斗，显示idle
            sprite.setTexture(ASSETS.IMAGES.WARRIOR_IDLE.KEY);
          } else {
            sprite.setTexture(ASSETS.IMAGES.WARRIOR_RUN.KEY);
          }
        }
      }

      // 更新精灵朝向（根据移动方向判断是否需要翻转）
      const newFacing = this.getDirectionFromMovement(displayState.prevX, displayState.targetX);
      if (newFacing !== displayState.facing) {
        displayState.facing = newFacing;
        // 应用翻转：向左时翻转（Left = -1），向右时不翻转（Right = 1）
        sprite.setFlipX(newFacing === SpriteDirection.Left);
      }

      // 更新精灵位置（转换为像素坐标）
      const px = displayState.displayX * CELL_SIZE + CELL_SIZE / 2;
      const py = displayState.displayY * CELL_SIZE + CELL_SIZE / 2;
      sprite.setPosition(px, py);
    }

    // 清理已移除或已死亡的代理的精灵
    for (const id of this.agentSprites.keys()) {
      if (!this.agentDisplayStates.has(id) || !this.agents.get(id)?.alive) {
        const sprite = this.agentSprites.get(id);
        sprite?.destroy();
        this.agentSprites.delete(id);
      }
    }

    // 重新绘制动态元素（连接线、同盟线、图形化代理）
    this.drawConnections();
    this.drawAlliances();
    this.drawAgents();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // --------------- drawing helpers ---------------

  // 绘制游戏网格背景
  // 这里使用原始绘制（Graphics API），可以替换为精灵图
  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    // 绘制细网格线（可用精灵图替代）
    // 线宽：0.5，颜色：0x111122（深灰），透明度：0.5
    g.lineStyle(0.5, 0x111122, 0.5);
    // 绘制竖线和横线，形成20x20的网格
    for (let i = 0; i <= GRID_SIZE; i++) {
      g.lineBetween(i * CELL_SIZE, 0, i * CELL_SIZE, CANVAS_SIZE);
      g.lineBetween(0, i * CELL_SIZE, CANVAS_SIZE, i * CELL_SIZE);
    }
  }

  // 绘制地图障碍物（石头、墙壁等）
  // 遍历地图中所有被标记为 Blocked 的瓷砖，绘制为障碍物
  // 可以替换为障碍物精灵图
  private drawObstacles(): void {
    if (!this.tileMap) return;

    // 遍历整个地图
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const tile = this.tileMap.tiles[y][x];
        // 只绘制被阻挡的瓷砖
        if (tile.type === TileType.Blocked) {
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;
          this.add.sprite(px, py, ASSETS.IMAGES.ROCK2)
        }
      }
    }
  }

  private redraw(): void {
    this.drawZone();
    this.drawItems();
    this.drawConnections();
    this.drawAlliances();
    this.drawAgents();
  }

  // 绘制安全区域圈（缩圈机制）
  // 随着游戏进行，安全区域会不断缩小，玩家被限制在安全区域内
  private drawZone(): void {
    const g = this.zoneGraphics;
    g.clear();
    // 如果缩圈还没开始（边界仍为最大值），不绘制
    if (this.shrinkBorder >= GRID_SIZE) return;

    // 计算安全区域的位置和大小
    const half = this.shrinkBorder / 2;
    const zoneX = (this.zoneCenterX - half) * CELL_SIZE;
    const zoneY = (this.zoneCenterY - half) * CELL_SIZE;
    const zoneW = this.shrinkBorder * CELL_SIZE;
    const zoneH = this.shrinkBorder * CELL_SIZE;

    // 第1层：整个画布的危险区域提示（紫色微弱染色）
    g.fillStyle(0x8844ff, 0.05);
    g.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 第2层：安全区域覆盖（深色半透明，显示下方的障碍物）
    g.fillStyle(0x0a0a14, 0.3);
    g.fillRect(zoneX, zoneY, zoneW, zoneH);

    // 第3层：安全区域边界（紫色发光的矩形边框）
    g.lineStyle(2, 0x8844ff, 0.6);
    g.strokeRect(zoneX, zoneY, zoneW, zoneH);

    // 第4层：外层发光效果（更宽的线，低透明度）
    g.lineStyle(4, 0x8844ff, 0.15);
    g.strokeRect(zoneX - 2, zoneY - 2, zoneW + 4, zoneH + 4);
  }

  // 绘制地面上的物品（武器、补给等）
  // 维护物品精灵的 map，当物品被拾取时销毁对应的精灵
  private drawItems(): void {
    // 创建一个 Set 来追踪当前存在的物品 ID
    const currentItemIds = new Set(this.items.map(item => item.id));

    // 遍历所有物品，创建或更新其精灵
    for (const item of this.items) {
      // 计算物品在画布上的中心坐标
      const cx = item.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.y * CELL_SIZE + CELL_SIZE / 2;

      // 获取或创建物品精灵
      let sprite = this.itemSprites.get(item.id);
      if (!sprite) {
        // 创建新的物品图像
        sprite = this.add.image(cx, cy, ASSETS.IMAGES.GOLD_RESOURCE);
        this.itemSprites.set(item.id, sprite);
      } else {
        // 更新现有物品的位置（以防物品被移动）
        sprite.setPosition(cx, cy);
      }
    }

    // 清理已被拾取的物品的精灵
    for (const itemId of this.itemSprites.keys()) {
      if (!currentItemIds.has(itemId)) {
        const sprite = this.itemSprites.get(itemId);
        sprite?.destroy();
        this.itemSprites.delete(itemId);
      }
    }
  }

  // 绘制附近代理之间的连接线
  // 当两个活着的代理靠近时，在它们之间绘制淡紫色的连接线
  // 距离越远，透明度越低
  private drawConnections(): void {
    const g = this.connectionGraphics;
    g.clear();

    // 获取所有活着的代理
    const alive = Array.from(this.agents.values()).filter(a => a.alive);

    // 两两比较所有活着的代理
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];

        // 使用内插位置以获得平滑的线条渲染
        // 这样当代理移动时，连接线也会平滑动画
        const aDisplay = this.agentDisplayStates.get(a.id);
        const bDisplay = this.agentDisplayStates.get(b.id);
        const ax = aDisplay ? aDisplay.displayX : a.x;
        const ay = aDisplay ? aDisplay.displayY : a.y;
        const bx = bDisplay ? bDisplay.displayX : b.x;
        const by = bDisplay ? bDisplay.displayY : b.y;

        // 计算两个代理之间的距离
        const dx = ax - bx;
        const dy = ay - by;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 只连接距离在5格以内的代理
        if (dist <= 5) {
          // 透明度随距离增加而降低
          // 最小透明度：0.03，最大透明度：0.12
          const alpha = Math.max(0.03, 0.12 - dist * 0.02);
          g.lineStyle(1, 0x8844ff, alpha);
          // 从代理A的中心连到代理B的中心
          g.lineBetween(
            (ax + 0.5) * CELL_SIZE,
            (ay + 0.5) * CELL_SIZE,
            (bx + 0.5) * CELL_SIZE,
            (by + 0.5) * CELL_SIZE,
          );
        }
      }
    }
  }

  // 绘制选中代理的同盟关系
  // 显示选中代理与其盟友和敌人的关系
  // 蓝色虚线：盟友，红色虚线：敌人
  private drawAlliances(): void {
    const g = this.allianceGraphics;
    g.clear();
    // 如果没有选中代理，不绘制
    if (this.selectedAgentId == null) return;

    const selected = this.agents.get(this.selectedAgentId);
    // 如果选中的代理没有同盟信息，不绘制
    if (!selected?.alliances) return;

    // 获取选中代理的内插位置
    const selectedDisplay = this.agentDisplayStates.get(selected.id);
    const selectedX = selectedDisplay ? selectedDisplay.displayX : selected.x;
    const selectedY = selectedDisplay ? selectedDisplay.displayY : selected.y;

    // 绘制盟友关系线（蓝色虚线）
    g.lineStyle(1.5, 0x44aaff, 0.5);
    for (const allyId of selected.alliances) {
      const ally = this.agents.get(allyId);
      // 只显示活着的盟友
      if (!ally?.alive) continue;

      // 获取盟友的内插位置
      const allyDisplay = this.agentDisplayStates.get(allyId);
      const allyX = allyDisplay ? allyDisplay.displayX : ally.x;
      const allyY = allyDisplay ? allyDisplay.displayY : ally.y;

      // 绘制蓝色虚线（虚线长4，间隔4）
      this.drawDashedLine(
        g,
        (selectedX + 0.5) * CELL_SIZE,
        (selectedY + 0.5) * CELL_SIZE,
        (allyX + 0.5) * CELL_SIZE,
        (allyY + 0.5) * CELL_SIZE,
        4,
        4,
      );
    }

    // 绘制敌人关系线（红色虚线）
    if (selected.enemies) {
      g.lineStyle(1.5, 0xff4444, 0.3);
      for (const enemyId of selected.enemies) {
        const enemy = this.agents.get(enemyId);
        // 只显示活着的敌人
        if (!enemy?.alive) continue;

        // 获取敌人的内插位置
        const enemyDisplay = this.agentDisplayStates.get(enemyId);
        const enemyX = enemyDisplay ? enemyDisplay.displayX : enemy.x;
        const enemyY = enemyDisplay ? enemyDisplay.displayY : enemy.y;

        // 绘制红色虚线（虚线长3，间隔5）
        this.drawDashedLine(
          g,
          (selectedX + 0.5) * CELL_SIZE,
          (selectedY + 0.5) * CELL_SIZE,
          (enemyX + 0.5) * CELL_SIZE,
          (enemyY + 0.5) * CELL_SIZE,
          3,
          5,
        );
      }
    }
  }

  // 绘制虚线（辅助函数）
  // 用于绘制同盟关系线，通过交替绘制实线段和空隙来形成虚线效果
  private drawDashedLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLen: number,
    gapLen: number,
  ): void {
    // 计算两点之间的向量
    const dx = x2 - x1;
    const dy = y2 - y1;
    // 计算两点之间的距离
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    // 计算单位向量（方向向量）
    const ux = dx / dist;
    const uy = dy / dist;
    let drawn = 0;
    let drawing = true; // 交替绘制实线段和空隙

    // 沿着线段方向不断绘制虚线
    while (drawn < dist) {
      // 计算该段的终点（可能是实线段或空隙）
      const segEnd = Math.min(drawn + (drawing ? dashLen : gapLen), dist);
      // 只绘制实线段，跳过空隙
      if (drawing) {
        g.lineBetween(
          x1 + ux * drawn,
          y1 + uy * drawn,
          x1 + ux * segEnd,
          y1 + uy * segEnd,
        );
      }
      // 移动到下一段
      drawn = segEnd;
      // 在实线和空隙之间切换
      drawing = !drawing;
    }
  }

  // 绘制游戏中的代理角色
  // 每个代理由以下部分组成：
  // 1. 光晕效果（多层圆形渐变）
  // 2. 身体（梯形，代表躯干）
  // 3. 头部（圆形）
  // 4. 眼睛（两个小亮点）
  // 5. 血量条（生命值显示）
  // 6. 选中环（仅在选中时显示）
  // 7. 名字标签（仅在选中时显示）
  //
  // 可以将这些基本图形替换为精灵图来实现像素风格
  private drawAgents(): void {
    const g = this.agentGraphics;
    g.clear();

    // 代理大小参数（相对单位）
    const AGENT_SIZE = 5;
    // 光晕半径（用于生成光晕效果）
    const glowRadius = AGENT_SIZE * 5.5;

    // 遍历所有代理
    for (const [_id, agent] of this.agents) {
      // 只绘制活着的代理
      if (!agent.alive) continue;

      // 获取代理的内插位置（平滑移动）
      const displayState = this.agentDisplayStates.get(agent.id);
      const renderX = displayState ? displayState.displayX : agent.x;
      const renderY = displayState ? displayState.displayY : agent.y;

      // 计算代理在画布上的像素坐标（格子中心）
      const cx = renderX * CELL_SIZE + CELL_SIZE / 2;
      const cy = renderY * CELL_SIZE + CELL_SIZE / 2;

      // 根据代理ID生成独特的颜色（HSL色相）
      const hue = (agent.id * 137) % 360;
      const hueNorm = hue / 360;
      const isSelected = this.selectedAgentId === agent.id;

      // 生成三种颜色用于不同部分：
      // 头部颜色：饱和度80%，亮度40%（较深）
      const headColor = Phaser.Display.Color.HSLToColor(hueNorm, 0.8, 0.4).color;
      // 身体颜色：饱和度70%，亮度30%（较暗）
      const bodyColor = Phaser.Display.Color.HSLToColor(hueNorm, 0.7, 0.3).color;
      // 眼睛颜色：饱和度100%，亮度50%（最亮）
      const eyeColor = Phaser.Display.Color.HSLToColor(hueNorm, 1, 0.5).color;

      // ========== 绘制光晕效果 ==========
      // 多层圆形从内到外逐渐淡出，形成辐射光晕
      const glowLayers = isSelected ? 10 : 6; // 选中时更多层，效果更明显
      for (let i = glowLayers; i > 0; i--) {
        // 计算该层的半径（从30%到100%）
        const r = glowRadius * (0.3 + (i / glowLayers) * 0.7);
        // 计算该层的透明度（从内到外逐渐淡出）
        const alpha = (isSelected ? 0.12 : 0.06) * (1 - i / glowLayers) * (1 - i / (glowLayers * 2));
        g.fillStyle(eyeColor, alpha);
        g.fillCircle(cx, cy, r);
      }

      // ========== 绘制身体（梯形） ==========
      // 梯形形状：宽的肩膀 → 窄的腰部 → 宽的腿部
      const s = AGENT_SIZE;
      g.fillStyle(bodyColor, 0.95);
      // 上三角形（肩膀）
      g.fillTriangle(
        cx - 1.5 * s, cy - s,      // 左肩
        cx + 1.5 * s, cy - s,      // 右肩
        cx + 0.8 * s, cy + 2.5 * s, // 右腿
      );
      // 下三角形（腿部）
      g.fillTriangle(
        cx - 1.5 * s, cy - s,       // 左肩
        cx + 0.8 * s, cy + 2.5 * s, // 右腿
        cx - 0.8 * s, cy + 2.5 * s, // 左腿
      );

      // ========== 绘制头部 ==========
      g.fillStyle(headColor, 0.95);
      g.fillCircle(cx, cy - 2.5 * s, 1.2 * s);

      // ========== 绘制眼睛 ==========
      // 两个小的亮点表示眼睛，位于头部两侧
      g.fillStyle(eyeColor);
      g.fillCircle(cx - 0.4 * s, cy - 2.5 * s, 0.25 * s); // 左眼
      g.fillCircle(cx + 0.4 * s, cy - 2.5 * s, 0.25 * s); // 右眼

      // ========== 绘制选中环（仅当选中时） ==========
      const ringR = glowRadius * 0.6;
      if (isSelected) {
        // 内环：更亮的橙黄色
        g.lineStyle(2.5, 0xffaa22, 0.9);
        g.strokeCircle(cx, cy, ringR);
        // 外环：较淡的橙黄色
        g.lineStyle(1.5, 0xffaa22, 0.3);
        g.strokeCircle(cx, cy, ringR + 6);
      }

      // ========== 绘制血量条 ==========
      const barW = CELL_SIZE * 0.9;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - glowRadius - 4;

      // 血量条背景（深色边框）
      g.fillStyle(0x0a0a14, 0.8);
      g.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // 血量条背景（深灰色）
      g.fillStyle(0x1a1a2e);
      g.fillRect(barX, barY, barW, barH);

      // 血量条（根据HP百分比填充，颜色根据血量动态变化）
      const hpPct = agent.hp / (agent.maxHp || 100);
      // 血量多：绿色，血量中：橙色，血量少：红色
      const hpColor = hpPct > 0.6 ? 0x22cc88 : hpPct > 0.3 ? 0xff8800 : 0xff4444;
      g.fillStyle(hpColor);
      g.fillRect(barX, barY, barW * hpPct, barH);

      // ========== 绘制名字标签（仅当选中时） ==========
      if (isSelected) {
        const nameTag = agent.name.substring(0, 6);
        const tagW = nameTag.length * 6 + 8;
        const tagH = 14;
        const tagX = cx - tagW / 2;
        const tagY = cy + 2.5 * s + 4;

        // 标签背景
        g.fillStyle(0x0a0a14, 0.9);
        g.fillRoundedRect(tagX, tagY, tagW, tagH, 3);
        // 标签边框（使用代理的眼睛颜色）
        g.lineStyle(1, eyeColor, 0.4);
        g.strokeRoundedRect(tagX, tagY, tagW, tagH, 3);
      }
    }
  }

  // --------------- interaction ---------------

  private handleClick(px: number, py: number): void {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);

    let closest: { id: number; dist: number } | null = null;
    for (const [, agent] of this.agents) {
      if (!agent.alive) continue;
      
      // Use interpolated position for click detection to match rendering
      const displayState = this.agentDisplayStates.get(agent.id);
      const renderX = displayState ? displayState.displayX : agent.x;
      const renderY = displayState ? displayState.displayY : agent.y;
      
      const dist = Math.abs(renderX - gx) + Math.abs(renderY - gy);
      if (dist <= 1 && (!closest || dist < closest.dist)) {
        closest = { id: agent.id, dist };
      }
    }

    if (closest) {
      this.onAgentClick?.(closest.id);
    }
  }
}
