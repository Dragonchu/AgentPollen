import type {
  AgentFullState,
  GameEvent,
  ThinkingProcess,
  VoteState,
  WorldSyncState,
} from "@battle-royale/shared";
import * as Phaser from "phaser";
import { CELL_SIZE } from "../scenes/gameConstants";
import { buildAgentRow } from "../ui/items/agentRow";
import { buildEventRow } from "../ui/items/eventRow";
import { THEME } from "../ui/theme";
import { CoordinateUtils } from "../utils/CoordinateUtils";
import type { CameraManager } from "./CameraManager";
import type { GameController } from "./GameController";
import type { MotionState } from "./MotionState";

// ── Layout constants ──────────────────────────────────────────────────────────
const HEADER_H = 48;
const SIDEBAR_W = 200;
const RIGHT_W = 280;
const PAD = 8;

const TEXT_STYLE_TITLE = { fontSize: THEME.font.title, color: THEME.css.foreground, fontFamily: "monospace", fontStyle: "bold" } as const;
const TEXT_STYLE_BODY  = { fontSize: THEME.font.body,  color: THEME.css.foreground, fontFamily: "monospace" } as const;
const TEXT_STYLE_SMALL = { fontSize: THEME.font.small, color: THEME.css.mutedForeground, fontFamily: "monospace" } as const;
const TEXT_STYLE_LABEL = { fontSize: THEME.font.label, color: THEME.css.primary,   fontFamily: "monospace", fontStyle: "bold" } as const;

/**
 * UICoordinator builds and maintains the full rexUI layout tree.
 *
 * Architecture:
 *   buildLayout()  → one-time declarative rexUI tree construction
 *   onXxx()        → event handlers that mutate specific refs + layout()
 *   update()       → per-frame: thinking bubble position only
 */
export class UICoordinator {
  private readonly scene: Phaser.Scene;
  private readonly gameController: GameController;
  private readonly cameraManager: CameraManager;
  private readonly motionState: MotionState;

  private rexUI!: NonNullable<Phaser.Scene["rexUI"]>;

  // ── Root ─────────────────────────────────────────────────────────────────────
  private mainSizer!: RexUI.Sizer;

  // ── Header refs ──────────────────────────────────────────────────────────────
  private liveCircle!: Phaser.GameObjects.Arc;
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private aliveText!: Phaser.GameObjects.Text;

  // ── Sidebar refs ─────────────────────────────────────────────────────────────
  private agentListContent!: RexUI.Sizer;
  private agentListPanel!: RexUI.ScrollablePanel;
  private selectedAgentId: number | null = null;
  private lastAgentListClickTime = 0;
  private lastAgentListClickedId: number | null = null;
  private readonly DOUBLE_CLICK_MS = 300;

  // ── Vote panel refs ───────────────────────────────────────────────────────────
  private readonly VOTE_ACTIONS = ["Attack", "Defend", "Heal"] as const;
  private voteCountdownText!: Phaser.GameObjects.Text;
  private voteCountdownBar!: RexUI.LineProgress;
  private voteCountTexts = new Map<string, Phaser.GameObjects.Text>();

  // ── Agent stats refs ──────────────────────────────────────────────────────────
  private statsNameText!: Phaser.GameObjects.Text;
  private statsInfoText!: Phaser.GameObjects.Text;
  private hpBar!: RexUI.LineProgress;
  private shieldBar!: RexUI.LineProgress;

  // ── Event feed refs ───────────────────────────────────────────────────────────
  private eventListContent!: RexUI.Sizer;
  private eventListPanel!: RexUI.ScrollablePanel;

  // ── Thinking bubbles (one per agent) ─────────────────────────────────────────
  private thinkingBubbles = new Map<number, { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; hasText: boolean }>();

  constructor(
    scene: Phaser.Scene,
    gameController: GameController,
    cameraManager: CameraManager,
    motionState: MotionState,
    _worldCamera?: Phaser.Cameras.Scene2D.Camera,
  ) {
    this.scene = scene;
    this.gameController = gameController;
    this.cameraManager = cameraManager;
    this.motionState = motionState;
  }

  create(): void {
    this.rexUI = this.scene.rexUI!;
    this.buildLayout();
    this.subscribeEvents();
    this.setupResize();
    this.startLiveAnimation();
  }

  update(_time: number, _delta: number): void {
    this.updateThinkingBubblePosition();
  }

  destroy(): void {
    const gs = this.gameController.getGameState();
    gs.off("state:world:updated", this.onWorldUpdated, this);
    gs.off("state:agents:updated", this.onAgentsUpdated, this);
    gs.off("state:agent:selected", this.onAgentSelected, this);
    gs.off("state:events:updated", this.onEventsUpdated, this);
    gs.off("state:votes:updated", this.onVotesUpdated, this);
    gs.off("state:thinking:updated", this.onThinkingUpdated, this);
    this.motionState.off("motion:frame-updated", this.onMotionFrameUpdated, this);
    this.scene.scale.off("resize", this.onResize, this);

    this.mainSizer?.destroy();
    for (const { container } of this.thinkingBubbles.values()) {
      container.destroy();
    }
    this.thinkingBubbles.clear();
  }

  // ── Layout construction ───────────────────────────────────────────────────────

  private buildLayout(): void {
    const { width: w, height: h } = this.scene.scale;

    const header    = this.buildHeader();
    const sidebar   = this.buildSidebar();
    const rightPanel = this.buildRightPanel();

    const body = this.rexUI.add
      .sizer({ orientation: "horizontal", space: { item: 0 } })
      .add(sidebar,    { proportion: 0, expand: true })
      .addSpace(1)
      .add(rightPanel, { proportion: 0, expand: true });

    this.mainSizer = this.rexUI.add
      .sizer({ x: w / 2, y: h / 2, width: w, height: h, orientation: "vertical", space: { item: 0 } })
      .add(header, { proportion: 0, expand: true })
      .add(body, { proportion: 1, expand: true });

    this.mainSizer.layout();

    this.cameraManager.getWorldCamera().ignore(
      this.mainSizer,
    );
  }

  private buildHeader(): RexUI.Sizer {
    const bg = this.rexUI.add.roundRectangle(0, 0, 0, HEADER_H, 0, THEME.colors.background, 0.95);

    this.liveCircle = this.scene.add.arc(0, 0, 5, 0, 360, false, THEME.colors.destructive);
    const title      = this.scene.add.text(0, 0, "⚔ AI BATTLE ROYALE", TEXT_STYLE_TITLE);
    this.phaseText   = this.scene.add.text(0, 0, "WAITING", TEXT_STYLE_SMALL);
    this.timerText   = this.scene.add.text(0, 0, "00:00", TEXT_STYLE_TITLE);
    this.aliveText   = this.scene.add.text(0, 0, "0 alive", TEXT_STYLE_SMALL);

    return this.rexUI.add
      .sizer({ height: HEADER_H, orientation: "horizontal", background: bg, space: { left: PAD * 2, right: PAD * 2, item: PAD * 2 } })
      .add(this.liveCircle as unknown as Phaser.GameObjects.GameObject, { proportion: 0, align: "center" })
      .add(title,           { proportion: 0, align: "center" })
      .addSpace(1)
      .add(this.phaseText,  { proportion: 0, align: "center" })
      .addSpace(1)
      .add(this.timerText,  { proportion: 0, align: "center" })
      .add(this.aliveText,  { proportion: 0, align: "center", padding: { left: PAD } });
  }

  private buildSidebar(): RexUI.Sizer {
    const bg        = this.rexUI.add.roundRectangle(0, 0, SIDEBAR_W, 0, 0, THEME.colors.background, 0.9);
    const titleText = this.scene.add.text(0, 0, "AGENTS", TEXT_STYLE_LABEL);

    this.agentListContent = this.rexUI.add.sizer({ orientation: "vertical", space: { item: 2 } });

    this.agentListPanel = this.rexUI.add.scrollablePanel({
      width: SIDEBAR_W - PAD * 2,
      scrollMode: 0,
      panel: {
        child: this.agentListContent,
        mask: { padding: 1 },
      },
      slider: false,
      mouseWheelScroller: { focus: false, speed: 0.3 },
      space: { panel: 4 },
    });

    return this.rexUI.add
      .sizer({ width: SIDEBAR_W, orientation: "vertical", background: bg, space: { left: PAD, right: PAD, top: PAD, bottom: PAD, item: PAD } })
      .add(titleText, { proportion: 0, align: "left" })
      .add(this.agentListPanel, { proportion: 1, expand: true });
  }

  private buildRightPanel(): RexUI.Sizer {
    const votePanel  = this.buildVotePanel();
    const statsPanel = this.buildStatsPanel();
    const eventPanel = this.buildEventPanel();

    return this.rexUI.add
      .sizer({ width: RIGHT_W, orientation: "vertical", space: { item: PAD } })
      .add(votePanel  as unknown as Phaser.GameObjects.GameObject, { proportion: 0, expand: true })
      .add(statsPanel as unknown as Phaser.GameObjects.GameObject, { proportion: 0, expand: true })
      .add(eventPanel as unknown as Phaser.GameObjects.GameObject, { proportion: 1, expand: true });
  }

  private buildVotePanel(): RexUI.Sizer {
    const bg        = this.rexUI.add.roundRectangle(0, 0, RIGHT_W - PAD, 0, THEME.spacing.radius, THEME.colors.background, 0.9);
    const titleText = this.scene.add.text(0, 0, "VOTE", TEXT_STYLE_LABEL);

    this.voteCountdownText = this.scene.add.text(0, 0, "—", TEXT_STYLE_SMALL);
    this.voteCountdownBar  = this.rexUI.add.lineProgress({
      width: RIGHT_W - PAD * 4, height: 6,
      value: 0, trackColor: THEME.colors.border, barColor: THEME.colors.primary,
    });

    const cardRow = this.rexUI.add.sizer({ orientation: "horizontal", space: { item: PAD } });
    for (const action of this.VOTE_ACTIONS) {
      const countText  = this.scene.add.text(0, 0, "0", { ...TEXT_STYLE_TITLE, color: THEME.css.primary });
      const labelText  = this.scene.add.text(0, 0, action, TEXT_STYLE_SMALL);
      const cardBg     = this.rexUI.add.roundRectangle(0, 0, 0, 48, 4, THEME.colors.secondary, 1);

      this.voteCountTexts.set(action, countText);

      (cardBg as unknown as Phaser.GameObjects.GameObject & {
        setInteractive(c?: object): Phaser.GameObjects.GameObject;
        on(e: string, cb: () => void): Phaser.GameObjects.GameObject;
      })
        .setInteractive({ cursor: "pointer" })
        .on("pointerdown", () => {
          const agent = this.gameController.getSelectedAgent();
          if (!agent?.alive) return;
          this.gameController.submitVote(agent.id, action);
        });

      const card = this.rexUI.add
        .sizer({ orientation: "vertical", background: cardBg, space: { left: PAD, right: PAD, top: PAD, bottom: PAD, item: 4 } })
        .add(countText, { proportion: 0, align: "center" })
        .add(labelText, { proportion: 0, align: "center" });

      cardRow.add(card as unknown as Phaser.GameObjects.GameObject, { proportion: 1 });
    }

    return this.rexUI.add
      .sizer({ orientation: "vertical", background: bg, space: { left: PAD, right: PAD, top: PAD, bottom: PAD, item: PAD } })
      .add(titleText,               { proportion: 0, align: "left" })
      .add(this.voteCountdownText,  { proportion: 0, align: "left" })
      .add(this.voteCountdownBar as unknown as Phaser.GameObjects.GameObject, { proportion: 0, align: "center" })
      .add(cardRow as unknown as Phaser.GameObjects.GameObject, { proportion: 0, expand: true });
  }

  private buildStatsPanel(): RexUI.Sizer {
    const bg        = this.rexUI.add.roundRectangle(0, 0, RIGHT_W - PAD, 0, THEME.spacing.radius, THEME.colors.background, 0.9);
    const titleText = this.scene.add.text(0, 0, "AGENT STATS", TEXT_STYLE_LABEL);

    this.statsNameText = this.scene.add.text(0, 0, "Select an agent", TEXT_STYLE_BODY);
    this.statsInfoText = this.scene.add.text(0, 0, "", TEXT_STYLE_SMALL);

    this.hpBar = this.rexUI.add.lineProgress({
      width: RIGHT_W - PAD * 4, height: 8,
      value: 0, trackColor: THEME.colors.border, barColor: THEME.colors.primary,
    });
    this.shieldBar = this.rexUI.add.lineProgress({
      width: RIGHT_W - PAD * 4, height: 8,
      value: 0, trackColor: THEME.colors.border, barColor: THEME.colors.accent,
    });

    return this.rexUI.add
      .sizer({ orientation: "vertical", background: bg, space: { left: PAD, right: PAD, top: PAD, bottom: PAD, item: 6 } })
      .add(titleText,         { proportion: 0, align: "left" })
      .add(this.statsNameText, { proportion: 0, align: "left" })
      .add(this.statsInfoText, { proportion: 0, align: "left" })
      .add(this.scene.add.text(0, 0, "HP",     TEXT_STYLE_SMALL), { proportion: 0, align: "left" })
      .add(this.hpBar    as unknown as Phaser.GameObjects.GameObject, { proportion: 0, align: "center" })
      .add(this.scene.add.text(0, 0, "SHIELD", TEXT_STYLE_SMALL), { proportion: 0, align: "left" })
      .add(this.shieldBar as unknown as Phaser.GameObjects.GameObject, { proportion: 0, align: "center" });
  }

  private buildEventPanel(): RexUI.Sizer {
    const bg        = this.rexUI.add.roundRectangle(0, 0, RIGHT_W - PAD, 0, THEME.spacing.radius, THEME.colors.background, 0.9);
    const titleText = this.scene.add.text(0, 0, "EVENTS", TEXT_STYLE_LABEL);

    this.eventListContent = this.rexUI.add.sizer({ orientation: "vertical", space: { item: 4 } });

    this.eventListPanel = this.rexUI.add.scrollablePanel({
      width: RIGHT_W - PAD * 2,
      scrollMode: 0,
      panel: { child: this.eventListContent as unknown as Phaser.GameObjects.GameObject, mask: { padding: 1 } },
      slider: false,
      mouseWheelScroller: { focus: false, speed: 0.3 },
    });

    return this.rexUI.add
      .sizer({ orientation: "vertical", background: bg, space: { left: PAD, right: PAD, top: PAD, bottom: PAD, item: PAD } })
      .add(titleText, { proportion: 0, align: "left" })
      .add(this.eventListPanel as unknown as Phaser.GameObjects.GameObject, { proportion: 1, expand: true });
  }

  private buildThinkingBubbleForAgent(agentId: number): void {
    if (this.thinkingBubbles.has(agentId)) return;

    const bg = this.scene.add
      .rectangle(0, 0, 260, 60, THEME.colors.secondary, 0.92)
      .setOrigin(0.5, 0.5);

    const text = this.scene.add
      .text(0, 0, "", {
        fontSize: THEME.font.small,
        color: THEME.css.foreground,
        fontFamily: "monospace",
        wordWrap: { width: 240 },
        align: "center",
      })
      .setOrigin(0.5, 0.5);

    const container = this.scene.add
      .container(0, 0, [bg, text])
      .setVisible(false);

    this.cameraManager.getWorldCamera().ignore(container);
    this.thinkingBubbles.set(agentId, { container, text, hasText: false });
  }

  // ── Event subscriptions ───────────────────────────────────────────────────────

  private subscribeEvents(): void {
    const gs = this.gameController.getGameState();
    gs.on("state:world:updated",   this.onWorldUpdated,   this);
    gs.on("state:agents:updated",  this.onAgentsUpdated,  this);
    gs.on("state:agent:selected",  this.onAgentSelected,  this);
    gs.on("state:events:updated",  this.onEventsUpdated,  this);
    gs.on("state:votes:updated",   this.onVotesUpdated,   this);
    gs.on("state:thinking:updated", this.onThinkingUpdated, this);
    this.motionState.on("motion:frame-updated", this.onMotionFrameUpdated, this);
  }

  // ── Event handlers ────────────────────────────────────────────────────────────

  private onWorldUpdated(world: WorldSyncState): void {
    this.phaseText.setText(world.phase.toUpperCase());
    const m = Math.floor(world.tick / 60);
    const s = world.tick % 60;
    this.timerText.setText(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    this.aliveText.setText(`${world.aliveCount} alive`);
  }

  private onAgentsUpdated(agents: Map<number, AgentFullState>): void {
    const sorted = [...agents.values()].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (b.killCount !== a.killCount) return b.killCount - a.killCount;
      return b.hp - a.hp;
    });

    // Create bubbles for new agents, destroy for removed agents
    const currentIds = new Set(agents.keys());
    for (const id of this.thinkingBubbles.keys()) {
      if (!currentIds.has(id)) {
        this.thinkingBubbles.get(id)!.container.destroy();
        this.thinkingBubbles.delete(id);
      }
    }
    for (const agent of agents.values()) {
      this.buildThinkingBubbleForAgent(agent.id);
    }

    this.agentListContent.clear(true);
    for (const agent of sorted) {
      const row = buildAgentRow(
        this.scene, this.rexUI, agent,
        agent.id === this.selectedAgentId,
        () => this.handleAgentRowClick(agent.id),
      );
      this.agentListContent.add(
        row,
        { proportion: 0, expand: true },
      );
    }
    this.mainSizer.layout();
  }

  private handleAgentRowClick(agentId: number): void {
    const now = Date.now();
    const isDouble =
      this.lastAgentListClickedId === agentId && now - this.lastAgentListClickTime < this.DOUBLE_CLICK_MS;

    if (isDouble) {
      this.gameController.selectAgent(agentId);
      this.cameraManager.followAgent(agentId, 1.5);
      this.lastAgentListClickedId = null;
      this.lastAgentListClickTime = 0;
    } else {
      this.gameController.selectAgent(agentId);
      this.cameraManager.followAgent(agentId, 1.5);
      this.lastAgentListClickedId = agentId;
      this.lastAgentListClickTime = now;
    }
  }

  private onAgentSelected(agent: AgentFullState | null): void {
    this.selectedAgentId = agent?.id ?? null;

    if (!agent) {
      this.statsNameText.setText("Select an agent");
      this.statsInfoText.setText("");
      this.hpBar.setValue(0);
      this.shieldBar.setValue(0);
      return;
    }

    this.statsNameText.setText(`${agent.name} ${agent.alive ? "🟢" : "🔴"}`);
    this.statsInfoText.setText(`ATK ${agent.attack}  DEF ${agent.defense}  ${agent.killCount}💀`);
    this.hpBar.setValue(Math.max(0, Math.min(1, agent.hp / agent.maxHp)));
    this.shieldBar.setValue(Math.max(0, Math.min(1, (agent.defense * 5) / 100)));

    // Refresh sidebar to update selection highlight
    this.onAgentsUpdated(this.gameController.getAgents());
  }

  private onEventsUpdated(events: GameEvent[]): void {
    const latest = events.slice(-50).reverse();
    this.eventListContent.clear(true);
    for (const event of latest) {
      this.eventListContent.add(buildEventRow(this.scene, event), { proportion: 0, expand: true });
    }
    this.eventListPanel.layout();
  }

  private onVotesUpdated(voteState: VoteState): void {
    const remaining = voteState.timeRemainingMs / 1000;
    this.voteCountdownText.setText(`${remaining.toFixed(1)}s remaining`);
    this.voteCountdownBar.setValue(Math.max(0, Math.min(1, remaining / 60)));

    const counts: Record<string, number> = {};
    for (const options of Object.values(voteState.agentVotes)) {
      for (const opt of options) {
        counts[opt.action] = (counts[opt.action] ?? 0) + opt.votes;
      }
    }
    for (const action of this.VOTE_ACTIONS) {
      this.voteCountTexts.get(action)?.setText(String(counts[action] ?? 0));
    }
  }

  private onThinkingUpdated(thinkingHistory: Map<number, ThinkingProcess[]>): void {
    for (const [agentId, history] of thinkingHistory) {
      const bubble = this.thinkingBubbles.get(agentId);
      if (!bubble) continue;
      const latest = history[0];
      if (latest) {
        const preview = latest.reasoning.length > 60
          ? `${latest.reasoning.slice(0, 60)}…`
          : latest.reasoning;
        bubble.text.setText(`${latest.action}\n${preview}`);
        bubble.hasText = true;
      }
    }
  }

  private onMotionFrameUpdated(): void {
    this.updateThinkingBubblePosition();
  }

  // ── Thinking bubble ───────────────────────────────────────────────────────────

  private updateThinkingBubblePosition(): void {
    const agents = this.gameController.getAgents();
    for (const [agentId, bubble] of this.thinkingBubbles) {
      const agent = agents.get(agentId);
      if (!agent?.alive || !bubble.hasText) {
        bubble.container.setVisible(false);
        continue;
      }
      const displayState = this.motionState.getDisplayState(agentId);
      const gridPos = displayState
        ? { gridX: displayState.displayX, gridY: displayState.displayY }
        : { gridX: agent.x, gridY: agent.y };
      const worldPos  = CoordinateUtils.gridToWorld(gridPos, CELL_SIZE);
      const screenPos = this.cameraManager.worldToScreen(worldPos.worldX, worldPos.worldY);
      bubble.container.setPosition(screenPos.x, screenPos.y - 80).setVisible(true);
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────────

  private setupResize(): void {
    this.scene.scale.on("resize", this.onResize, this);
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.mainSizer
      .setPosition(gameSize.width / 2, gameSize.height / 2)
      .setMinSize(gameSize.width, gameSize.height)
      .layout();
    this.cameraManager.onResize();
  }

  // ── LIVE animation ────────────────────────────────────────────────────────────

  private startLiveAnimation(): void {
    this.scene.tweens.add({
      targets: this.liveCircle,
      alpha: { from: 0.3, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // ── Hit testing ───────────────────────────────────────────────────────────────

  isPointerOverUI(screenX: number, screenY: number): boolean {
    if (screenY < HEADER_H) return true;
    if (screenX < SIDEBAR_W) return true;
    if (screenX > this.scene.scale.width - RIGHT_W) return true;
    return false;
  }

  getPlayableArea(): { x: number; y: number; width: number; height: number } {
    const { width: w, height: h } = this.scene.scale;
    return { x: SIDEBAR_W, y: HEADER_H, width: w - SIDEBAR_W - RIGHT_W, height: h - HEADER_H };
  }

  getCanvasBounds(): { width: number; height: number } {
    return { width: this.scene.scale.width, height: this.scene.scale.height };
  }
}
