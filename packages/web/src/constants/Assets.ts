// 朝向枚举：用于精灵翻转
// Right = 1 表示向右（不翻转）
// Left = -1 表示向左（翻转）
export enum SpriteDirection {
    Right = 1,
    Left = -1,
}

export const ASSETS = {
    IMAGES: {
        ROCK1: 'rock1',
        ROCK2: 'rock2',
        ROCK3: 'rock3',
        ROCK4: 'rock4',
        GOLD_RESOURCE: 'god_resource',
        WARRIOR_RUN: {
            KEY: 'warrior_run',
            PATH: '/assets/Units/BlackUnits/Warrior/Warrior_Run.png',
            WIDTH: 192,
            HEIGHT: 192,
            DEFAULT_DIRECTION: SpriteDirection.Right,  // 行走动画默认朝向右
        },
        WARRIOR_ATTACK: {
            KEY: 'warrior_attack',
            PATH: '/assets/Units/BlackUnits/Warrior/Warrior_Attack1.png',
            WIDTH: 192,
            HEIGHT: 192,
            DEFAULT_DIRECTION: SpriteDirection.Right,  // 攻击动画默认朝向右
        },
        WARRIOR_IDLE: {
            KEY: 'warrior_idle',
            PATH: '/assets/Units/BlackUnits/Warrior/Warrior_Idle.png',
            WIDTH: 192,
            HEIGHT: 192,
            DEFAULT_DIRECTION: SpriteDirection.Right,  // 待机动画默认朝向右
        }
    },
    SPRITES: {
        PLAYER: 'player',
    },
    AUDIO: {
        BGM: 'main_theme',
    },
} as const;