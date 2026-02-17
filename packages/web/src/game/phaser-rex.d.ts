declare module "phaser" {
  interface Scene {
    rexUI?: {
      add: {
        roundRectangle?: (x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number) => Phaser.GameObjects.GameObject;
        label?: (config: object) => Phaser.GameObjects.GameObject;
        simpleLabel?: (config: object) => Phaser.GameObjects.GameObject;
        scrollablePanel?: (config: object) => Phaser.GameObjects.GameObject;
        lineProgress?: (x: number, y: number, w: number, h: number, color: number, value: number, config?: object) => Phaser.GameObjects.GameObject;
        sizer?: (config: object) => Phaser.GameObjects.GameObject;
      };
    };
  }
}
