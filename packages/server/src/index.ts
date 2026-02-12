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
import {
  ThinkingHistoryStorage,
  InMemoryThinkingHistoryStorage,
  NullThinkingHistoryStorage,
} from "./persistence/ThinkingHistoryStorage.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const AGENT_COUNT = parseInt(process.env.AGENT_COUNT ?? "10", 10);
const TICK_INTERVAL = parseInt(process.env.TICK_INTERVAL ?? "1000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const AI_ENGINE = process.env.AI_ENGINE ?? "rule-based";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const THINKING_STORAGE = process.env.THINKING_STORAGE ?? "memory"; // "memory" | "null"

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

function createThinkingStorage(): ThinkingHistoryStorage {
  if (THINKING_STORAGE === "null") {
    console.log("Using null thinking storage (no persistence)");
    return new NullThinkingHistoryStorage();
  }
  if (THINKING_STORAGE === "memory") {
    console.log("Using in-memory thinking storage");
    return new InMemoryThinkingHistoryStorage();
  }
  // Invalid value - warn and fall back to memory
  console.warn(`Invalid THINKING_STORAGE value: "${THINKING_STORAGE}". Expected "memory" or "null". Falling back to in-memory storage.`);
  return new InMemoryThinkingHistoryStorage();
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

  // 4. Create thinking history storage (plugin)
  const thinkingStorage = createThinkingStorage();

  // 5. Create and initialize world
  const world = new World(
    { agentCount: AGENT_COUNT, tickIntervalMs: TICK_INTERVAL },
    engine,
    pathfinder,
    thinkingStorage,
  );
  await world.init();

  // 6. Create sync manager
  const sync = new SyncManager(io, world);

  // 7. Game loop with restart logic
  let gameLoopInterval: NodeJS.Timeout | null = null;

  function startGameLoop() {
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
    }

    gameLoopInterval = setInterval(async () => {
      if (world.phase !== GamePhase.Running) {
        // Auto-restart after game over
        if (world.phase === GamePhase.Finished) {
          console.log(`Game over! Winner: ${world.winner?.name ?? "none"}`);
          console.log("Restarting in 10 seconds...");
          setTimeout(async () => {
            await world.init();
            console.log("Game restarted!");
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
  }

  startGameLoop();

  // 8. Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
    }
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
