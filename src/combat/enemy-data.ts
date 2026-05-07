// ============================================================
// 敌人模板数据库
// ============================================================

import type { Enemy } from '../game/types';

// ==================== 敌人模板注册表 ====================

const ENEMY_TEMPLATES: Record<string, Enemy> = {
  // ---- 城外密林 敌人 ----

  shadow_wolf: {
    id: 'shadow_wolf',
    name: '影狼',
    type: 'minor',
    realm: { name: '炼气', subStage: '后期', progressIndex: 2, cultivation: 0 },
    stats: { hp: 120, maxHp: 120, qi: 40, maxQi: 40, stamina: 80, maxStamina: 80, willpower: 15 },
    attack: 28,
    defense: 8,
    skills: [],
    loot: {
      guaranteed: [
        { itemId: 'wolf_hide', quantity: 1 },
        { itemId: 'spirit_stone_fragment', quantity: 2 },
      ],
      possible: [{ itemId: 'wolf_fang', quantity: 1, chance: 0.3 }],
      experience: 20,
    },
    description: '一只通体漆黑的恶狼，眼中闪烁着幽绿的光芒，行动敏捷。',
    behavior: 'aggressive',
  },

  iron_boar: {
    id: 'iron_boar',
    name: '铁脊豪猪',
    type: 'minor',
    realm: { name: '筑基', subStage: '前期', progressIndex: 4, cultivation: 0 },
    stats: { hp: 250, maxHp: 250, qi: 30, maxQi: 30, stamina: 120, maxStamina: 120, willpower: 20 },
    attack: 25,
    defense: 20,
    skills: [
      {
        name: '铁壁冲撞',
        qiCost: 0,
        staminaCost: 15,
        damageMultiplier: 1.5,
        description: '以坚硬的脊背冲撞敌人',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'boar_hide', quantity: 1 },
        { itemId: 'spirit_stone_fragment', quantity: 3 },
      ],
      possible: [{ itemId: 'boar_tusk', quantity: 1, chance: 0.25 }],
      experience: 30,
    },
    description: '一头体型硕大的豪猪，脊背上的鬃毛如铁刺般坚硬。',
    behavior: 'defensive',
  },

  wind_serpent: {
    id: 'wind_serpent',
    name: '风蛇',
    type: 'minor',
    realm: { name: '炼气', subStage: '圆满', progressIndex: 3, cultivation: 0 },
    stats: { hp: 140, maxHp: 140, qi: 60, maxQi: 60, stamina: 70, maxStamina: 70, willpower: 18 },
    attack: 32,
    defense: 10,
    skills: [
      {
        name: '风刃',
        qiCost: 10,
        staminaCost: 0,
        damageMultiplier: 1.4,
        description: '凝聚风灵气形成利刃攻击',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'serpent_scale', quantity: 1 },
        { itemId: 'spirit_stone_fragment', quantity: 3 },
      ],
      possible: [{ itemId: 'wind_essence', quantity: 1, chance: 0.2 }],
      experience: 25,
    },
    description: '一条通体青碧的蛇妖，行动迅如疾风，口中能吐风刃。',
    behavior: 'aggressive',
  },

  // ---- 灵溪谷 敌人 ----

  spirit_python: {
    id: 'spirit_python',
    name: '灵溪蟒',
    type: 'minor',
    realm: { name: '筑基', subStage: '中期', progressIndex: 5, cultivation: 0 },
    stats: {
      hp: 300,
      maxHp: 300,
      qi: 100,
      maxQi: 100,
      stamina: 100,
      maxStamina: 100,
      willpower: 25,
    },
    attack: 40,
    defense: 15,
    skills: [
      {
        name: '缠绕绞杀',
        qiCost: 0,
        staminaCost: 10,
        damageMultiplier: 1.3,
        description: '以庞大的身躯缠绕绞杀猎物',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'python_skin', quantity: 1 },
        { itemId: 'spirit_stone', quantity: 2 },
      ],
      possible: [
        { itemId: 'python_gall', quantity: 1, chance: 0.3 },
        { itemId: 'ling_grass', quantity: 2, chance: 0.4 },
      ],
      experience: 40,
    },
    description: '一条吸收灵溪谷灵气修炼成精的巨蟒，鳞片泛着幽幽灵光。',
    behavior: 'aggressive',
  },

  venom_spider: {
    id: 'venom_spider',
    name: '毒蛛',
    type: 'minor',
    realm: { name: '筑基', subStage: '后期', progressIndex: 6, cultivation: 0 },
    stats: { hp: 280, maxHp: 280, qi: 120, maxQi: 120, stamina: 90, maxStamina: 90, willpower: 28 },
    attack: 45,
    defense: 12,
    skills: [
      {
        name: '毒液喷射',
        qiCost: 15,
        staminaCost: 0,
        damageMultiplier: 1.6,
        description: '喷出剧毒液体，造成持续伤害',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spider_silk', quantity: 2 },
        { itemId: 'spirit_stone', quantity: 3 },
      ],
      possible: [
        { itemId: 'venom_sac', quantity: 1, chance: 0.35 },
        { itemId: 'spirit_herb', quantity: 1, chance: 0.3 },
      ],
      experience: 45,
    },
    description: '一只磨盘大小的毒蜘蛛，浑身覆盖着暗紫色的绒毛，毒性猛烈。',
    behavior: 'cunning',
  },

  // ---- 废弃矿洞 敌人 ----

  cave_bat_swarm: {
    id: 'cave_bat_swarm',
    name: '洞蝠群',
    type: 'minor',
    realm: { name: '筑基', subStage: '前期', progressIndex: 4, cultivation: 0 },
    stats: { hp: 180, maxHp: 180, qi: 50, maxQi: 50, stamina: 150, maxStamina: 150, willpower: 22 },
    attack: 38,
    defense: 8,
    skills: [
      {
        name: '音波攻击',
        qiCost: 10,
        staminaCost: 0,
        damageMultiplier: 1.2,
        description: '发出刺耳音波，扰乱心神',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'bat_wing', quantity: 2 },
        { itemId: 'spirit_stone_fragment', quantity: 5 },
      ],
      possible: [{ itemId: 'echo_stone', quantity: 1, chance: 0.2 }],
      experience: 30,
    },
    description: '成百上千只洞蝠组成的蝠群，黑压压一片遮蔽了视线。',
    behavior: 'aggressive',
  },

  stone_demon: {
    id: 'stone_demon',
    name: '石魔',
    type: 'boss',
    realm: { name: '筑基', subStage: '圆满', progressIndex: 7, cultivation: 0 },
    stats: {
      hp: 500,
      maxHp: 500,
      qi: 150,
      maxQi: 150,
      stamina: 200,
      maxStamina: 200,
      willpower: 40,
    },
    attack: 70,
    defense: 35,
    skills: [
      {
        name: '裂地重击',
        qiCost: 0,
        staminaCost: 20,
        damageMultiplier: 1.8,
        description: '聚集大地之力，以巨石般的手臂重重砸下',
      },
      {
        name: '岩石护体',
        qiCost: 20,
        staminaCost: 0,
        damageMultiplier: 0.3,
        description: '召唤岩石覆盖全身，提升防御',
        specialEffect: { trigger: 'on_defend', effect: 'defense_boost', value: 20 },
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'earth_crystal', quantity: 2 },
        { itemId: 'spirit_stone', quantity: 10 },
      ],
      possible: [
        { itemId: 'stone_heart', quantity: 1, chance: 0.4 },
        { itemId: 'ore_ingot', quantity: 3, chance: 0.5 },
      ],
      experience: 100,
    },
    description: '由矿洞中千年灵石孕育而生的石魔，身躯由坚硬岩石构成，力大无穷。',
    behavior: 'berserk',
  },

  // ---- 古修洞府 敌人 ----

  guardian_spirit: {
    id: 'guardian_spirit',
    name: '守护灵',
    type: 'boss',
    realm: { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 0 },
    stats: {
      hp: 650,
      maxHp: 650,
      qi: 300,
      maxQi: 300,
      stamina: 180,
      maxStamina: 180,
      willpower: 50,
    },
    attack: 85,
    defense: 30,
    skills: [
      {
        name: '灵魂震击',
        qiCost: 25,
        staminaCost: 0,
        damageMultiplier: 1.6,
        description: '以强大的灵魂之力直接冲击敌人心神',
      },
      {
        name: '灵能护盾',
        qiCost: 30,
        staminaCost: 0,
        damageMultiplier: 0.2,
        description: '展开灵能护盾，大幅降低受到的伤害',
        specialEffect: { trigger: 'on_defend', effect: 'shield', value: 30 },
      },
      {
        name: '灵气风暴',
        qiCost: 40,
        staminaCost: 10,
        damageMultiplier: 2.2,
        description: '释放积蓄的灵气形成毁灭风暴',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spirit_core', quantity: 1 },
        { itemId: 'spirit_stone', quantity: 30 },
      ],
      possible: [
        { itemId: 'ancient_jade', quantity: 1, chance: 0.5 },
        { itemId: 'technique_scroll', quantity: 1, chance: 0.3 },
        { itemId: 'spirit_weapon_fragment', quantity: 1, chance: 0.2 },
      ],
      experience: 200,
    },
    description: '古修洞府的守护灵体，乃是上古修士残留的意志所化，精通多门古老法术。',
    behavior: 'cunning',
  },
};

// ==================== 位置敌人映射 ====================

const LOCATION_ENEMIES: Record<string, string[]> = {
  outside_forest: ['shadow_wolf', 'iron_boar', 'wind_serpent'],
  spirit_valley: ['spirit_python', 'venom_spider'],
  abandoned_mine: ['cave_bat_swarm', 'stone_demon'],
  ancient_cave: ['guardian_spirit'],
};

// ==================== 查询函数 ====================

/** 根据 ID 获取敌人（深拷贝） */
export function getEnemyById(id: string): Enemy | undefined {
  const template = ENEMY_TEMPLATES[id];
  if (!template) return undefined;
  return structuredClone(template);
}

/** 根据位置危险等级和玩家境界获取随机敌人 */
export function getRandomEncounter(
  _dangerLevel: number,
  playerRealmIndex: number
): Enemy | undefined {
  const candidates = Object.values(ENEMY_TEMPLATES).filter((enemy) => {
    // 只选小怪用于随机遭遇
    if (enemy.type !== 'minor') return false;
    // 敌人境界不能超过玩家太多
    const realmDiff = enemy.realm.progressIndex - playerRealmIndex;
    return realmDiff >= -2 && realmDiff <= 3;
  });

  if (candidates.length === 0) return undefined;
  // 按危险等级加权的随机选择
  const idx = Math.floor(Math.random() * candidates.length);
  return structuredClone(candidates[idx]);
}

/** 获取某个位置的敌人列表 */
export function getLocationEnemies(locationId: string): Enemy[] {
  const enemyIds = LOCATION_ENEMIES[locationId];
  if (!enemyIds) return [];
  return enemyIds
    .map((id) => ENEMY_TEMPLATES[id])
    .filter((e): e is Enemy => e !== undefined)
    .map((e) => structuredClone(e));
}

/** 获取所有敌人 ID */
export function getAllEnemyIds(): string[] {
  return Object.keys(ENEMY_TEMPLATES);
}
