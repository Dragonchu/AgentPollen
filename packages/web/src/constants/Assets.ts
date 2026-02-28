// 朝向枚举：用于精灵翻转或动画选择
export enum SpriteDirection {
  Right = 1,
  Left = -1,
}

/**
 * 游戏资产键名常量
 *
 * 精灵资产优先使用 GenerativeAgentsCN 的角色素材（CuteRPG 风格 32×32 精灵）。
 * Tilemap 资产使用 GenerativeAgentsCN 的 village tilemap 及对应图集。
 */
export const ASSETS = {
  IMAGES: {
    // ── Legacy assets (kept for backwards-compatibility with non-village maps) ──
    ROCK2: 'rock2',
    GOLD_RESOURCE: 'gold_resource',

    // ── Village tilemap tilesets (GenerativeAgentsCN) ──
    VILLAGE_TILEMAP: 'village_map',
    TILESET_FIELD_B: 'CuteRPG_Field_B',
    TILESET_FIELD_C: 'CuteRPG_Field_C',
    TILESET_HARBOR_C: 'CuteRPG_Harbor_C',
    TILESET_VILLAGE_B: 'CuteRPG_Village_B',
    TILESET_FOREST_B: 'CuteRPG_Forest_B',
    TILESET_DESERT_C: 'CuteRPG_Desert_C',
    TILESET_MOUNTAINS_B: 'CuteRPG_Mountains_B',
    TILESET_DESERT_B: 'CuteRPG_Desert_B',
    TILESET_FOREST_C: 'CuteRPG_Forest_C',
    TILESET_WALLS: 'Room_Builder_32x32',
    TILESET_BLOCKS: 'blocks_1',
    TILESET_INTERIORS_1: 'interiors_pt1',
    TILESET_INTERIORS_2: 'interiors_pt2',
    TILESET_INTERIORS_3: 'interiors_pt3',
    TILESET_INTERIORS_4: 'interiors_pt4',
    TILESET_INTERIORS_5: 'interiors_pt5',
  },
  /**
   * Agent sprite atlas keys.
   * Each entry maps to a character texture loaded from
   * /assets/village/agents/<name>/texture.png with the shared sprite.json atlas.
   *
   * Frame naming convention (from sprite.json):
   *   down, down-walk.000–.003
   *   left, left-walk.000–.003
   *   right, right-walk.000–.003
   *   up,   up-walk.000–.003
   */
  AGENT_SPRITES: [
    '乔治',
    '亚当',
    '亚瑟',
    '伊莎贝拉',
    '克劳斯',
    '卡洛斯',
    '卡门',
    '埃迪',
    '塔玛拉',
    '山姆',
  ] as const,
  SPRITE_ATLAS_JSON: '/assets/village/agents/sprite.json',
  SPRITES: {
    PLAYER: 'player',
  },
  AUDIO: {
    BGM: 'main_theme',
  },
} as const;

/** Return the atlas key for an agent given its spriteKey field. */
export function getAgentAtlasKey(spriteKey: string): string {
  return spriteKey;
}
