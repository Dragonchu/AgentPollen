# AI Battle Royale - Claude Context

## Quick Start

```bash
# Install dependencies
pnpm install

# Development (runs all packages in watch mode)
pnpm dev

# Run packages individually
pnpm dev:server   # Game server on ws://localhost:3001
pnpm dev:web      # Next.js on http://localhost:3000

# Build for production
pnpm build

# Clean all build artifacts
pnpm clean
```

## Architecture

### Monorepo Structure (pnpm workspace)

```
packages/
├── shared/    ← Types, interfaces, constants (shared by server & web)
├── server/    ← Game simulation + Socket.IO server
└── web/       ← Next.js frontend with Phaser game engine
```

**Critical**: This is a **pnpm workspace**. Dependencies between packages MUST use `workspace:*`:
```json
"dependencies": {
  "@battle-royale/shared": "workspace:*"
}
```

### Web Package: Phaser-First Architecture

**IMPORTANT**: The web package uses a 4-layer architecture (Infrastructure → Domain → Application → Presentation).

```
React (container only)
  └─ GameCanvas (Phaser wrapper)
     └─ GameScene (orchestrates everything)
        ├─ GameController (业务逻辑层 - Application)
        ├─ GameState (状态层 - Domain)
        ├─ MotionState (动画状态 - Domain)
        ├─ NetworkService (网络层 - Infrastructure)
        ├─ UICoordinator (UI 协调层 - Presentation)
        ├─ CameraManager (相机管理)
        └─ Sprite objects (agents, items, obstacles)
```

**Key Files**:
- `packages/web/src/game/scenes/GameScene.ts` - Main Phaser scene
- `packages/web/src/game/managers/GameController.ts` - Business logic layer
- `packages/web/src/game/managers/GameState.ts` - Domain state + events
- `packages/web/src/game/managers/NetworkService.ts` - Socket.IO wrapper
- `packages/web/src/game/managers/UICoordinator.ts` - UI component orchestration
- `packages/web/src/game/managers/MotionState.ts` - Agent motion interpolation
- `packages/web/src/game/managers/CameraManager.ts` - Dual camera system
- `packages/web/src/game/ui/*.ts` - Phaser UI components (NOT React)

### Server Package: Game Engine

**Key Files**:
- `packages/server/src/index.ts` - Entry point, game loop
- `packages/server/src/engine/World.ts` - World state, tick loop
- `packages/server/src/engine/Agent.ts` - Agent entity
- `packages/server/src/plugins/` - Decision engines (rule-based, LLM)
- `packages/server/src/network/SyncManager.ts` - Socket.IO broadcasting

## Gotchas & Critical Warnings

### 1. React vs Phaser Ownership
**DO NOT** add game logic to React components. React is purely a container.
- ❌ Don't manage game state in React hooks
- ❌ Don't pass props to GameCanvas (it takes no props)
- ✅ All game state lives in GameStateManager (Phaser)
- ✅ Use custom events for state changes

### 2. Legacy React Components (Safe to Delete)
These React files are obsolete and can be deleted (Phaser equivalents exist):
- `packages/web/src/lib/useGameSocket.ts`
- `packages/web/src/components/Header.tsx`
- `packages/web/src/components/Sidebar.tsx`
- `packages/web/src/components/VotePanel.tsx`
- `packages/web/src/components/EventFeed.tsx`
- `packages/web/src/components/AgentStats.tsx`
- `packages/web/src/components/AIThinkingProcess.tsx`
- `packages/web/src/components/Leaderboard.tsx`

All these are now Phaser components in `packages/web/src/game/ui/`.

### 3. Coordinate Systems (Phaser)
Three coordinate systems exist:
- **Screen Coords**: Canvas pixels (e.g., UI positions)
- **World Coords**: Phaser world space (CELL_SIZE * grid position)
- **Grid Coords**: Logical game grid (from server)

Use `CoordinateUtils` for conversions (`packages/web/src/game/utils/CoordinateUtils.ts`).

### 4. Camera System
Dual camera setup:
- **Main camera**: World view with pan/zoom
- **UI camera**: Fixed layer for UI components
- CameraManager handles both, including PiP mode

See `COORDINATE_SYSTEM_ANALYSIS.md` for details.

### 4.5. 4-Layer Architecture (Feb 2026 Refactor)

```
┌─────────────────────────────────────┐
│   Presentation Layer                │
│   - UICoordinator, UI Components    │
├─────────────────────────────────────┤
│   Application/Business Logic        │
│   - GameController                  │
├─────────────────────────────────────┤
│   Domain/State Layer                │
│   - GameState, MotionState          │
├─────────────────────────────────────┤
│   Infrastructure Layer              │
│   - NetworkService                  │
└─────────────────────────────────────┘
```

**Dependency Rules**:
- UI components → GameController only
- GameController → GameState + NetworkService
- GameState → NetworkService
- Single-direction dependencies (no circular refs)

### 5. Socket.IO Protocol
**Always use GameController**, not direct Socket.IO or NetworkService:
```typescript
// ✅ Correct
gameController.submitVote(agentId, action);
gameController.selectAgent(agentId);

// ❌ Wrong
socket.emit("vote:submit", { agentId, action });
networkService.submitVote(agentId, action); // Skip business logic layer
```

## Code Style

### TypeScript
- Strict mode enabled
- Use explicit types for function parameters
- Use `type` for unions, `interface` for objects

### Phaser Patterns
- Extend `BaseUI` for all UI components (`packages/web/src/game/ui/BaseUI.ts`)
- Lifecycle: `create()` → `update(time, delta)` → `destroy()`
- Use `scene.add.existing()` for custom objects

### Event System
GameState uses Phaser.Events.EventEmitter:
```typescript
// Subscribe (from UI components)
gameController.getGameState().on("state:agents:updated", (agents) => {
  // handle update
});

// Emit (within GameState)
this.emit("state:agents:updated", this.agents);

// Cleanup
gameController.getGameState().off("state:agents:updated", handler, context);
```

## Environment Variables

### Server (.env)
```bash
PORT=3001                           # WebSocket port
AGENT_COUNT=10                      # Number of agents
TICK_INTERVAL=1000                  # Ms between ticks
CORS_ORIGIN=*                       # CORS origin (* for dev, URL for prod)
AI_ENGINE=rule-based                # "rule-based" or "llm"
DEEPSEEK_API_KEY=sk-...            # Required if AI_ENGINE=llm
DEEPSEEK_MODEL=deepseek-chat        # Optional
DEEPSEEK_MAX_CONCURRENCY=10         # Optional
```

### Web (.env.local)
```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

## Testing & Deployment

### Local Testing
1. Start server: `pnpm dev:server`
2. Start web: `pnpm dev:web`
3. Open http://localhost:3000
4. Check console for Socket.IO connection

### Production (Railway)
See README "Deployment" section for CORS configuration.

**Critical**: Set `CORS_ORIGIN` to your web app URL in production.

## Recent Changes (Feb 2026)

### 4-Layer Architecture Refactor (Feb 18, 2026)
- **Status**: Complete ✅
- **Impact**: Introduced business logic layer (GameController)
- **Changes**:
  - Renamed: `GameStateManager` → `GameState`
  - Renamed: `NetworkManager` → `NetworkService`
  - Renamed: `UIManager` → `UICoordinator`
  - Renamed: `AgentDisplayStateManager` → `MotionState`
  - Added: `GameController` (Application layer)
- **Benefits**: Clear separation of concerns, single-direction dependencies

### Major Refactoring: React → Phaser
- **Status**: Complete ✅
- **Impact**: React no longer manages game state
- **Details**: See `REFACTORING_COMPLETE.md`
- **Files created**: 12 new files in `packages/web/src/game/`
- **Files modified**: 4 core files
- **Files to delete**: 8 old React components

### New Features
- ✅ Pathfinding (A* algorithm)
- ✅ Dual camera system (main + PiP)
- ✅ LLM decision engine (DeepSeek integration)
- ✅ 6 Phaser UI components

## Documentation

- `README.md` - Project overview, features, roadmap
- `PATHFINDING.md` - Pathfinding system details
- `COORDINATE_SYSTEM_ANALYSIS.md` - Camera coordinate systems
- `DUAL_CAMERA_SUMMARY.md` - Dual camera implementation
- `REFACTORING_COMPLETE.md` - Feb 2026 refactoring summary
- `PHASE_5_TESTING.md` - Testing checklist (50+ test cases)

## Common Tasks

### Add New UI Component
1. Extend `BaseUI` in `packages/web/src/game/ui/YourUI.ts`
2. Implement `create()`, `update()`, `destroy()`
3. Accept `GameController` in constructor
4. Add to `UICoordinator.create()` with positioning
5. Subscribe to state events via `gameController.getGameState().on(...)`

### Add New Decision Engine
1. Implement `DecisionEngine` interface from `@battle-royale/shared`
2. Create in `packages/server/src/plugins/YourEngine.ts`
3. Add to `createDecisionEngine()` in `packages/server/src/index.ts`

### Modify Game State
1. Update types in `packages/shared/src/index.ts`
2. Run `pnpm --filter shared build` (builds types)
3. Update server code in `packages/server/src/`
4. Update client code in `packages/web/src/game/managers/GameState.ts`
5. If adding business logic, update `packages/web/src/game/managers/GameController.ts`
