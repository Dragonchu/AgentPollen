// Type declarations for phaser3-rex-plugins UI plugin
// Only covers the subset used in this project.

declare namespace RexUI {
  // ── Shared base ─────────────────────────────────────────────────────────────
  interface Base extends Phaser.GameObjects.GameObject {
    layout(): this;
    setPosition(x: number, y: number): this;
    setMinSize(width: number, height: number): this;
    setSize(width: number, height: number): this;
    setVisible(visible: boolean): this;
    destroy(fromScene?: boolean): void;
  }

  // ── Sizer ────────────────────────────────────────────────────────────────────
  interface Sizer extends Base {
    add(
      gameObject: Phaser.GameObjects.GameObject | Base,
      config?: AddConfig,
    ): this;
    addSpace(proportion?: number): this;
    clear(destroyChildren?: boolean): this;
    remove(gameObject: Phaser.GameObjects.GameObject, destroyChild?: boolean): this;
  }

  // ── ScrollablePanel ─────────────────────────────────────────────────────────
  interface ScrollablePanel extends Base {
    layout(): this;
  }

  // ── LineProgress ─────────────────────────────────────────────────────────────
  interface LineProgress extends Base {
    setValue(value: number, min?: number, max?: number): this;
    value: number;
  }

  // ── Label ─────────────────────────────────────────────────────────────────────
  interface Label extends Base {
    setText(text: string): this;
  }

  // ── RoundRectangle ────────────────────────────────────────────────────────────
  // rexUI.add.roundRectangle() returns a game object that can be used as a
  // background. It is also interactive-capable.
  type RoundRectangle = Phaser.GameObjects.GameObject;

  // ── Config types ─────────────────────────────────────────────────────────────
  interface AddConfig {
    proportion?: number;
    align?: string;
    expand?: boolean;
    padding?: number | Padding;
    key?: string;
  }

  interface Padding {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  }

  interface Space {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    item?: number;
    panel?: number;
    icon?: number;
    text?: number;
  }

  // ── Factory configs ───────────────────────────────────────────────────────────
  interface SizerConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    orientation?: "horizontal" | "vertical" | 0 | 1;
    space?: Space;
    background?: Phaser.GameObjects.GameObject;
    name?: string;
  }

  interface ScrollablePanelConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    scrollMode?: 0 | 1;
    background?: Phaser.GameObjects.GameObject;
    panel?: {
      child: Phaser.GameObjects.GameObject | Sizer;
      mask?: { padding?: number };
    };
    slider?:
      | false
      | {
          track?: Phaser.GameObjects.GameObject;
          thumb?: Phaser.GameObjects.GameObject;
          position?: number;
        };
    mouseWheelScroller?: { focus?: boolean; speed?: number };
    space?: Space;
  }

  interface LineProgressConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number;
    trackColor?: number;
    barColor?: number;
    trackFillAlpha?: number;
    barFillAlpha?: number;
    rtl?: boolean;
    name?: string;
  }

  interface LabelConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    background?: Phaser.GameObjects.GameObject;
    text?: Phaser.GameObjects.GameObject;
    icon?: Phaser.GameObjects.GameObject;
    iconMask?: boolean;
    align?: string;
    space?: Space;
    name?: string;
  }

  // ── Plugin entry point ────────────────────────────────────────────────────────
  interface Plugin {
    add: {
      sizer(config: SizerConfig): Sizer;
      scrollablePanel(config: ScrollablePanelConfig): ScrollablePanel;
      lineProgress(config: LineProgressConfig): LineProgress;
      label(config: LabelConfig): Label;
      roundRectangle(
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        color?: number,
        alpha?: number,
      ): RoundRectangle;
    };
  }
}

declare module "phaser" {
  interface Scene {
    rexUI?: RexUI.Plugin;
  }
}
