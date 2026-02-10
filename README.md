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
│       │   ├── RuleBasedEngine.ts    ← MVP: simple heuristics
│       │   └── LLMEngine.stub.ts     ← Production: Claude/GPT integration
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

### 1. Decision Engine → LLM
Replace `RuleBasedEngine` with an LLM-backed engine:
```typescript
// See plugins/LLMEngine.stub.ts for the template
const engine = new LLMEngine({ apiKey: "sk-..." });
const world = new World(config, engine);
```

### 2. Full Sync → Delta Sync
In `SyncManager.broadcastTick()`, switch to delta mode:
```typescript
// Uncomment the delta path in SyncManager.ts
const delta = this.world.computeAgentDelta();
if (delta.length > 0) {
  this.io.emit("sync:agents", { tick: this.world.tick, changes: delta });
}
```

### 3. Canvas 2D → Phaser
Replace `GameCanvas.tsx` with a Phaser scene:
- Create Phaser.Game in a React wrapper
- Map agent properties to sprite sheets
- Add animations for combat, death, zone shrink

### 4. In-Memory → Persistent Storage
Implement `PersistenceProvider` interface with Redis/PostgreSQL:
```typescript
// See persistence/PersistenceProvider.ts for the interface
const persistence = new RedisPersistence(process.env.REDIS_URL);
```

### 5. Custom Agent Templates
Add new agent types via `AgentFactory`:
```typescript
factory.addTemplate({
  name: "Assassin",
  personality: "silent",
  description: "Strikes from the shadows",
  baseStats: { hp: 70, attack: 18, defense: 2 },
});
```

### 6. Vote System Enhancements
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

**Web** (`packages/web/.env.local`):
- `NEXT_PUBLIC_SERVER_URL` - Server URL (default: http://localhost:3001)
