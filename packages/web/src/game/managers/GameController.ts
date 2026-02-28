import * as Phaser from 'phaser';
import { GameState } from './GameState';
import { NetworkService } from './NetworkService';
import type {
  AgentFullState,
  GameEvent,
  ItemState,
  ThinkingProcess,
  TileMap,
  VoteState,
  Waypoint,
  WorldSyncState,
} from '@battle-royale/shared';

/**
 * GameController is the Application/Business Logic layer.
 * It coordinates between NetworkService (commands) and GameState (queries).
 * UI components should only interact with this controller, not directly with lower layers.
 *
 * Responsibilities:
 * - Expose high-level business operations for UI
 * - Coordinate network commands through NetworkService
 * - Provide read access to GameState data
 * - Forward state events to UI (UI can listen to GameState events directly)
 */
export class GameController extends Phaser.Events.EventEmitter {
  private gameState: GameState;
  private networkService: NetworkService;

  constructor(gameState: GameState, networkService: NetworkService) {
    super();
    this.gameState = gameState;
    this.networkService = networkService;
  }

  // ============ Business Operations (Commands) ============

  /**
   * Submit a vote for an agent's action
   */
  submitVote(agentId: number, action: string): void {
    this.networkService.submitVote(agentId, action);
  }

  /**
   * Select and inspect an agent (request details + follow + thinking history)
   */
  selectAgent(agentId: number): void {
    this.networkService.inspectAgent(agentId);
  }

  /**
   * Clear current agent selection
   */
  clearSelection(): void {
    this.networkService.clearSelection();
  }

  /**
   * Request thinking history for a specific agent
   */
  requestThinkingHistory(agentId: number, limit: number = 10): void {
    this.networkService.requestThinkingHistory(agentId, limit);
  }

  // ============ State Queries (Read-only access) ============

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.gameState.isConnected();
  }

  /**
   * Get current world state
   */
  getWorld(): WorldSyncState | null {
    return this.gameState.getWorld();
  }

  /**
   * Get all agents
   */
  getAgents(): Map<number, AgentFullState> {
    return this.gameState.getAgents();
  }

  /**
   * Get a specific agent by ID
   */
  getAgent(id: number): AgentFullState | undefined {
    return this.gameState.getAgent(id);
  }

  /**
   * Get all items
   */
  getItems(): ItemState[] {
    return this.gameState.getItems();
  }

  /**
   * Get recent events
   */
  getEvents(): GameEvent[] {
    return this.gameState.getEvents();
  }

  /**
   * Get current vote state
   */
  getVotes(): VoteState | null {
    return this.gameState.getVotes();
  }

  /**
   * Get currently selected agent
   */
  getSelectedAgent(): AgentFullState | null {
    return this.gameState.getSelectedAgent();
  }

  /**
   * Get agent paths for smooth movement
   */
  getAgentPaths(): Record<number, Waypoint[]> {
    return this.gameState.getAgentPaths();
  }

  /**
   * Get tile map
   */
  getTileMap(): TileMap | null {
    return this.gameState.getTileMap();
  }

  /**
   * Get thinking history for all agents
   */
  getThinkingHistory(): Map<number, ThinkingProcess[]> {
    return this.gameState.getThinkingHistory();
  }

  /**
   * Get thinking history for a specific agent
   */
  getAgentThinkingHistory(id: number): ThinkingProcess[] {
    return this.gameState.getAgentThinkingHistory(id);
  }

  /**
   * Get grid dimensions from tilemap
   */
  getGridSize(): { width: number; height: number } | null {
    return this.gameState.getGridSize();
  }

  /**
   * Get direct access to GameState for event subscription
   * UI components can listen to state events directly
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get direct access to NetworkService (for advanced use cases)
   */
  getNetworkService(): NetworkService {
    return this.networkService;
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
