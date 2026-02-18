# Game Architecture

This document describes the 4-layer architecture used in the game client.

## Overview

The game follows a clean 4-layer architecture to separate concerns and improve maintainability:

```
┌─────────────────────────────────────────────────────────┐
│              Layer 1: Phaser Scene                      │
│                   (GameScene)                           │
│  - Pure orchestrator                                    │
│  - Initializes managers                                 │
│  - Dispatches update() to managers                      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Layer 2: Managers                          │
│  - CameraManager: Camera controls & viewport            │
│  - WorldRenderer: World rendering (agents, items, etc.) │
│  - UIManager: UI components & layout                    │
│  - GameStateManager: State management & events          │
│  - NetworkManager: Socket.IO communication              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Layer 3: Specialized Components            │
│  - GameSceneRenderer: Graphics rendering (zones, etc.)  │
│  - AgentDisplayStateManager: Animation interpolation    │
│  - UI Components: Individual UI elements                │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Layer 4: Utilities & Constants             │
│  - ResponsiveScaler: Layout calculations                │
│  - Game constants: CELL_SIZE, GRID_SIZE, etc.           │
│  - Assets: Sprite keys and configurations               │
└─────────────────────────────────────────────────────────┘
```

## Layer 1: GameScene (Orchestrator)

**Responsibility:** Pure Phaser Scene orchestrator

The `GameScene` class is intentionally kept minimal. It only:

1. **Initializes managers** in `create()`:
   ```typescript
   create(): void {
     // 1. Construct managers
     this.stateManager = new GameStateManager();
     this.networkManager = new NetworkManager(this.stateManager);
     this.cameraManager = new CameraManager(this, this.cameras.main);
     this.worldRenderer = new WorldRenderer(this);
     this.uiManager = new UIManager(...);
     
     // 2. Initialize all managers (consistent protocol)
     this.cameraManager.initialize();
     this.worldRenderer.initialize();
     this.uiManager.initialize();
     
     // 3. Connect to server
     this.networkManager.connect();
     
     // 4. Setup state listeners
     this.setupStateListeners();
   }
   ```

2. **Dispatches updates** in `update()`:
   ```typescript
   update(time: number, delta: number): void {
     // Update managers
     this.cameraManager.update();
     this.displayStateManager.tick(delta, agents);
     this.worldRenderer.updateAgentSprites(agents, displayStates);
     this.worldRenderer.drawItems(items);
     this.uiManager.update(time, delta);
   }
   ```

**Does NOT:**
- Directly manipulate Phaser objects (sprites, graphics) beyond basic setup
- Contain rendering logic
- Handle complex game logic
- Store sprite references

## Layer 2: Managers

### CameraManager

**Responsibility:** Camera controls and viewport management

- Main camera (world view) and PiP camera (close-up view)
- Zoom, pan, drag controls
- Keyboard and mouse input for camera
- Dual camera mode toggle

**Initialization:** `initialize()` method sets up camera bounds, zoom, and input handlers

### WorldRenderer

**Responsibility:** World-related rendering

- Agent sprites and animations
- Obstacles (rocks, terrain)
- Items (resources)
- Manages sprite lifecycles (create, update, destroy)

**Key Methods:**
- `updateAgentSprites()`: Updates agent sprite positions and animations
- `drawObstacles()`: Renders obstacle sprites from tilemap
- `drawItems()`: Renders item sprites

**Initialization:** `initialize()` method prepares animations (lazy-loaded on first use)

### UIManager

**Responsibility:** UI components orchestration

- Creates and manages all UI components
- Handles responsive scaling
- Forwards state updates to UI components

**UI Components:**
- HeaderUI (top bar)
- SidebarUI (left panel)
- VotePanelUI (right top)
- AgentStatsUI (right middle)
- EventFeedUI (right bottom)
- AIThinkingUI (bottom center)
- CameraControlUI (top left)

**Initialization:** `initialize()` method creates all UI components with proper layout

### GameStateManager

**Responsibility:** State management and event emission

- Centralized game state storage
- Event-based state updates
- No Phaser dependencies (pure data management)

**State includes:**
- Agents, items, events
- World data (tick, border, etc.)
- Votes, selected agent
- Thinking history

### NetworkManager

**Responsibility:** Server communication

- Socket.IO connection management
- Receives server updates and forwards to GameStateManager
- Sends client actions (votes, agent inspection)

**Key Methods:**
- `connect()`: Establishes Socket.IO connection
- `inspectAgent()`: Requests agent details
- `submitVote()`: Sends vote to server

## Layer 3: Specialized Components

### GameSceneRenderer

**Responsibility:** Graphics-based rendering (lines, shapes)

Handles drawing that uses Phaser Graphics objects:
- Grid
- Safe zone
- Connection lines between nearby agents
- Alliance/enemy lines

### AgentDisplayStateManager

**Responsibility:** Smooth agent movement interpolation

- Interpolates agent positions between server updates
- Manages agent paths and movement progress
- Handles facing direction

### UI Components

Individual UI elements that extend `BaseUI`:
- Each has its own container
- Implements `create()` for initialization
- Implements `update()` for frame updates
- Self-contained rendering logic

## Layer 4: Utilities & Constants

- `ResponsiveScaler`: Calculates responsive layout dimensions
- `gameConstants`: CELL_SIZE, GRID_SIZE, CANVAS_SIZE
- `Assets`: Sprite key definitions and configurations

## Initialization Protocol

All managers follow a consistent initialization pattern:

```typescript
class Manager {
  constructor(...dependencies) {
    // Store dependencies only
    // NO initialization logic here
  }
  
  initialize(): void {
    // Perform all initialization here
    // Setup event listeners
    // Create Phaser objects
  }
  
  destroy(): void {
    // Cleanup resources
  }
}
```

This ensures:
1. Clear separation between construction and initialization
2. Explicit initialization order in GameScene
3. Testability (can construct without side effects)

## Input Handling

Input is handled at the appropriate layer:

- **Camera controls** (drag, zoom): `CameraManager`
- **UI interactions** (buttons, clicks): Individual UI components
- **World interactions** (agent selection): `GameScene` → `NetworkManager`

The GameScene delegates to managers but retains coordination responsibility for
world interactions that span multiple managers.

## State Flow

```
Server (Socket.IO)
    ↓
NetworkManager
    ↓
GameStateManager (emits events)
    ↓
┌───────────────┬──────────────┬─────────────┐
│               │              │             │
▼               ▼              ▼             ▼
UIManager   WorldRenderer  GameScene    CameraManager
```

State always flows through GameStateManager, which emits events. Other components
subscribe to these events and react accordingly.

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has clear responsibilities
2. **Testability**: Managers can be tested independently
3. **Maintainability**: Changes to one layer don't affect others
4. **Scalability**: Easy to add new managers or components
5. **Clear Data Flow**: State updates follow a predictable path

## Migration Notes

Previous versions of GameScene:
- ❌ Directly created and managed sprite maps
- ❌ Contained rendering methods (drawObstacles, drawItems, updateAgentSprites)
- ❌ Mixed orchestration with implementation
- ❌ Had inconsistent initialization (some managers used .create(), others .initialize())

Current version:
- ✅ Pure orchestrator - only initializes and dispatches
- ✅ All rendering delegated to WorldRenderer
- ✅ Consistent initialization protocol across all managers
- ✅ Clean separation between layers
