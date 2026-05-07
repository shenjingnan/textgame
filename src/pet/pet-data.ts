// ============================================================
// 灵宠模板数据库
// ============================================================

import type { PetSkill, SpiritPet } from '../game/types';

// ==================== PetTemplate 接口 ====================

export interface PetStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface EvolutionStageData {
  stage: number;
  speciesName: string;
  statGrowth: Partial<PetStats>;
}

export interface PetTemplate {
  id: string;
  name: string;
  species: string;
  description: string;
  realmMin: number;
  realmMax: number;
  baseStats: PetStats;
  stageSkills: Record<number, PetSkill[]>;
  evolutionChain: {
    normal: EvolutionStageData[];
    divine: EvolutionStageData[];
    demonic: EvolutionStageData[];
  };
  locationIds: string[];
  favoriteFoods: string[];
}

// ==================== 灵宠模板注册表 ====================

const PET_TEMPLATES: Record<string, PetTemplate> = {
  // ---- 城外密林 & 灵溪谷 ----

  spirit_fox: {
    id: 'spirit_fox',
    name: '灵狐',
    species: '灵狐',
    description: '一只通体雪白的小狐狸，眼瞳灵动，天生通灵。行动迅捷，擅长以速度和幻术迷惑敌人。',
    realmMin: 0,
    realmMax: 7,
    baseStats: { hp: 60, maxHp: 60, attack: 18, defense: 8, speed: 25 },
    stageSkills: {
      1: [
        { name: '灵狐撕咬', description: '以锋利的牙齿撕咬敌人', cooldown: 2, currentCooldown: 0 },
        { name: '狐火', description: '喷出一团灵火灼烧敌人', cooldown: 3, currentCooldown: 0 },
      ],
      2: [
        {
          name: '幻惑术',
          description: '以幻术迷惑敌人，降低其命中',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      3: [
        {
          name: '灵尾鞭',
          description: '以灵力凝聚的尾巴狠狠抽击，有概率眩晕',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      4: [
        {
          name: '九尾天华',
          description: '九尾齐出，释放毁天灭地的灵光',
          cooldown: 6,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '灵狐·通灵',
          statGrowth: { attack: 1.15, speed: 1.1, defense: 1.05, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '灵狐·开智',
          statGrowth: { attack: 1.2, speed: 1.2, defense: 1.1, maxHp: 1.15, hp: 1.15 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '三尾灵狐',
          statGrowth: { attack: 1.3, speed: 1.2, defense: 1.1, maxHp: 1.15, hp: 1.15 },
        },
        {
          stage: 3,
          speciesName: '六尾灵狐',
          statGrowth: { attack: 1.4, speed: 1.35, defense: 1.15, maxHp: 1.2, hp: 1.2 },
        },
        {
          stage: 4,
          speciesName: '九尾天狐',
          statGrowth: { attack: 1.6, speed: 1.5, defense: 1.25, maxHp: 1.3, hp: 1.3 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '妖狐',
          statGrowth: { attack: 1.35, speed: 1.15, defense: 1.05, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '噬魂妖狐',
          statGrowth: { attack: 1.5, speed: 1.3, defense: 1.1, maxHp: 1.15, hp: 1.15 },
        },
      ],
    },
    locationIds: ['outside_forest', 'spirit_valley'],
    favoriteFoods: ['灵兽肉', '灵果'],
  },

  herb_rabbit: {
    id: 'herb_rabbit',
    name: '药兔',
    species: '药兔',
    description: '一只毛茸茸的小白兔，天生对灵草有敏锐的嗅觉。性格温顺，擅长治疗和寻找灵药。',
    realmMin: 0,
    realmMax: 7,
    baseStats: { hp: 50, maxHp: 50, attack: 5, defense: 6, speed: 22 },
    stageSkills: {
      1: [
        { name: '治愈术', description: '以灵气治愈主人伤势', cooldown: 3, currentCooldown: 0 },
        {
          name: '灵草嗅觉',
          description: '帮助主人发现隐藏的灵草',
          cooldown: 5,
          currentCooldown: 0,
        },
      ],
      2: [
        {
          name: '兔跃闪避',
          description: '灵巧跳跃，提升闪避能力',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      3: [
        {
          name: '月华天降',
          description: '引动月华之力，大幅恢复生命',
          cooldown: 6,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '药兔·灵嗅',
          statGrowth: { maxHp: 1.15, speed: 1.1, defense: 1.1, hp: 1.15 },
        },
        {
          stage: 3,
          speciesName: '药兔·丹心',
          statGrowth: { maxHp: 1.2, speed: 1.15, defense: 1.15, hp: 1.2 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '灵兔',
          statGrowth: { maxHp: 1.25, speed: 1.2, defense: 1.2, hp: 1.25 },
        },
        {
          stage: 3,
          speciesName: '月宫玉兔',
          statGrowth: { maxHp: 1.4, speed: 1.35, defense: 1.3, hp: 1.4 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '毒兔',
          statGrowth: { attack: 1.5, speed: 1.1, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '瘟疫魔兔',
          statGrowth: { attack: 1.8, speed: 1.2, maxHp: 1.15, hp: 1.15 },
        },
      ],
    },
    locationIds: ['outside_forest', 'spirit_valley'],
    favoriteFoods: ['灵草', '灵果'],
  },

  mystic_turtle: {
    id: 'mystic_turtle',
    name: '玄龟',
    species: '玄龟',
    description: '一只背甲泛着幽光的幼龟，性情沉稳。防御力极强，拥有玄武血脉的稀薄传承。',
    realmMin: 2,
    realmMax: 11,
    baseStats: { hp: 120, maxHp: 120, attack: 10, defense: 25, speed: 8 },
    stageSkills: {
      1: [
        {
          name: '龟甲护盾',
          description: '缩入龟壳之中，大幅提升防御',
          cooldown: 3,
          currentCooldown: 0,
        },
        { name: '水弹术', description: '喷出一颗水弹攻击敌人', cooldown: 2, currentCooldown: 0 },
      ],
      2: [
        {
          name: '灵水疗愈',
          description: '引灵水之力缓缓恢复生命',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      3: [
        {
          name: '玄武之怒',
          description: '释放玄武血脉的愤怒，造成大量伤害',
          cooldown: 5,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '玄龟·凝甲',
          statGrowth: { defense: 1.25, maxHp: 1.15, hp: 1.15 },
        },
        {
          stage: 3,
          speciesName: '玄龟·固元',
          statGrowth: { defense: 1.3, maxHp: 1.2, attack: 1.1, hp: 1.2 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '玄武幼体',
          statGrowth: { defense: 1.35, maxHp: 1.3, attack: 1.15, hp: 1.3 },
        },
        {
          stage: 3,
          speciesName: '玄武灵龟',
          statGrowth: { defense: 1.5, maxHp: 1.4, attack: 1.25, speed: 1.2, hp: 1.4 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '煞龟',
          statGrowth: { attack: 1.3, defense: 1.2, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '血甲玄龟',
          statGrowth: { attack: 1.5, defense: 1.3, maxHp: 1.2, hp: 1.2 },
        },
      ],
    },
    locationIds: ['spirit_valley'],
    favoriteFoods: ['灵石碎片', '灵兽肉'],
  },

  // ---- 废弃矿洞 ----

  stone_ape: {
    id: 'stone_ape',
    name: '石猿',
    species: '石猿',
    description: '一只力大无穷的石猿幼崽，浑身覆盖着岩石般的硬皮。战力均衡，攻守兼备。',
    realmMin: 4,
    realmMax: 11,
    baseStats: { hp: 100, maxHp: 100, attack: 20, defense: 18, speed: 12 },
    stageSkills: {
      1: [
        { name: '巨力重击', description: '以巨大的力量猛击敌人', cooldown: 2, currentCooldown: 0 },
        {
          name: '石化皮肤',
          description: '将皮肤化为岩石，提升防御',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      2: [{ name: '地裂击', description: '轰击地面造成范围伤害', cooldown: 4, currentCooldown: 0 }],
      3: [
        {
          name: '齐天之力',
          description: '唤醒远古血脉，大幅提升攻防',
          cooldown: 5,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '石猿·通臂',
          statGrowth: { attack: 1.15, defense: 1.1, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '石猿·金刚',
          statGrowth: { attack: 1.25, defense: 1.2, maxHp: 1.15, hp: 1.15 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '通臂猿',
          statGrowth: { attack: 1.3, defense: 1.2, maxHp: 1.2, speed: 1.1, hp: 1.2 },
        },
        {
          stage: 3,
          speciesName: '齐天石猿',
          statGrowth: { attack: 1.5, defense: 1.35, maxHp: 1.3, speed: 1.2, hp: 1.3 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '狂暴猿',
          statGrowth: { attack: 1.4, defense: 1.05, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '混世魔猿',
          statGrowth: { attack: 1.6, defense: 1.1, maxHp: 1.15, hp: 1.15 },
        },
      ],
    },
    locationIds: ['abandoned_mine', 'outside_forest'],
    favoriteFoods: ['灵果', '矿石'],
  },

  flame_tiger: {
    id: 'flame_tiger',
    name: '炎虎',
    species: '炎虎',
    description: '一只浑身缭绕着火焰的幼虎，眼神中透着王者威严。攻击力极强，是战场上的毁灭者。',
    realmMin: 4,
    realmMax: 11,
    baseStats: { hp: 90, maxHp: 90, attack: 25, defense: 12, speed: 18 },
    stageSkills: {
      1: [
        { name: '烈焰爪击', description: '以燃烧的利爪撕裂敌人', cooldown: 2, currentCooldown: 0 },
        {
          name: '虎啸震慑',
          description: '发出震天虎啸，震慑敌人降低防御',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      2: [
        {
          name: '炎爆',
          description: '释放压缩火焰造成爆炸伤害并灼烧',
          cooldown: 3,
          currentCooldown: 0,
        },
      ],
      3: [
        {
          name: '圣焰洗礼',
          description: '以神圣火焰净化战场，造成范围伤害',
          cooldown: 5,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '炎虎·怒焰',
          statGrowth: { attack: 1.2, speed: 1.1, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '炎虎·焚天',
          statGrowth: { attack: 1.3, speed: 1.15, defense: 1.1, maxHp: 1.15, hp: 1.15 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '烈焰虎',
          statGrowth: { attack: 1.35, speed: 1.2, maxHp: 1.2, hp: 1.2 },
        },
        {
          stage: 3,
          speciesName: '天焰圣虎',
          statGrowth: { attack: 1.55, speed: 1.35, defense: 1.2, maxHp: 1.3, hp: 1.3 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '狱火虎',
          statGrowth: { attack: 1.4, defense: 1.05, maxHp: 1.05, hp: 1.05 },
        },
        {
          stage: 3,
          speciesName: '炼狱魔虎',
          statGrowth: { attack: 1.65, defense: 1.05, maxHp: 1.1, hp: 1.1 },
        },
      ],
    },
    locationIds: ['abandoned_mine'],
    favoriteFoods: ['灵兽肉', '妖兽精华'],
  },

  // ---- 古修洞府 ----

  thunder_roc: {
    id: 'thunder_roc',
    name: '雷鹏',
    species: '雷鹏',
    description: '一只羽翼间闪烁着电光的幼鹏，速度快如闪电。擅长雷系法术，能在战场上来去如风。',
    realmMin: 8,
    realmMax: 15,
    baseStats: { hp: 85, maxHp: 85, attack: 24, defense: 10, speed: 30 },
    stageSkills: {
      1: [
        {
          name: '雷霆万钧',
          description: '召唤雷电轰击敌人，有概率麻痹',
          cooldown: 3,
          currentCooldown: 0,
        },
        { name: '风驰电掣', description: '以雷电之力加速行动', cooldown: 3, currentCooldown: 0 },
      ],
      2: [{ name: '雷击', description: '释放范围雷电攻击', cooldown: 4, currentCooldown: 0 }],
      3: [
        {
          name: '九天雷劫',
          description: '引动九天之上的雷霆，造成毁灭性打击',
          cooldown: 6,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '雷鹏·疾电',
          statGrowth: { speed: 1.2, attack: 1.15, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '雷鹏·惊雷',
          statGrowth: { speed: 1.3, attack: 1.25, maxHp: 1.15, hp: 1.15 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '雷霆鹏',
          statGrowth: { speed: 1.35, attack: 1.3, maxHp: 1.2, defense: 1.1, hp: 1.2 },
        },
        {
          stage: 3,
          speciesName: '九天雷鹏',
          statGrowth: { speed: 1.5, attack: 1.45, maxHp: 1.3, defense: 1.2, hp: 1.3 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '血雷鹏',
          statGrowth: { attack: 1.4, speed: 1.15, maxHp: 1.05, hp: 1.05 },
        },
        {
          stage: 3,
          speciesName: '天罚雷鹏',
          statGrowth: { attack: 1.6, speed: 1.25, maxHp: 1.1, hp: 1.1 },
        },
      ],
    },
    locationIds: ['ancient_cave'],
    favoriteFoods: ['雷晶', '灵兽肉'],
  },

  ice_phoenix: {
    id: 'ice_phoenix',
    name: '冰凤',
    species: '冰凤',
    description: '一只羽翼晶莹剔透的幼凤，周身散发着凛冽寒气。拥有凤凰血脉，掌握冰系神通。',
    realmMin: 8,
    realmMax: 15,
    baseStats: { hp: 100, maxHp: 100, attack: 28, defense: 15, speed: 22 },
    stageSkills: {
      1: [
        {
          name: '冰晶风暴',
          description: '掀起冰晶风暴攻击所有敌人',
          cooldown: 3,
          currentCooldown: 0,
        },
        {
          name: '凤鸣',
          description: '发出凤鸣之音，降低敌人速度',
          cooldown: 4,
          currentCooldown: 0,
        },
      ],
      2: [
        { name: '冰甲', description: '以寒冰凝聚护甲，提升防御', cooldown: 4, currentCooldown: 0 },
      ],
      3: [
        {
          name: '涅槃重生',
          description: '浴冰重生，大幅恢复生命',
          cooldown: 8,
          currentCooldown: 0,
        },
      ],
      4: [
        {
          name: '九天玄冰',
          description: '释放至寒玄冰，冻结一切',
          cooldown: 6,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '冰凤·凝华',
          statGrowth: { attack: 1.2, defense: 1.1, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '冰凤·天寒',
          statGrowth: { attack: 1.3, defense: 1.2, maxHp: 1.15, hp: 1.15 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '寒冰凤',
          statGrowth: { attack: 1.35, defense: 1.2, speed: 1.1, maxHp: 1.2, hp: 1.2 },
        },
        {
          stage: 3,
          speciesName: '冰晶凤凰',
          statGrowth: { attack: 1.5, defense: 1.3, speed: 1.2, maxHp: 1.3, hp: 1.3 },
        },
        {
          stage: 4,
          speciesName: '九天玄凤',
          statGrowth: { attack: 1.7, defense: 1.4, speed: 1.35, maxHp: 1.4, hp: 1.4 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '冥凤',
          statGrowth: { attack: 1.4, speed: 1.1, maxHp: 1.1, hp: 1.1 },
        },
        {
          stage: 3,
          speciesName: '幽冥冰凤',
          statGrowth: { attack: 1.6, speed: 1.2, maxHp: 1.15, hp: 1.15 },
        },
      ],
    },
    locationIds: ['ancient_cave'],
    favoriteFoods: ['冰晶', '灵果'],
  },

  ancient_dragon: {
    id: 'ancient_dragon',
    name: '古龙',
    species: '古龙',
    description:
      '一条沉睡万年后苏醒的幼龙，鳞片闪烁着古老符文的光芒。拥有纯正的龙族血脉，潜力无穷。',
    realmMin: 12,
    realmMax: 19,
    baseStats: { hp: 150, maxHp: 150, attack: 30, defense: 22, speed: 15 },
    stageSkills: {
      1: [
        { name: '龙息', description: '喷出龙息焚烧敌人', cooldown: 3, currentCooldown: 0 },
        {
          name: '龙威',
          description: '释放龙族威压，降低敌人全属性',
          cooldown: 5,
          currentCooldown: 0,
        },
      ],
      2: [
        {
          name: '龙鳞护体',
          description: '龙鳞硬化，提升防御并反弹伤害',
          cooldown: 5,
          currentCooldown: 0,
        },
      ],
      3: [
        {
          name: '呼风唤雨',
          description: '改变战场天气，获得全局优势',
          cooldown: 6,
          currentCooldown: 0,
        },
      ],
      4: [
        {
          name: '神龙降世',
          description: '显现真龙之身，造成毁灭性打击',
          cooldown: 8,
          currentCooldown: 0,
        },
      ],
    },
    evolutionChain: {
      normal: [
        {
          stage: 2,
          speciesName: '古龙·觉醒',
          statGrowth: { attack: 1.2, defense: 1.15, maxHp: 1.15, hp: 1.15 },
        },
        {
          stage: 3,
          speciesName: '古龙·通天',
          statGrowth: { attack: 1.35, defense: 1.25, maxHp: 1.25, speed: 1.1, hp: 1.25 },
        },
      ],
      divine: [
        {
          stage: 2,
          speciesName: '幼龙',
          statGrowth: { attack: 1.3, defense: 1.25, maxHp: 1.25, speed: 1.1, hp: 1.25 },
        },
        {
          stage: 3,
          speciesName: '真龙',
          statGrowth: { attack: 1.5, defense: 1.4, maxHp: 1.4, speed: 1.2, hp: 1.4 },
        },
        {
          stage: 4,
          speciesName: '远古神龙',
          statGrowth: { attack: 1.8, defense: 1.6, maxHp: 1.6, speed: 1.35, hp: 1.6 },
        },
      ],
      demonic: [
        {
          stage: 2,
          speciesName: '魔龙',
          statGrowth: { attack: 1.4, defense: 1.1, maxHp: 1.15, hp: 1.15 },
        },
        {
          stage: 3,
          speciesName: '灭世魔龙',
          statGrowth: { attack: 1.7, defense: 1.2, maxHp: 1.25, hp: 1.25 },
        },
      ],
    },
    locationIds: ['ancient_cave'],
    favoriteFoods: ['龙晶', '妖兽精华'],
  },
};

// ==================== 位置宠物映射 ====================

const LOCATION_PETS: Record<string, string[]> = {
  outside_forest: ['spirit_fox', 'herb_rabbit', 'stone_ape'],
  spirit_valley: ['spirit_fox', 'herb_rabbit', 'mystic_turtle'],
  abandoned_mine: ['stone_ape', 'flame_tiger'],
  ancient_cave: ['thunder_roc', 'ice_phoenix', 'ancient_dragon'],
};

// ==================== 查询函数 ====================

/** 根据模板 ID 获取灵宠模板（深拷贝） */
export function getPetTemplateById(id: string): PetTemplate | undefined {
  const template = PET_TEMPLATES[id];
  if (!template) return undefined;
  return structuredClone(template);
}

/** 根据物种名查找模板（用于进化时根据当前 species 回溯模板） */
export function getPetTemplateBySpecies(species: string): PetTemplate | undefined {
  // 精确匹配
  const exact = Object.values(PET_TEMPLATES).find((t) => t.species === species);
  if (exact) return exact;
  // 去掉进化后缀（如 "灵狐·通灵" -> "灵狐"）
  const baseName = species.split('·')[0];
  if (baseName !== species) {
    const bySplit = Object.values(PET_TEMPLATES).find((t) => t.species === baseName);
    if (bySplit) return bySplit;
  }
  // 检查是否包含任意模板的物种名（如 "三尾灵狐" 包含 "灵狐"）
  for (const t of Object.values(PET_TEMPLATES)) {
    if (species.includes(t.species)) return t;
  }
  return undefined;
}

/** 获取某个位置的灵宠列表 */
export function getPetsByLocation(locationId: string): PetTemplate[] {
  const petIds = LOCATION_PETS[locationId];
  if (!petIds) return [];
  return petIds
    .map((id) => PET_TEMPLATES[id])
    .filter((p): p is PetTemplate => p !== undefined)
    .map((p) => structuredClone(p));
}

/** 根据境界区间筛选灵宠 */
export function getPetsByRealmRange(minIndex: number, maxIndex: number): PetTemplate[] {
  return Object.values(PET_TEMPLATES)
    .filter((p) => p.realmMin <= maxIndex && p.realmMax >= minIndex)
    .map((p) => structuredClone(p));
}

/** 获取所有灵宠模板 ID */
export function getAllPetIds(): string[] {
  return Object.keys(PET_TEMPLATES);
}

/** 根据模板创建 SpiritPet 实例 */
export function createPetFromTemplate(
  templateId: string,
  level: number,
  customName?: string
): SpiritPet | undefined {
  const template = getPetTemplateById(templateId);
  if (!template) return undefined;

  const baseStats = { ...template.baseStats };
  // 每升一级属性提升 8%
  const levelMultiplier = 1 + (level - 1) * 0.08;

  return {
    templateId: template.id,
    id: `${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: customName ?? template.name,
    species: template.species,
    level,
    loyalty: 50,
    stats: {
      hp: Math.round(baseStats.hp * levelMultiplier),
      maxHp: Math.round(baseStats.maxHp * levelMultiplier),
      attack: Math.round(baseStats.attack * levelMultiplier),
      defense: Math.round(baseStats.defense * levelMultiplier),
      speed: Math.round(baseStats.speed * levelMultiplier),
    },
    skills: (template.stageSkills[1] ?? []).map((s) => ({ ...s, currentCooldown: 0 })),
    evolutionStage: 1,
    evolutionPath: 'normal',
    description: template.description,
  };
}
