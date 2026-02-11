# Copilot Instructions for AI Battle Royale

## Repository Overview

This is **AI Battle Royale** - a multiplayer game simulation where 100 AI agents compete in a shrinking world while players vote to influence the outcome. The project is a TypeScript-based monorepo using pnpm workspaces with three packages: shared types, game server, and Next.js web frontend.

**Repository Stats:**
- **Project Type:** Game simulation with real-time multiplayer
- **Languages:** TypeScript (100%)
- **Frameworks:** Next.js 15 (frontend), Socket.IO (networking)
- **Package Manager:** pnpm with workspaces
- **Runtime:** Node.js (server), Browser (web)
- **Build Tool:** TypeScript compiler (tsc), Next.js build system

## Build and Development Instructions

### Prerequisites
- Node.js (tested with v18+)
- pnpm package manager (install with `npm install -g pnpm`)

### Installation
**ALWAYS run `pnpm install` first** before any other commands. This installs dependencies for all workspace packages.

```bash
pnpm install
```

### Building the Project
The build process must run in the correct order: shared → server → web

```bash
# Build all packages (runs in correct order automatically)
pnpm build

# This executes:
# 1. pnpm --filter shared build   (compiles TypeScript types)
# 2. pnpm --filter server build   (compiles game server)
# 3. pnpm --filter web build      (builds Next.js production bundle)
```

**Build time:** Full build takes approximately 10-15 seconds.

**Build artifacts:**
- `packages/shared/dist/` - Compiled shared types
- `packages/server/dist/` - Compiled server code
- `packages/web/.next/` - Next.js build output

All build artifacts are gitignored (see `.gitignore`).

### Development Mode
For active development, use the dev scripts which enable hot-reload:

```bash
# Run both server and web in parallel
pnpm dev

# Or run separately in different terminals:
pnpm dev:server   # Game server with tsx watch on ws://localhost:3001
pnpm dev:web      # Next.js dev server on http://localhost:3000
```

The `dev` command uses `concurrently` to run both processes. The server auto-restarts on code changes (via tsx watch), and Next.js enables Fast Refresh for frontend changes.

### Running Production Build
```bash
# After building
pnpm --filter server start  # Runs node dist/index.js
pnpm --filter web start     # Runs Next.js production server
```

### Type Checking
```bash
# Check types for shared package only
pnpm --filter shared typecheck
```

## Project Architecture

### Monorepo Structure
```
/
├── .github/                    ← GitHub configuration
├── packages/
│   ├── shared/                 ← Shared TypeScript types and interfaces
│   │   ├── src/index.ts        ← Single source file with all types
│   │   ├── package.json        ← Exports types, no runtime code
│   │   └── tsconfig.json
│   │
│   ├── server/                 ← Game simulation + Socket.IO server
│   │   ├── src/
│   │   │   ├── index.ts        ← Entry point, game loop initialization
│   │   │   ├── engine/         ← Core game simulation logic
│   │   │   │   ├── World.ts          ← World state, tick loop, events
│   │   │   │   ├── Agent.ts          ← Agent entity, movement, combat
│   │   │   │   ├── AgentFactory.ts   ← Agent creation and templating
│   │   │   │   ├── MemoryStream.ts   ← Agent memory with retrieval
│   │   │   │   └── VoteManager.ts    ← Vote aggregation system
│   │   │   ├── plugins/        ← Decision engine implementations
│   │   │   │   ├── RuleBasedEngine.ts    ← Current: heuristic AI
│   │   │   │   └── LLMEngine.stub.ts     ← Future: LLM integration
│   │   │   ├── network/
│   │   │   │   └── SyncManager.ts    ← Socket.IO broadcasting
│   │   │   └── persistence/
│   │   │       └── PersistenceProvider.ts ← Save/restore interface
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    ← Next.js 15 frontend
│       ├── src/
│       │   ├── app/            ← Next.js app router
│       │   │   ├── layout.tsx        ← Root layout
│       │   │   └── page.tsx          ← Main game dashboard
│       │   ├── components/     ← React components
│       │   │   ├── VotePanel.tsx     ← Voting UI
│       │   │   ├── AgentDetail.tsx   ← Agent inspector
│       │   │   ├── EventFeed.tsx     ← Event log
│       │   │   └── Leaderboard.tsx   ← Rankings
│       │   ├── game/
│       │   │   └── GameCanvas.tsx    ← Canvas 2D renderer
│       │   └── lib/
│       │       └── useGameSocket.ts  ← Socket.IO client hook
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.mjs     ← Next.js configuration
│
├── package.json                ← Root package with workspace scripts
├── pnpm-workspace.yaml         ← Workspace configuration
├── tsconfig.json               ← Base TypeScript config
├── .gitignore                  ← Ignores node_modules, dist, .next, .env*
└── README.md                   ← Quick start and architecture guide
```

### Key Configuration Files
- **`pnpm-workspace.yaml`**: Defines the workspace packages (`packages/*`)
- **`tsconfig.json`**: Base TypeScript config extended by all packages
- **`packages/*/tsconfig.json`**: Package-specific TypeScript settings
- **`packages/web/next.config.mjs`**: Next.js configuration
- **`.gitignore`**: Excludes `node_modules/`, `dist/`, `.next/`, `.env*`, `*.tsbuildinfo`

### Environment Variables
**Server** (optional, create `packages/server/.env`):
- `PORT` - WebSocket server port (default: 3001)
- `AGENT_COUNT` - Number of agents to spawn (default: 10)
- `TICK_INTERVAL` - Milliseconds between ticks (default: 1000)

**Web** (optional, create `packages/web/.env.local`):
- `NEXT_PUBLIC_SERVER_URL` - Server WebSocket URL (default: http://localhost:3001)

### Dependencies and Package Management

**Important:** This project uses **pnpm workspaces**. Always use `pnpm` commands, not `npm` or `yarn`.

**Workspace references:**
- Server and web packages depend on `@battle-royale/shared` using `workspace:*` protocol
- This ensures they always use the local shared package, not a published version

**Adding dependencies:**
```bash
# Add to specific package
pnpm --filter server add <package-name>
pnpm --filter web add <package-name>
pnpm --filter shared add -D <package-name>

# Add to root (dev dependencies only)
pnpm add -D -w <package-name>
```

## Socket.IO Protocol

The server and client communicate via Socket.IO events. All event types are defined in `packages/shared/src/index.ts`.

**Server → Client events:**
- `sync:full` - Full world state (on connect)
- `sync:world` - World tick update (tick, alive count, border, phase)
- `sync:agents` - Agent position/state changes (delta updates)
- `sync:events` - Game events (kills, alliances, etc.)
- `sync:items` - Item spawns/removals
- `vote:state` - Vote tallies and timer
- `agent:detail` - Full agent info (on demand)

**Client → Server events:**
- `vote:submit` - Player submits vote
- `agent:inspect` - Request agent details
- `agent:follow` - Subscribe to agent updates

## Testing and Validation

**Current State:** No automated tests exist in this repository yet.

**Manual Validation:**
1. Run `pnpm install` to ensure clean dependency state
2. Run `pnpm build` to verify TypeScript compilation succeeds
3. Run `pnpm dev` to start both server and web in development mode
4. Open browser to `http://localhost:3000` to verify:
   - Game canvas renders
   - Agents are visible and moving
   - Vote panel is functional
   - Events appear in feed
   - Leaderboard updates

**Expected behavior:**
- Server should log "Game server running on port 3001" (or configured PORT)
- Web should show "ready - started server on 0.0.0.0:3000"
- Browser should connect to server via WebSocket and display game state

## Common Issues and Workarounds

### pnpm not found
**Error:** `bash: pnpm: command not found`  
**Solution:** Install pnpm globally: `npm install -g pnpm`

### Build order dependency issues
**Error:** Build fails with import errors from `@battle-royale/shared`  
**Solution:** Always build shared first. Use `pnpm build` which handles the correct order.

### Port already in use
**Error:** Server fails to start with "EADDRINUSE"  
**Solution:** Kill the process using the port or change PORT environment variable

### Next.js cache issues
**Issue:** Changes not reflecting in web build  
**Solution:** Delete `.next` directory and rebuild: `rm -rf packages/web/.next && pnpm --filter web build`

### TypeScript errors in IDE but build succeeds
**Cause:** IDE may be using different TypeScript version  
**Solution:** Ensure workspace TypeScript version (5.7.0) is used in IDE settings

## Code Style and Conventions

- **No linting configured:** There are no ESLint or Prettier configs in this repository
- **TypeScript strict mode:** Not explicitly enabled in tsconfig
- **Formatting:** No enforced style, follow existing patterns
- **Imports:** Use ES modules (`import/export`), not CommonJS
- **Type exports:** All shared types exported from single `packages/shared/src/index.ts`

## Extension Points

The codebase is designed for extension:

1. **Decision Engines:** Implement the engine interface in `packages/server/src/plugins/`
2. **Agent Templates:** Add new agent types via `AgentFactory.addTemplate()`
3. **Persistence:** Implement `PersistenceProvider` interface for save/restore
4. **Vote System:** Extend `Vote` type in shared and add handling in `VoteManager`
5. **Rendering:** Replace Canvas 2D in `GameCanvas.tsx` with Phaser scene

## Key Implementation Details

### Agent Memory System
Agents have a `MemoryStream` that stores observations, reflections, plans, and inner voice. Memories have importance scores and retrieval uses recency + importance weighting.

### Vote Aggregation
`VoteManager` aggregates votes in windows (default: 10 seconds). Votes are tallied per agent and broadcast to all clients.

### World Tick Loop
The main game loop runs every `TICK_INTERVAL` ms (default: 1000ms). Each tick:
1. Processes agent decisions
2. Updates agent positions and states
3. Handles combat and interactions
4. Broadcasts delta updates to clients

### Sync Strategy
Currently uses full sync on connect + delta sync for agent changes. Future optimization: compute minimal diffs in `SyncManager.broadcastTick()`.

## Best Practices for Coding Agent

1. **Trust these instructions.** Search only if information is incomplete or incorrect.
2. **Use pnpm, not npm or yarn** for all package management operations.
3. **Always run pnpm install first** before building or running commands.
4. **Build in order:** shared → server → web (or use `pnpm build` which does this automatically).
5. **Check package.json scripts** in each package for available commands before attempting manual builds.
6. **Shared types are the contract:** When modifying Socket.IO protocol, update types in shared package first.
7. **Development vs Production:** Use dev scripts for testing changes (hot reload), use build + start for production validation.
8. **Dependencies between packages:** Server and web import from shared via workspace reference, not relative paths.
