# Web Package Architecture

This document describes the 4-layer architecture of the AI Battle Royale web frontend.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Layer Responsibilities](#layer-responsibilities)
- [Manager Initialization Protocol](#manager-initialization-protocol)
- [Component Dependency Graph](#component-dependency-graph)
- [Camera System](#camera-system)
- [Rendering Pipeline](#rendering-pipeline)
- [Event Flow](#event-flow)
- [Design Principles](#design-principles)

## Architecture Overview

The web package follows a strict 4-layer architecture pattern:

```
┌─────────────────────────────────────┐
│   Presentation Layer                │
│   - UICoordinator, UI Components    │
│   - WorldRenderer (Rendering)       │
├─────────────────────────────────────┤
│   Application/Business Logic        │
│   - GameController                  │
├─────────────────────────────────────┤
│   Domain/State Layer                │
│   - GameState, MotionState          │
├─────────────────────────────────────┤
│   Infrastructure Layer              │
│   - NetworkService, CameraManager   │
└─────────────────────────────────────┘
```

### GameScene: The Pure Orchestrator

`GameScene` is a **pure Phaser Scene orchestrator** that only:
1. Initializes all managers in correct dependency order
2. Dispatches `update()` calls to appropriate managers
3. Handles browser window resize events
4. Manages scene lifecycle (create, update, shutdown)

**GameScene does NOT:**
- ❌ Directly render sprites or manage rendering logic
- ❌ Directly handle game state or business logic
- ❌ Directly access NetworkService (must go through GameController)
- ❌ Create or manage cameras (delegated to CameraManager)

## Layer Responsibilities

### 1. Infrastructure Layer

**Components:** `NetworkService`, `CameraManager`

#### NetworkService
- WebSocket connection to game server
- Sends commands (vote, inspect agent, etc.)
- Receives server events and updates GameState
- Low-level network protocol implementation

#### CameraManager
- Manages all Phaser cameras (main, UI, PiP)
- Camera movement (pan, zoom, follow)
- Coordinate transformations (screen ↔ world ↔ grid)
- Input handling for camera controls

**Key Methods:**
- `initialize()`: Set up cameras and input handlers
- `update(gridPos)`: Update camera position each frame
- `getUICamera()`: Get UI camera for world renderer
- `screenToGrid(x, y)`: Convert screen coords to grid coords

### 2. Domain/State Layer

**Components:** `GameState`, `MotionState`

#### GameState
- Single source of truth for game state
- Manages agents, items, events, votes, tilemap
- Emits state change events for UI updates
- Read-only access for other layers

**Events:**
- `state:agents:updated`
- `state:tilemap:updated`
- `state:paths:updated`
- `state:agent:selected`

#### MotionState
- Manages agent motion interpolation
- Smooth movement between grid positions
- Path following with easing curves
- Emits motion update events

**Events:**
- `motion:updated`: Server data received
- `motion:frame-updated`: Interpolation progressed

### 3. Application/Business Logic Layer

**Component:** `GameController`

The **only** entry point for UI components to interact with game logic.

**Responsibilities:**
- Coordinate commands to NetworkService
- Provide read-only queries to GameState
- Business logic decisions
- Single interface for all UI components

**Key Methods:**
- `submitVote(agentId, action)`: Submit player vote
- `selectAgent(agentId)`: Select and inspect agent
- `getAgents()`: Query all agents
- `getSelectedAgent()`: Query selected agent

**Design Pattern:**
```typescript
// ✅ Correct: UI → GameController → NetworkService
gameController.selectAgent(agentId);

// ❌ Wrong: UI → NetworkService directly
networkService.inspectAgent(agentId);
```

### 4. Presentation Layer

**Components:** `UICoordinator`, `WorldRenderer`, UI Components

#### UICoordinator
- Manages all UI components (header, sidebar, panels)
- Responsive layout calculations
- UI event handling and coordination
- Uses `BaseUI` pattern for all UI components

#### WorldRenderer
- Manages all sprite-based world rendering
- Agent sprites, animations, positioning
- Item sprites (gold, resources)
- Obstacle sprites (rocks, blocked tiles)
- Tile background
- Sprite lifecycle management

**Key Methods:**
- `initialize()`: Set up renderer (no initial rendering)
- `createTileBackground(tileMap)`: Create world background
- `drawObstacles(tileMap)`: Render obstacle sprites
- `updateAgentSprites(agents, motionStates)`: Update agent sprites
- `drawItems(items)`: Render item sprites
- `destroy()`: Clean up all sprites

#### UI Components
All UI components extend `BaseUI` and follow patterns:
- Header, Sidebar, EventFeed, VotePanel, AgentStats, AIThinking, CameraControl
- Subscribe to GameState events for updates
- Call GameController methods for actions
- Responsive positioning using `ResponsiveScaler`

## Manager Initialization Protocol

**All managers follow a consistent initialization pattern:**

### Pattern

```typescript
class Manager {
  private dependency: Dependency;

  // Constructor: ONLY store dependencies, NO side effects
  constructor(dependency: Dependency) {
    this.dependency = dependency;
  }

  // Initialize: Perform setup after all dependencies are ready
  initialize(): void {
    // Setup code here
    // Create cameras, register listeners, etc.
  }

  // Destroy: Clean up resources
  destroy(): void {
    // Cleanup code here
  }
}
```

### GameScene Initialization Order

```typescript
create(): void {
  // 1. CameraManager (Infrastructure)
  //    Creates: main camera, UI camera, PiP camera
  //    No dependencies
  this.cameraManager = new CameraManager(this, this.motionState);
  this.cameraManager.initialize();

  // 2. WorldRenderer (Presentation/Rendering)
  //    Depends on: UI camera from CameraManager
  const uiCamera = this.cameraManager.getUICamera()!;
  this.worldRenderer = new WorldRenderer(this, uiCamera);
  this.worldRenderer.initialize();

  // 3. NetworkService (Infrastructure)
  //    No dependencies
  this.networkService = new NetworkService();

  // 4. GameState (Domain)
  //    Depends on: NetworkService
  this.gameState = new GameState(this.networkService);

  // 5. GameController (Application)
  //    Depends on: GameState, NetworkService
  this.gameController = new GameController(this.gameState, this.networkService);

  // 6. UICoordinator (Presentation)
  //    Depends on: GameController, CameraManager, MotionState
  this.uiCoordinator = new UICoordinator(
    this,
    this.gameController,
    this.cameraManager,
    this.motionState,
    this.cameras.main,
  );
  this.uiCoordinator.create(); // Note: UICoordinator uses .create() not .initialize()

  // 7. Setup input and state listeners
  this.setupInputHandlers();
  this.setupStateListeners();

  // 8. Connect to server
  this.networkService.connect();
}
```

**Key Rules:**
1. Constructors MUST NOT have side effects
2. All setup logic goes in `initialize()` or `create()`
3. Managers are initialized in dependency order
4. Single-direction dependencies (no circular refs)

## Component Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                         GameScene                             │
│                   (Pure Orchestrator)                         │
└───────────┬──────────────────────────────────────────────────┘
            │ creates & initializes
            ├─────────────────┬─────────────────┬────────────────┐
            ▼                 ▼                 ▼                ▼
    ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │CameraManager │  │MotionState  │  │NetworkService│  │ WorldRenderer│
    │(Infrastructure)  │(Domain)     │  │(Infrastructure) │(Presentation)│
    └──────────────┘  └─────────────┘  └──────┬───────┘  └──────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  GameState  │
                                        │  (Domain)   │
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────────┐
                                        │ GameController  │
                                        │ (Application)   │
                                        └──────┬──────────┘
                                               │
                                               ▼
                                        ┌─────────────────┐
                                        │ UICoordinator   │
                                        │ (Presentation)  │
                                        └─────────────────┘
```

## Camera System

### Three Cameras

CameraManager manages three distinct cameras:

1. **Main Camera** (`cameras.main`)
   - Default Phaser camera
   - User-controlled (pan/zoom)
   - Renders all world objects (agents, items, terrain)
   - Ignores UI objects

2. **UI Camera** (`uiCamera`)
   - Second camera added by CameraManager
   - Fixed position (no scroll/zoom)
   - Renders only UI components
   - Ignores world objects

3. **PiP Camera** (`pipCamera`, optional)
   - Created when dual camera mode enabled
   - Bottom-right viewport (300x300px)
   - 2x zoom, follows selected agent
   - Renders world objects only

### Camera Isolation

World objects (sprites, terrain) are registered with `uiCamera.ignore(obj)` so:
- Main camera renders: ✅ World objects, ❌ UI objects
- UI camera renders: ❌ World objects, ✅ UI objects
- PiP camera renders: ✅ World objects, ❌ UI objects + border

**Implementation:**
```typescript
// WorldRenderer registers all world objects
private registerGameObject(obj: Phaser.GameObjects.GameObject): void {
  this.uiCamera.ignore(obj);
}

// CameraManager makes main camera ignore PiP border/label
this.camera.ignore([this.pipBorderGraphics, this.pipLabelText]);
```

## Rendering Pipeline

### Update Loop Flow

```
GameScene.update(time, delta)
  ├─> CameraManager.update(gridPos)
  │   └─> Update main camera position
  │   └─> Update PiP camera target
  │
  ├─> MotionState.tick(delta, agents)
  │   └─> Interpolate agent positions
  │   └─> Emit 'motion:frame-updated' event
  │
  ├─> WorldRenderer.updateAgentSprites(agents, motionStates)
  │   └─> Create/update/destroy agent sprites
  │   └─> Update animations based on action state
  │   └─> Update sprite positions from motion states
  │
  ├─> WorldRenderer.drawItems(items)
  │   └─> Create/update/destroy item sprites
  │   └─> Update item positions
  │
  └─> UICoordinator.update(time, delta)
      └─> Update UI component animations/states
```

### State Update Flow

```
Server → NetworkService → GameState
                            │
                            ├─> Emit 'state:agents:updated'
                            │     └─> GameScene.onAgentsUpdated()
                            │           └─> MotionState.updateFromServer()
                            │
                            ├─> Emit 'state:tilemap:updated'
                            │     └─> GameScene.onTilemapUpdated()
                            │           ├─> CameraManager.setWorldDimensions()
                            │           ├─> WorldRenderer.createTileBackground()
                            │           └─> WorldRenderer.drawObstacles()
                            │
                            └─> Emit 'state:agent:selected'
                                  └─> UI components update display
```

## Event Flow

### Input Events

```
User Click (Right Button)
  └─> GameScene.handleClick(x, y)
      ├─> CameraManager.screenToGrid(x, y) → gridPos
      ├─> Find closest agent at gridPos
      └─> GameController.selectAgent(agentId)    // ✅ Through business logic layer
          └─> NetworkService.inspectAgent(agentId)
              └─> Server
```

### State Events

```typescript
// GameState emits events when state changes
gameState.emit('state:agents:updated', agents);
gameState.emit('state:tilemap:updated', tileMap);
gameState.emit('state:agent:selected', agent);

// Managers/UI components listen to events
gameState.on('state:agents:updated', this.onAgentsUpdated, this);
gameState.on('state:tilemap:updated', this.onTilemapUpdated, this);
```

## Design Principles

### 1. Single Responsibility Principle
Each manager has ONE clear responsibility:
- `GameScene`: Orchestration
- `CameraManager`: Camera control
- `WorldRenderer`: Sprite rendering
- `GameState`: State management
- `GameController`: Business logic
- `UICoordinator`: UI coordination
- `NetworkService`: Network communication

### 2. Dependency Inversion
- High-level layers depend on abstractions, not implementations
- GameController provides interface for UI, hides NetworkService details
- UI components depend on GameController, not NetworkService directly

### 3. Separation of Concerns
- Rendering logic isolated in WorldRenderer
- State logic isolated in GameState
- Business logic isolated in GameController
- UI logic isolated in UICoordinator

### 4. Consistent Patterns
- All managers use `initialize()` method
- All managers have `destroy()` cleanup
- All UI components extend `BaseUI`
- All state changes go through events

### 5. One-Way Data Flow
```
User Action → GameController → NetworkService → Server
                                                    ↓
UI Components ← GameState ← NetworkService ← Server
```

### 6. No Leaky Abstractions
- GameScene does NOT expose `registerGameObject()` (camera concern)
- UI components do NOT access NetworkService directly
- WorldRenderer does NOT access GameState directly

## File Organization

```
packages/web/src/game/
├── managers/               # Core managers
│   ├── CameraManager.ts       # Infrastructure: Camera control
│   ├── NetworkService.ts      # Infrastructure: Network I/O
│   ├── GameState.ts           # Domain: State management
│   ├── MotionState.ts         # Domain: Motion interpolation
│   ├── GameController.ts      # Application: Business logic
│   ├── WorldRenderer.ts       # Presentation: Sprite rendering
│   └── UICoordinator.ts       # Presentation: UI coordination
│
├── scenes/                 # Phaser scenes
│   ├── GameScene.ts           # Pure orchestrator
│   ├── gameConstants.ts       # Scene constants
│   └── types.ts               # Scene-specific types
│
├── ui/                     # UI components
│   ├── BaseUI.ts              # Base class for all UI
│   ├── HeaderUI.ts
│   ├── SidebarUI.ts
│   ├── VotePanelUI.ts
│   ├── EventFeedUI.ts
│   ├── AgentStatsUI.ts
│   ├── AIThinkingUI.ts
│   └── CameraControlUI.ts
│
└── utils/                  # Utility functions
    ├── CoordinateUtils.ts     # Coordinate transformations
    └── ResponsiveScaler.ts    # Responsive layout helpers
```

## Migration Guide: Old vs New Architecture

### Before (Issues)

```typescript
// ❌ GameScene managed cameras
this.uiCamera = this.cameras.add(...);

// ❌ GameScene had rendering logic
private drawObstacles(tileMap: TileMap) { ... }
private updateAgentSprites(agents) { ... }
private drawItems(items) { ... }

// ❌ GameScene directly accessed NetworkService
this.networkService.inspectAgent(agentId);

// ❌ Inconsistent initialization
this.cameraManager.initialize();  // CameraManager
this.uiCoordinator.create();      // UICoordinator
```

### After (Fixed)

```typescript
// ✅ CameraManager owns all cameras
this.cameraManager = new CameraManager(this, this.motionState);
this.cameraManager.initialize();
const uiCamera = this.cameraManager.getUICamera();

// ✅ WorldRenderer handles all rendering
this.worldRenderer = new WorldRenderer(this, uiCamera);
this.worldRenderer.updateAgentSprites(agents, motionStates);
this.worldRenderer.drawItems(items);

// ✅ GameScene uses GameController for business logic
this.gameController.selectAgent(agentId);

// ✅ Consistent initialization protocol
this.cameraManager.initialize();
this.worldRenderer.initialize();
this.uiCoordinator.create(); // Exception: UICoordinator uses .create()
```

## Testing Guidelines

### Unit Testing

Test managers in isolation:

```typescript
describe('WorldRenderer', () => {
  it('should create agent sprites', () => {
    const renderer = new WorldRenderer(mockScene, mockUICamera);
    renderer.initialize();
    renderer.updateAgentSprites(agents, motionStates);
    // Assertions
  });
});
```

### Integration Testing

Test layer interactions:

```typescript
describe('GameController + GameState', () => {
  it('should update state when agent selected', () => {
    const controller = new GameController(gameState, networkService);
    controller.selectAgent(5);
    expect(networkService.inspectAgent).toHaveBeenCalledWith(5);
  });
});
```

### E2E Testing

Test through GameScene:

```typescript
describe('GameScene', () => {
  it('should render agents from server data', () => {
    const scene = new GameScene();
    scene.create();
    // Simulate server update
    // Verify sprites rendered
  });
});
```

## Performance Considerations

### Rendering Optimization

1. **Lazy Animation Creation**: Animations created only when first agent sprite is created
2. **Sprite Pooling**: Sprites reused when agents respawn (future optimization)
3. **Batch Updates**: WorldRenderer processes all sprites in single pass
4. **Frame Throttling**: Motion events emitted only when state changes

### Memory Management

1. **Explicit Cleanup**: All managers implement `destroy()` method
2. **Sprite Lifecycle**: Dead agent sprites immediately destroyed
3. **Event Unsubscription**: All event listeners removed in `shutdown()`
4. **No Memory Leaks**: No circular references between layers

## Troubleshooting

### Common Issues

**Issue:** Sprites render but UI doesn't
- **Cause:** UI camera not ignoring world objects
- **Fix:** Ensure `WorldRenderer.registerGameObject()` is called

**Issue:** Input events not working
- **Cause:** Bypassing GameController
- **Fix:** Use `gameController.selectAgent()` not `networkService.inspectAgent()`

**Issue:** Rendering not updating
- **Cause:** State events not subscribed
- **Fix:** Check `setupStateListeners()` in GameScene

**Issue:** Build fails with "X is not defined"
- **Cause:** Manager not initialized in correct order
- **Fix:** Follow initialization order in `GameScene.create()`

## Future Enhancements

1. **Sprite Pooling**: Reuse sprite objects for better performance
2. **LOD System**: Reduce detail for distant sprites
3. **Render Batching**: Group sprite draws for better GPU utilization
4. **State Serialization**: Save/load game state for replays
5. **Multi-Scene Support**: Split UI and game into separate Phaser scenes

---

**Last Updated:** 2026-02-18
**Version:** 1.0
**Author:** AI Battle Royale Team
