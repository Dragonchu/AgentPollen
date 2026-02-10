import { Server } from "socket.io";
import { GamePhase, type ServerToClientEvents, type ClientToServerEvents } from "@battle-royale/shared";
import { World } from "./engine/World.js";
import { RuleBasedEngine } from "./plugins/RuleBasedEngine.js";
import { SyncManager } from "./network/SyncManager.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const AGENT_COUNT = parseInt(process.env.AGENT_COUNT ?? "10", 10);
const TICK_INTERVAL = parseInt(process.env.TICK_INTERVAL ?? "1000", 10);

async function main() {
  console.log("=== AI Battle Royale Server ===");
  console.log(`Agents: ${AGENT_COUNT} | Tick: ${TICK_INTERVAL}ms | Port: ${PORT}`);

  // 1. Create Socket.IO server
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(PORT, {
    cors: { origin: "*" },
  });

  // 2. Create decision engine (plugin)
  // To switch to LLM: replace with new LLMEngine({ apiKey: "..." })
  const engine = new RuleBasedEngine();

  // 3. Create and initialize world
  const world = new World(
    { agentCount: AGENT_COUNT, tickIntervalMs: TICK_INTERVAL },
    engine,
  );
  world.init();

  // 4. Create sync manager
  const sync = new SyncManager(io, world);

  // 5. Game loop
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

  // 6. Graceful shutdown
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
