import * as Phaser from "phaser";
import {ASSETS} from "@/constants/Assets";

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.load.image(ASSETS.IMAGES.ROCK2, "/assets/Terrain/Decorations/Rocks/Rock2.png");
        this.load.image(
            ASSETS.IMAGES.GOLD_RESOURCE,
            "/assets/Terrain/Resources/Gold/GoldResource/Gold_Resource.png"
        );
        this.load.spritesheet(
            ASSETS.IMAGES.WARRIOR_RUN.KEY,
            ASSETS.IMAGES.WARRIOR_RUN.PATH,
            {
                frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH,
                frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT,
            }
        );
        this.load.spritesheet(
            ASSETS.IMAGES.WARRIOR_ATTACK.KEY,
            ASSETS.IMAGES.WARRIOR_ATTACK.PATH,
            {
                frameWidth: ASSETS.IMAGES.WARRIOR_RUN.WIDTH,
                frameHeight: ASSETS.IMAGES.WARRIOR_RUN.HEIGHT,
            }
        );
        this.load.spritesheet(
            ASSETS.IMAGES.WARRIOR_IDLE.KEY,
            ASSETS.IMAGES.WARRIOR_IDLE.PATH,
            {
                frameWidth: ASSETS.IMAGES.WARRIOR_IDLE.WIDTH,
                frameHeight: ASSETS.IMAGES.WARRIOR_IDLE.HEIGHT,
            }
        );
    }
    create() {
        this.scene.start('GameScene'); // 加载完后切换到游戏场景
    }
}