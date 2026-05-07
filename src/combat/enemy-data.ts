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

  // ---- 金丹中期~化神 中后期敌人 ----

  flame_serpent: {
    id: 'flame_serpent',
    name: '烈焰蛇',
    type: 'minor',
    realm: { name: '金丹', subStage: '中期', progressIndex: 9, cultivation: 0 },
    stats: {
      hp: 820,
      maxHp: 820,
      qi: 320,
      maxQi: 320,
      stamina: 200,
      maxStamina: 200,
      willpower: 35,
    },
    attack: 97,
    defense: 35,
    skills: [
      {
        name: '烈焰吐息',
        qiCost: 20,
        staminaCost: 0,
        damageMultiplier: 1.5,
        description: '喷出炽热的火焰灼烧敌人',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'serpent_scale', quantity: 2 },
        { itemId: 'spirit_stone', quantity: 5 },
      ],
      possible: [
        { itemId: 'venom_sac', quantity: 1, chance: 0.25 },
        { itemId: 'spirit_beast_meat', quantity: 2, chance: 0.4 },
      ],
      experience: 80,
    },
    description: '身披烈焰鳞片的巨蛇，所过之处草木焚尽，是金丹期修士的劲敌。',
    behavior: 'aggressive',
  },

  shadow_mantis: {
    id: 'shadow_mantis',
    name: '影螳螂',
    type: 'minor',
    realm: { name: '金丹', subStage: '后期', progressIndex: 10, cultivation: 0 },
    stats: {
      hp: 900,
      maxHp: 900,
      qi: 350,
      maxQi: 350,
      stamina: 220,
      maxStamina: 220,
      willpower: 38,
    },
    attack: 105,
    defense: 30,
    skills: [
      {
        name: '影袭',
        qiCost: 15,
        staminaCost: 10,
        damageMultiplier: 1.8,
        description: '融入阴影中发动致命一击',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spider_silk', quantity: 2 },
        { itemId: 'spirit_stone', quantity: 4 },
      ],
      possible: [
        { itemId: 'echo_stone', quantity: 1, chance: 0.25 },
        { itemId: 'wind_essence', quantity: 1, chance: 0.2 },
      ],
      experience: 90,
    },
    description: '形如螳螂的诡异妖兽，能在阴影中穿梭自如，身形快若闪电。',
    behavior: 'cunning',
  },

  blood_ape: {
    id: 'blood_ape',
    name: '血猿',
    type: 'minor',
    realm: { name: '金丹', subStage: '圆满', progressIndex: 11, cultivation: 0 },
    stats: {
      hp: 1000,
      maxHp: 1000,
      qi: 280,
      maxQi: 280,
      stamina: 280,
      maxStamina: 280,
      willpower: 40,
    },
    attack: 110,
    defense: 50,
    skills: [
      {
        name: '狂暴锤击',
        qiCost: 0,
        staminaCost: 20,
        damageMultiplier: 1.6,
        description: '以蛮力双拳猛锤大地，震荡周围',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spirit_beast_meat', quantity: 3 },
        { itemId: 'spirit_stone', quantity: 6 },
      ],
      possible: [
        { itemId: 'stone_heart', quantity: 1, chance: 0.2 },
        { itemId: 'ore_ingot', quantity: 1, chance: 0.3 },
      ],
      experience: 100,
    },
    description: '吸收了血煞之气的巨猿，双眼血红，力大无穷且凶残无比。',
    behavior: 'berserk',
  },

  vengeful_ghost: {
    id: 'vengeful_ghost',
    name: '怨灵',
    type: 'boss',
    realm: { name: '金丹', subStage: '圆满', progressIndex: 11, cultivation: 0 },
    stats: {
      hp: 1500,
      maxHp: 1500,
      qi: 600,
      maxQi: 600,
      stamina: 200,
      maxStamina: 200,
      willpower: 60,
    },
    attack: 130,
    defense: 35,
    skills: [
      {
        name: '怨念冲击',
        qiCost: 30,
        staminaCost: 0,
        damageMultiplier: 1.8,
        description: '将积攒的怨念化为冲击波释放',
      },
      {
        name: '夺魂咒',
        qiCost: 40,
        staminaCost: 0,
        damageMultiplier: 2.0,
        description: '侵蚀敌人魂魄，造成精神层面的重创',
      },
      {
        name: '鬼影重重',
        qiCost: 25,
        staminaCost: 5,
        damageMultiplier: 0.3,
        description: '分化鬼影迷惑敌人，大幅降低受到的伤害',
        specialEffect: { trigger: 'on_defend', effect: 'dodge', value: 40 },
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spirit_core', quantity: 1 },
        { itemId: 'ancient_jade', quantity: 2 },
      ],
      possible: [
        { itemId: 'technique_scroll', quantity: 1, chance: 0.35 },
        { itemId: 'ice_crystal', quantity: 1, chance: 0.25 },
      ],
      experience: 250,
    },
    description: '死于矿难怨气不散的修士魂魄，漫长的怨恨使其化为强大的怨灵。',
    behavior: 'cunning',
  },

  ice_wyrm: {
    id: 'ice_wyrm',
    name: '冰蛟',
    type: 'minor',
    realm: { name: '元婴', subStage: '前期', progressIndex: 12, cultivation: 0 },
    stats: {
      hp: 1100,
      maxHp: 1100,
      qi: 400,
      maxQi: 400,
      stamina: 240,
      maxStamina: 240,
      willpower: 42,
    },
    attack: 118,
    defense: 45,
    skills: [
      {
        name: '寒冰吐息',
        qiCost: 25,
        staminaCost: 0,
        damageMultiplier: 1.6,
        description: '喷出极寒之气冻结敌人',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'serpent_scale', quantity: 2 },
        { itemId: 'ice_soul_grass', quantity: 1 },
      ],
      possible: [
        { itemId: 'ice_crystal', quantity: 1, chance: 0.3 },
        { itemId: 'spirit_stone', quantity: 8, chance: 0.5 },
      ],
      experience: 110,
    },
    description: '修炼千年的冰属性蛟龙，虽未化龙但已初具龙威，吐息之间冰封万物。',
    behavior: 'defensive',
  },

  thunder_wolf: {
    id: 'thunder_wolf',
    name: '雷狼',
    type: 'minor',
    realm: { name: '元婴', subStage: '中期', progressIndex: 13, cultivation: 0 },
    stats: {
      hp: 1180,
      maxHp: 1180,
      qi: 430,
      maxQi: 430,
      stamina: 260,
      maxStamina: 260,
      willpower: 45,
    },
    attack: 130,
    defense: 40,
    skills: [
      {
        name: '雷爪',
        qiCost: 20,
        staminaCost: 10,
        damageMultiplier: 1.7,
        description: '爪上缠绕雷电，撕裂敌人的同时麻痹目标',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'wolf_hide', quantity: 2 },
        { itemId: 'spirit_stone', quantity: 6 },
      ],
      possible: [
        { itemId: 'thunder_crystal', quantity: 1, chance: 0.3 },
        { itemId: 'wolf_fang', quantity: 2, chance: 0.25 },
      ],
      experience: 130,
    },
    description: '被天雷劈中后异变的巨狼，周身缠绕电光，速度奇快无比。',
    behavior: 'aggressive',
  },

  crystal_spider: {
    id: 'crystal_spider',
    name: '晶蛛',
    type: 'minor',
    realm: { name: '元婴', subStage: '后期', progressIndex: 14, cultivation: 0 },
    stats: {
      hp: 1250,
      maxHp: 1250,
      qi: 460,
      maxQi: 460,
      stamina: 240,
      maxStamina: 240,
      willpower: 48,
    },
    attack: 140,
    defense: 55,
    skills: [
      {
        name: '晶网陷阱',
        qiCost: 25,
        staminaCost: 5,
        damageMultiplier: 1.4,
        description: '织出晶体蛛网困住敌人并造成伤害',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spider_silk', quantity: 3 },
        { itemId: 'spirit_stone', quantity: 8 },
      ],
      possible: [
        { itemId: 'earth_crystal', quantity: 1, chance: 0.3 },
        { itemId: 'spirit_core', quantity: 1, chance: 0.2 },
      ],
      experience: 150,
    },
    description: '吞噬了地下灵脉结晶的巨型蜘蛛，全身覆盖晶状甲壳，防御惊人。',
    behavior: 'defensive',
  },

  crimson_dragon: {
    id: 'crimson_dragon',
    name: '赤龙',
    type: 'boss',
    realm: { name: '元婴', subStage: '后期', progressIndex: 14, cultivation: 0 },
    stats: {
      hp: 2500,
      maxHp: 2500,
      qi: 800,
      maxQi: 800,
      stamina: 300,
      maxStamina: 300,
      willpower: 70,
    },
    attack: 170,
    defense: 60,
    skills: [
      {
        name: '龙炎焚天',
        qiCost: 40,
        staminaCost: 10,
        damageMultiplier: 2.2,
        description: '喷出毁灭性的龙炎，焚尽万物',
      },
      {
        name: '龙威',
        qiCost: 30,
        staminaCost: 0,
        damageMultiplier: 0.1,
        description: '释放古老龙族的威压，震慑并削弱敌人',
        specialEffect: { trigger: 'on_attack', effect: 'intimidate', value: 20 },
      },
      {
        name: '龙鳞护体',
        qiCost: 35,
        staminaCost: 0,
        damageMultiplier: 0.2,
        description: '龙鳞硬化，短时间内大幅提升防御',
        specialEffect: { trigger: 'on_defend', effect: 'armor', value: 50 },
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spirit_core', quantity: 2 },
        { itemId: 'dragon_crystal', quantity: 1 },
        { itemId: 'ancient_jade', quantity: 3 },
      ],
      possible: [
        { itemId: 'spirit_weapon_fragment', quantity: 2, chance: 0.5 },
        { itemId: 'technique_scroll', quantity: 2, chance: 0.4 },
      ],
      experience: 400,
    },
    description: '沉睡在古修洞府深处的赤色巨龙，古修士以精血饲养的守护圣兽，龙威浩荡。',
    behavior: 'cunning',
  },

  void_walker: {
    id: 'void_walker',
    name: '虚空行者',
    type: 'minor',
    realm: { name: '元婴', subStage: '圆满', progressIndex: 15, cultivation: 0 },
    stats: {
      hp: 1350,
      maxHp: 1350,
      qi: 520,
      maxQi: 520,
      stamina: 250,
      maxStamina: 250,
      willpower: 52,
    },
    attack: 148,
    defense: 35,
    skills: [
      {
        name: '虚空刃',
        qiCost: 20,
        staminaCost: 0,
        damageMultiplier: 1.8,
        description: '撕开虚空裂缝，以空间之力切割敌人',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'wind_essence', quantity: 2 },
        { itemId: 'spirit_stone', quantity: 10 },
      ],
      possible: [
        { itemId: 'echo_stone', quantity: 2, chance: 0.3 },
        { itemId: 'spirit_core', quantity: 1, chance: 0.25 },
      ],
      experience: 170,
    },
    description: '游走于虚空裂隙中的神秘存在，身形飘忽不定，攻击诡异莫测。',
    behavior: 'cunning',
  },

  ancient_treant: {
    id: 'ancient_treant',
    name: '古树精',
    type: 'minor',
    realm: { name: '化神', subStage: '前期', progressIndex: 16, cultivation: 0 },
    stats: {
      hp: 1600,
      maxHp: 1600,
      qi: 500,
      maxQi: 500,
      stamina: 350,
      maxStamina: 350,
      willpower: 55,
    },
    attack: 155,
    defense: 70,
    skills: [
      {
        name: '根须缠绕',
        qiCost: 15,
        staminaCost: 10,
        damageMultiplier: 1.3,
        description: '以古老根须束缚敌人并吸取生命',
      },
      {
        name: '自然之怒',
        qiCost: 30,
        staminaCost: 0,
        damageMultiplier: 1.8,
        description: '唤醒周围植物的力量攻击敌人',
      },
    ],
    loot: {
      guaranteed: [
        { itemId: 'spirit_herb', quantity: 3 },
        { itemId: 'ling_grass', quantity: 5 },
      ],
      possible: [
        { itemId: 'blood_soul_flower', quantity: 2, chance: 0.3 },
        { itemId: 'heavenly_heart_orchid', quantity: 1, chance: 0.15 },
        { itemId: 'earth_crystal', quantity: 1, chance: 0.25 },
      ],
      experience: 180,
    },
    description: '在灵脉之上生长了数千年的古树，吸收了天地灵气后觉醒了灵智，守护着整片森林。',
    behavior: 'defensive',
  },
};

// ==================== 位置敌人映射 ====================

const LOCATION_ENEMIES: Record<string, string[]> = {
  outside_forest: ['shadow_wolf', 'iron_boar', 'wind_serpent'],
  spirit_valley: ['spirit_python', 'venom_spider', 'flame_serpent'],
  abandoned_mine: ['cave_bat_swarm', 'stone_demon', 'shadow_mantis', 'blood_ape', 'vengeful_ghost'],
  ancient_cave: [
    'guardian_spirit',
    'ice_wyrm',
    'thunder_wolf',
    'crystal_spider',
    'crimson_dragon',
    'void_walker',
    'ancient_treant',
  ],
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
