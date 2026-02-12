import { Server } from "socket.io";
import {
  GamePhase,
  type ServerToClientEvents,
  type ClientToServerEvents,
  DecisionEngine,
  PathfindingEngine,
} from "@battle-royale/shared";
import { World } from "./engine/World.js";
import { RuleBasedEngine } from "./plugins/RuleBasedEngine.js";
import { LLMEngine } from "./plugins/LLMEngine.js";
import { SyncManager } from "./network/SyncManager.js";
import { AStarPathfinder } from "./pathfinding/AStarPathfinder.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const AGENT_COUNT = parseInt(process.env.AGENT_COUNT ?? "10", 10);
const TICK_INTERVAL = parseInt(process.env.TICK_INTERVAL ?? "1000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const AI_ENGINE = process.env.AI_ENGINE ?? "rule-based";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

// Parse and validate DEEPSEEK_MAX_CONCURRENCY
let DEEPSEEK_MAX_CONCURRENCY = parseInt(process.env.DEEPSEEK_MAX_CONCURRENCY ?? "10", 10);
if (isNaN(DEEPSEEK_MAX_CONCURRENCY) || DEEPSEEK_MAX_CONCURRENCY < 1) {
  console.warn(
    `Invalid DEEPSEEK_MAX_CONCURRENCY (${process.env.DEEPSEEK_MAX_CONCURRENCY}), using default: 10`
  );
  DEEPSEEK_MAX_CONCURRENCY = 10;
}

// Parse CORS origin: "*" becomes true (reflect request origin, required for
// credentials: true), comma-separated values become an array, otherwise pass
// the string as-is.
function parseCorsOrigin(raw: string): boolean | string | string[] {
  if (raw === "*") return true;
  if (raw.includes(",")) return raw.split(",").map((s) => s.trim());
  return raw;
}

function createDecisionEngine(): DecisionEngine {
  if (AI_ENGINE === "llm") {
    if (!DEEPSEEK_API_KEY) {
      console.error("ERROR: AI_ENGINE=llm requires DEEPSEEK_API_KEY to be set");
      console.error("Falling back to rule-based engine");
      return new RuleBasedEngine();
    }
    console.log(`Using LLM engine with model: ${DEEPSEEK_MODEL}`);
    return new LLMEngine({
      apiKey: DEEPSEEK_API_KEY,
      model: DEEPSEEK_MODEL,
      maxConcurrency: DEEPSEEK_MAX_CONCURRENCY,
    });
  }
  console.log("Using rule-based engine");
  return new RuleBasedEngine();
}

async function main() {
  console.log("=== AI Battle Royale Server ===");
  console.log(`Agents: ${AGENT_COUNT} | Tick: ${TICK_INTERVAL}ms | Port: ${PORT}`);
  console.log(`CORS Origin: ${CORS_ORIGIN}`);

  // 1. Create Socket.IO server
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(PORT, {
    cors: {
      origin: parseCorsOrigin(CORS_ORIGIN),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // 2. Create decision engine (plugin)
  const engine = createDecisionEngine();

  // 3. Create pathfinding engine (plugin)
  const pathfinder: PathfindingEngine = new AStarPathfinder();

  // 4. Create and initialize world
  const world = new World(
    { agentCount: AGENT_COUNT, tickIntervalMs: TICK_INTERVAL },
    engine,
    pathfinder,
  );
  world.init();

  // 5. Create sync manager
  const sync = new SyncManager(io, world);

  // 6. Game loop
  const gameLoop = setInterval(async () => {
    if (world.phase !== GamePhase.Running) {
      // Auto-restart after game over
      if (world.phase === GamePhase.Finished) {
        console.log(`Game over! Winner: ${world.winner?.name ?? "none"}`);
        console.log("Restarting in 10 seconds...");
        clearInterval(gameLoop);
        setTimeout(() => {
          world.init();
          startLoop();
        }, 10000);
      }
      return;
    }

    await world.update();
    sync.broadcastTick();

    // Log every 10 ticks
    if (world.tick % 10 === 0) {
      console.log(
        `Tick ${world.tick} | Alive: ${world.aliveCount} | Viewers: ${sync.connectedCount}`,
      );
    }
  }, TICK_INTERVAL);

  function startLoop() {
    setInterval(async () => {
      if (world.phase === GamePhase.Running) {
        await world.update();
        sync.broadcastTick();
      }
    }, TICK_INTERVAL);
  }

  // 7. Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    clearInterval(gameLoop);
    // Extension: save world state here
    // await persistence.saveSnapshot(world.serialize());
    io.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log(`Server running on ws://localhost:${PORT}`);
  console.log(`${world.agents.length} agents spawned, simulation starting...`);
}

main().catch(console.error);
