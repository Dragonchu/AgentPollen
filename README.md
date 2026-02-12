# AI Battle Royale

100 AI agents. One world. Players vote to influence the outcome.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run both server and web in dev mode
pnpm dev

# Or run separately
pnpm dev:server   # Game server on ws://localhost:3001
pnpm dev:web      # Next.js on http://localhost:3000
```

## Architecture

```
packages/
├── shared/          ← Types, interfaces, constants (shared by server & web)
│   └── src/index.ts
│
├── server/          ← Game simulation + Socket.IO server
│   └── src/
│       ├── index.ts              ← Entry point, game loop
│       ├── engine/               ← Core simulation
│       │   ├── World.ts          ← World state, tick loop, event system
│       │   ├── Agent.ts          ← Agent entity, perception, movement
│       │   ├── AgentFactory.ts   ← Extensible agent creation
│       │   ├── MemoryStream.ts   ← Agent memory with retrieval scoring
│       │   └── VoteManager.ts    ← Windowed vote aggregation
│       ├── plugins/              ← Decision engine plugins
│       │   ├── RuleBasedEngine.ts    ← Simple heuristics (default)
│       │   └── LLMEngine.ts          ← DeepSeek LLM integration
│       ├── network/
│       │   └── SyncManager.ts    ← Socket.IO broadcasting
│       └── persistence/
│           └── PersistenceProvider.ts  ← Save/restore world state
│
└── web/             ← Next.js frontend
    └── src/
        ├── app/
        │   ├── layout.tsx        ← Root layout
        │   └── page.tsx          ← Main game dashboard
        ├── components/
        │   ├── VotePanel.tsx     ← Voting UI (quick actions + custom)
        │   ├── AgentDetail.tsx   ← Agent inspector (stats, memory)
        │   ├── EventFeed.tsx     ← Scrolling event log
        │   └── Leaderboard.tsx   ← Agent rankings
        ├── game/
        │   └── GameCanvas.tsx    ← Game renderer (Canvas 2D → Phaser)
        └── lib/
            └── useGameSocket.ts  ← Socket.IO client hook
```

## Extension Roadmap

### 1. Decision Engine → LLM (✅ IMPLEMENTED)

The game now supports **two AI decision engines**:

#### Rule-Based Engine (Default)
Simple heuristic AI that works without any API keys. Good for development and testing.

```bash
# .env
AI_ENGINE=rule-based
```

#### LLM Engine with DeepSeek
Intelligent AI powered by DeepSeek's language models. Provides more dynamic and human-like agent behavior.

```bash
# .env
AI_ENGINE=llm
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_MODEL=deepseek-chat           # Optional, default: deepseek-chat
DEEPSEEK_MAX_CONCURRENCY=10            # Optional, default: 10
```

**Features:**
- ✅ DeepSeek integration via OpenAI-compatible API
- ✅ Automatic fallback to rule-based engine on errors
- ✅ Rate limiting with configurable concurrency
- ✅ Context-aware prompting with agent personality and memories
- ✅ Extensible architecture for other LLM providers

**Getting a DeepSeek API Key:**
1. Visit [https://platform.deepseek.com/](https://platform.deepseek.com/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Add it to your `.env` file

**Extending to Other LLMs:**
The architecture is designed to be extensible. To add support for other LLM providers:

```typescript
// packages/server/src/plugins/YourEngine.ts
import {
  DecisionEngine,
  DecisionContext,
  ReflectionContext,
  Decision,
} from "@battle-royale/shared";

export class YourEngine implements DecisionEngine {
  readonly name = "your-engine";
  
  async decide(ctx: DecisionContext): Promise<Decision> {
    // Your implementation here
  }
  
  async reflect(ctx: ReflectionContext): Promise<string | null> {
    // Your implementation here
  }
}
```

Then update `createDecisionEngine()` in `packages/server/src/index.ts` to support your new engine.

### 2. Pathfinding System (✅ IMPLEMENTED)

The game now includes server-side pathfinding with A* algorithm and tile-based maps.

**Features:**
- ✅ A* pathfinding algorithm for optimal path calculation
- ✅ Tile-based map system with passable/blocked tiles
- ✅ Binary map storage format (efficient persistence)
- ✅ Plugin-based architecture for both pathfinding and storage
- ✅ Automatic obstacle avoidance during agent movement
- ✅ Path broadcasting to clients via Socket.IO

**How It Works:**
- Maps use a 2D grid where each tile can be passable or blocked
- Server calculates optimal paths using A* when agents need to move
- Agents follow waypoint paths one step at a time
- Clients receive waypoint data for smooth movement visualization

See [PATHFINDING.md](./PATHFINDING.md) for detailed documentation.

### 3. Full Sync → Delta Sync
In `SyncManager.broadcastTick()`, switch to delta mode:
```typescript
// Uncomment the delta path in SyncManager.ts
const delta = this.world.computeAgentDelta();
if (delta.length > 0) {
  this.io.emit("sync:agents", { tick: this.world.tick, changes: delta });
}
```

### 4. Canvas 2D → Phaser
Replace `GameCanvas.tsx` with a Phaser scene:
- Create Phaser.Game in a React wrapper
- Map agent properties to sprite sheets
- Add animations for combat, death, zone shrink

### 5. In-Memory → Persistent Storage
Implement `PersistenceProvider` interface with Redis/PostgreSQL:
```typescript
// See persistence/PersistenceProvider.ts for the interface
const persistence = new RedisPersistence(process.env.REDIS_URL);
```

### 6. Custom Agent Templates
Add new agent types via `AgentFactory`:
```typescript
factory.addTemplate({
  name: "Assassin",
  personality: "silent",
  description: "Strikes from the shadows",
  baseStats: { hp: 70, attack: 18, defense: 2 },
});
```

### 7. Vote System Enhancements
The `VoteManager` supports extension via:
- Vote weighting (modify `submitVote`)
- Anti-spam (add cooldowns per playerId)
- Vote categories (extend `Vote` type in shared)

## Socket.IO Protocol

| Direction | Event | Payload | When |
|-----------|-------|---------|------|
| S→C | `sync:full` | Full world state | On connect |
| S→C | `sync:world` | `{ tick, alive, border, phase }` | Every tick |
| S→C | `sync:agents` | `{ tick, changes[] }` | Every tick |
| S→C | `sync:events` | `GameEvent[]` | When events occur |
| S→C | `sync:paths` | `{ paths: Record<agentId, waypoints[]> }` | Every tick |
| S→C | `vote:state` | Vote tallies + timer | Every tick |
| S→C | `agent:detail` | Full agent info | On request/follow |
| C→S | `vote:submit` | `{ agentId, action }` | Player votes |
| C→S | `agent:inspect` | `agentId` | Player clicks agent |
| C→S | `agent:follow` | `agentId \| null` | Auto-update detail |

## Environment Variables

**Server** (`packages/server/.env`):
- `PORT` - WebSocket port (default: 3001)
- `AGENT_COUNT` - Number of agents (default: 10)
- `TICK_INTERVAL` - Ms between ticks (default: 1000)
- `CORS_ORIGIN` - Allowed origin for CORS (default: "*")
  - Development: use "*" to allow all origins
  - Production: set to your frontend URL (e.g., "https://your-app.railway.app")
- `AI_ENGINE` - Decision engine to use: "rule-based" or "llm" (default: "rule-based")
- `DEEPSEEK_API_KEY` - DeepSeek API key (required if AI_ENGINE=llm)
- `DEEPSEEK_MODEL` - Model to use (default: "deepseek-chat")
- `DEEPSEEK_MAX_CONCURRENCY` - Max concurrent LLM calls (default: 10)

**Web** (`packages/web/.env.local`):
- `NEXT_PUBLIC_SERVER_URL` - Server URL (default: http://localhost:3001)

## Deployment

### Recommended: Caddy Reverse Proxy (CORS-Free)

**Best practice for production:** Deploy both services behind Caddy to completely eliminate CORS issues by serving everything under one domain.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete guide.

**Quick start with Docker Compose:**

```bash
# Copy environment template
cp .env.example .env

# Start all services (Caddy + Server + Web)
docker-compose up -d

# Access the app
open http://localhost/arena
```

Benefits:
- ✅ Zero CORS configuration needed
- ✅ Single domain for all services
- ✅ Automatic HTTPS with Let's Encrypt
- ✅ WebSocket support out of the box
- ✅ Production-ready setup

### Alternative: Railway Deployment

When deploying the server and web frontend on separate Railway services:

1. **Server Configuration:**
   - Set environment variable: `CORS_ORIGIN=https://your-web-app.railway.app`
   - Alternatively, use `CORS_ORIGIN=*` to allow all origins (less secure)
   - The server will automatically use the Railway-provided PORT

2. **Web Configuration:**
   - Set environment variable: `NEXT_PUBLIC_SERVER_URL=https://your-server.railway.app`
   - Rebuild the web app after setting this variable

This ensures proper CORS configuration for cross-origin Socket.IO connections.
