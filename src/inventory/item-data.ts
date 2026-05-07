// ============================================================
// 物品/装备模板数据库
// 所有物品和装备的静态数据定义，按 ID 索引
// ============================================================

import type {
  ArmorType,
  Equipment,
  GameItem,
  ItemGrade,
  ItemType,
  SpecialEffect,
  TreasureType,
  WeaponType,
} from '../game/types';

// ==================== 辅助函数 ====================

function s(trigger: SpecialEffect['trigger'], effect: string, value: number): SpecialEffect {
  return { trigger, effect, value };
}

/** 按品质返回灵石价值乘数 */
function gradeValueMultiplier(grade: ItemGrade): number {
  const map: Record<ItemGrade, number> = {
    凡品: 1,
    灵品: 3,
    宝品: 10,
    仙品: 30,
    神品: 100,
  };
  return map[grade];
}

// ==================== 装备数据库 ====================

export const ALL_EQUIPMENT: Equipment[] = [
  // ==================== 武器 (weapon) ====================

  // ---- 炼气期 ----
  {
    id: 'rusty_sword',
    name: '生锈铁剑',
    type: 'equipment',
    slot: 'weapon',
    subtype: '飞剑' as WeaponType,
    grade: '凡品',
    stats: { maxHp: 5 },
    realmRequirement: 0,
    durability: 50,
    maxDurability: 50,
    specialEffects: [],
    description: '一把普通铁剑，剑身已有些许锈迹，聊胜于无。',
  },
  {
    id: 'spirit_wood_staff',
    name: '灵木杖',
    type: 'equipment',
    slot: 'weapon',
    subtype: '法杖' as WeaponType,
    grade: '凡品',
    stats: { maxQi: 10 },
    realmRequirement: 0,
    durability: 40,
    maxDurability: 40,
    specialEffects: [],
    description: '以灵木削成的法杖，能略微增强灵力引导。',
  },
  {
    id: 'cold_iron_sword',
    name: '寒铁剑',
    type: 'equipment',
    slot: 'weapon',
    subtype: '飞剑' as WeaponType,
    grade: '灵品',
    stats: { maxHp: 15, maxStamina: 5 },
    realmRequirement: 2,
    durability: 70,
    maxDurability: 70,
    specialEffects: [s('on_attack', '寒气附着', 5)],
    description: '寒铁锻造的飞剑，剑锋过处寒气逼人。',
  },
  {
    id: 'flame_blade',
    name: '烈焰刀',
    type: 'equipment',
    slot: 'weapon',
    subtype: '刀' as WeaponType,
    grade: '灵品',
    stats: { maxHp: 12, maxStamina: 8 },
    realmRequirement: 3,
    durability: 65,
    maxDurability: 65,
    specialEffects: [s('on_attack', '烈焰灼烧', 8)],
    description: '刀身暗红，蕴含火属性灵力，挥舞时热浪翻滚。',
  },

  // ---- 筑基期 ----
  {
    id: 'azure_cloud_sword',
    name: '青云剑',
    type: 'equipment',
    slot: 'weapon',
    subtype: '飞剑' as WeaponType,
    grade: '灵品',
    stats: { maxHp: 25, maxStamina: 10 },
    realmRequirement: 4,
    durability: 90,
    maxDurability: 90,
    specialEffects: [s('on_attack', '风刃附加', 12)],
    description: '青云宗标配飞剑，剑身泛着青色剑芒，轻盈锋利。',
  },
  {
    id: 'jade_fan',
    name: '碧玉扇',
    type: 'equipment',
    slot: 'weapon',
    subtype: '扇' as WeaponType,
    grade: '灵品',
    stats: { maxQi: 25, maxStamina: 5 },
    realmRequirement: 5,
    durability: 75,
    maxDurability: 75,
    specialEffects: [s('on_attack', '灵风拂面', 10)],
    description: '碧玉为骨、灵丝为面的法扇，扇动间灵力流转。',
  },

  // ---- 金丹期 ----
  {
    id: 'purple_lightning_sword',
    name: '紫电飞剑',
    type: 'equipment',
    slot: 'weapon',
    subtype: '飞剑' as WeaponType,
    grade: '宝品',
    stats: { maxHp: 40, maxStamina: 15, maxQi: 15 },
    realmRequirement: 8,
    durability: 110,
    maxDurability: 110,
    specialEffects: [s('on_attack', '紫电雷击', 25)],
    description: '剑身缠绕紫色电弧，传说是上古雷修的本命飞剑。',
  },
  {
    id: 'five_element_staff',
    name: '五行法杖',
    type: 'equipment',
    slot: 'weapon',
    subtype: '法杖' as WeaponType,
    grade: '宝品',
    stats: { maxQi: 35, maxStamina: 10 },
    realmRequirement: 8,
    durability: 100,
    maxDurability: 100,
    specialEffects: [s('on_attack', '五行轮转', 20), s('on_cultivate', '五行共鸣', 3)],
    description: '蕴含金木水火土五行之力的法杖，修炼时能引发五行共鸣。',
  },
  {
    id: 'frost_soul_flute',
    name: '冰魄玉笛',
    type: 'equipment',
    slot: 'weapon',
    subtype: '笛' as WeaponType,
    grade: '宝品',
    stats: { maxQi: 30, maxStamina: 9 },
    realmRequirement: 9,
    durability: 95,
    maxDurability: 95,
    specialEffects: [s('on_attack', '冰魄之音', 22)],
    description: '以万年寒玉雕琢而成的玉笛，笛声可摄人心魄。',
  },

  // ---- 元婴期 ----
  {
    id: 'starry_sky_sword',
    name: '星河神剑',
    type: 'equipment',
    slot: 'weapon',
    subtype: '飞剑' as WeaponType,
    grade: '宝品',
    stats: { maxHp: 55, maxStamina: 20, maxQi: 20 },
    realmRequirement: 12,
    durability: 130,
    maxDurability: 130,
    specialEffects: [s('on_attack', '星河倾泻', 35), s('on_cultivate', '星辰共鸣', 5)],
    description: '剑身如星河璀璨，挥动时似有万千星辰随行。',
  },
  {
    id: 'thunder_king_hammer',
    name: '雷帝锤',
    type: 'equipment',
    slot: 'weapon',
    subtype: '刀' as WeaponType,
    grade: '仙品',
    stats: { maxHp: 70, maxStamina: 30, maxQi: 25 },
    realmRequirement: 14,
    durability: 160,
    maxDurability: 160,
    specialEffects: [s('on_attack', '雷帝之怒', 50), s('passive', '雷霆护体', 5)],
    description: '传说中的雷帝遗宝，锤身缠绕无尽雷霆，一击可碎山河。',
  },

  // ---- 炼气期符文 ----
  {
    id: 'basic_talisman',
    name: '基础符箓',
    type: 'equipment',
    slot: 'weapon',
    subtype: '符箓' as WeaponType,
    grade: '凡品',
    stats: { maxQi: 8 },
    realmRequirement: 0,
    durability: 30,
    maxDurability: 30,
    specialEffects: [],
    description: '入门级攻击符箓，刻有简单的灵力阵法。',
  },
  {
    id: 'flame_talisman',
    name: '烈焰符',
    type: 'equipment',
    slot: 'weapon',
    subtype: '符箓' as WeaponType,
    grade: '灵品',
    stats: { maxQi: 18, maxStamina: 5 },
    realmRequirement: 3,
    durability: 50,
    maxDurability: 50,
    specialEffects: [s('on_attack', '烈焰焚烧', 10)],
    description: '绘有烈焰阵法的符箓，祭出后可召唤烈火。',
  },

  // ==================== 护甲 (armor) ====================

  {
    id: 'cloth_robe',
    name: '粗布道袍',
    type: 'equipment',
    slot: 'armor',
    subtype: '法袍' as ArmorType,
    grade: '凡品',
    stats: { maxHp: 5, maxStamina: 3 },
    realmRequirement: 0,
    durability: 50,
    maxDurability: 50,
    specialEffects: [],
    description: '普通粗布制成的道袍，勉强有些许防御力。',
  },
  {
    id: 'spirit_silk_robe',
    name: '灵丝法袍',
    type: 'equipment',
    slot: 'armor',
    subtype: '法袍' as ArmorType,
    grade: '灵品',
    stats: { maxHp: 15, maxQi: 10 },
    realmRequirement: 2,
    durability: 70,
    maxDurability: 70,
    specialEffects: [],
    description: '以灵蚕丝织就的法袍，质轻而坚韧。',
  },
  {
    id: 'iron_wood_armor',
    name: '铁木灵甲',
    type: 'equipment',
    slot: 'armor',
    subtype: '灵甲' as ArmorType,
    grade: '灵品',
    stats: { maxHp: 20, maxStamina: 8 },
    realmRequirement: 4,
    durability: 90,
    maxDurability: 90,
    specialEffects: [],
    description: '以千年铁木打造的灵甲，坚固异常。',
  },
  {
    id: 'guardian_talisman_armor',
    name: '护身符衣',
    type: 'equipment',
    slot: 'armor',
    subtype: '护符' as ArmorType,
    grade: '灵品',
    stats: { maxHp: 18, maxQi: 15 },
    realmRequirement: 5,
    durability: 75,
    maxDurability: 75,
    specialEffects: [s('on_defend', '符光护体', 10)],
    description: '内衬多道护身符文的法衣，受到攻击时符光自动护体。',
  },
  {
    id: 'black_tortoise_armor',
    name: '玄武灵甲',
    type: 'equipment',
    slot: 'armor',
    subtype: '灵甲' as ArmorType,
    grade: '宝品',
    stats: { maxHp: 35, maxStamina: 15, maxQi: 10 },
    realmRequirement: 8,
    durability: 120,
    maxDurability: 120,
    specialEffects: [s('on_defend', '玄武护盾', 25), s('passive', '玄武坚韧', 5)],
    description: '蕴含玄武之力的灵甲，防御力惊人。',
  },
  {
    id: 'phoenix_feather_robe',
    name: '凤羽宝衣',
    type: 'equipment',
    slot: 'armor',
    subtype: '宝衣' as ArmorType,
    grade: '宝品',
    stats: { maxHp: 30, maxQi: 25, maxStamina: 10 },
    realmRequirement: 10,
    durability: 100,
    maxDurability: 100,
    specialEffects: [s('on_defend', '凤凰涅槃', 20), s('passive', '浴火重生', 3)],
    description: '以凤凰翎羽编织的宝衣，穿上后周身环绕淡淡的火光。',
  },
  {
    id: 'dragon_scale_armor',
    name: '龙鳞仙甲',
    type: 'equipment',
    slot: 'armor',
    subtype: '灵甲' as ArmorType,
    grade: '仙品',
    stats: { maxHp: 60, maxStamina: 25, maxQi: 20 },
    realmRequirement: 12,
    durability: 180,
    maxDurability: 180,
    specialEffects: [s('on_defend', '龙威震慑', 45), s('passive', '龙血沸腾', 8)],
    description: '以真龙鳞片铸造的仙甲，龙威浩荡，万法不侵。',
  },

  // ==================== 法宝 (treasure) ====================

  {
    id: 'spirit_gathering_bead',
    name: '聚灵珠',
    type: 'equipment',
    slot: 'treasure',
    subtype: '法宝' as TreasureType,
    grade: '灵品',
    stats: { maxQi: 15 },
    realmRequirement: 0,
    durability: 60,
    maxDurability: 60,
    specialEffects: [s('on_cultivate', '聚灵加速', 2)],
    description: '辅助修炼的法宝，可加速天地灵气汇聚。',
  },
  {
    id: 'heart_guard_mirror',
    name: '护心镜',
    type: 'equipment',
    slot: 'treasure',
    subtype: '灵宝' as TreasureType,
    grade: '灵品',
    stats: { maxHp: 15, maxStamina: 5 },
    realmRequirement: 3,
    durability: 80,
    maxDurability: 80,
    specialEffects: [s('on_defend', '镜光反射', 10)],
    description: '悬于胸前的护心宝镜，危急时刻可反射攻击。',
  },
  {
    id: 'soul_binding_ring',
    name: '缚灵环',
    type: 'equipment',
    slot: 'treasure',
    subtype: '法宝' as TreasureType,
    grade: '宝品',
    stats: { maxQi: 25, maxHp: 10 },
    realmRequirement: 8,
    durability: 100,
    maxDurability: 100,
    specialEffects: [s('on_attack', '缚灵缠绕', 15)],
    description: '可束缚敌人灵力流动的法宝，对法术类敌人尤为有效。',
  },
  {
    id: 'primordial_chaos_bead',
    name: '混沌珠',
    type: 'equipment',
    slot: 'treasure',
    subtype: '先天灵宝' as TreasureType,
    grade: '仙品',
    stats: { maxQi: 45, maxHp: 20, maxStamina: 10 },
    realmRequirement: 12,
    durability: 200,
    maxDurability: 200,
    specialEffects: [s('on_cultivate', '混沌悟道', 10), s('passive', '混沌护体', 8)],
    description: '先天混沌之气凝结而成的宝珠，蕴含大道至理。',
  },
  {
    id: 'pangu_seal',
    name: '盘古印',
    type: 'equipment',
    slot: 'treasure',
    subtype: '先天灵宝' as TreasureType,
    grade: '神品',
    stats: { maxHp: 60, maxQi: 50, maxStamina: 30 },
    realmRequirement: 16,
    durability: 300,
    maxDurability: 300,
    specialEffects: [
      s('on_attack', '开天辟地', 80),
      s('on_defend', '混沌壁垒', 60),
      s('passive', '盘古之力', 15),
    ],
    description: '上古盘古大神遗留的至宝，蕴含开天辟地之力。',
  },

  // ==================== 饰品 (accessory) ====================

  {
    id: 'spirit_stone_ring',
    name: '灵石戒指',
    type: 'equipment',
    slot: 'accessory',
    subtype: '符箓' as WeaponType,
    grade: '凡品',
    stats: { maxQi: 5 },
    realmRequirement: 0,
    durability: 40,
    maxDurability: 40,
    specialEffects: [],
    description: '镶嵌小颗灵石的戒指，略微增强灵力恢复。',
  },
  {
    id: 'jade_pendant',
    name: '青玉佩',
    type: 'equipment',
    slot: 'accessory',
    subtype: '护符' as ArmorType,
    grade: '灵品',
    stats: { maxHp: 10, maxStamina: 5 },
    realmRequirement: 0,
    durability: 60,
    maxDurability: 60,
    specialEffects: [],
    description: '青色玉佩，温润养人，佩戴后可强身健体。',
  },
  {
    id: 'destiny_jade',
    name: '天机玉佩',
    type: 'equipment',
    slot: 'accessory',
    subtype: '护符' as ArmorType,
    grade: '宝品',
    stats: { maxHp: 20, maxQi: 20, maxStamina: 10 },
    realmRequirement: 8,
    durability: 100,
    maxDurability: 100,
    specialEffects: [s('on_cultivate', '天机感应', 5), s('passive', '趋吉避凶', 3)],
    description: '蕴含天机的玉佩，能在冥冥中指引佩戴者趋吉避凶。',
  },
  {
    id: 'phoenix_feather_ring',
    name: '凤翎戒',
    type: 'equipment',
    slot: 'accessory',
    subtype: '法宝' as TreasureType,
    grade: '宝品',
    stats: { maxQi: 25, maxStamina: 8 },
    realmRequirement: 10,
    durability: 90,
    maxDurability: 90,
    specialEffects: [s('passive', '凤火护主', 5)],
    description: '以凤凰翎羽炼制的戒指，危急时凤火自动护主。',
  },
  {
    id: 'dragon_soul_bracelet',
    name: '龙魂手镯',
    type: 'equipment',
    slot: 'accessory',
    subtype: '先天灵宝' as TreasureType,
    grade: '仙品',
    stats: { maxHp: 35, maxQi: 30, maxStamina: 15 },
    realmRequirement: 14,
    durability: 160,
    maxDurability: 160,
    specialEffects: [s('on_attack', '龙魂咆哮', 40), s('on_cultivate', '龙魂共鸣', 8)],
    description: '封印了远古龙魂的手镯，佩戴者能借用龙魂之力。',
  },
];

// ==================== 消耗品/材料数据库 ====================

export const ALL_ITEMS: GameItem[] = [
  // ==================== 消耗品 — 回复类 ====================
  {
    id: 'revival_pill',
    name: '回春丹',
    type: 'consumable',
    subtype: '回复',
    description: '基础疗伤丹药，服用后可回复一定生命值。',
    quantity: 1,
    effects: [{ attribute: 'hp', operation: 'add', value: 30, duration: 'instant' }],
    value: 10,
    stackable: true,
    maxStack: 20,
  },
  {
    id: 'spirit_gathering_pill',
    name: '聚灵丹',
    type: 'consumable',
    subtype: '回复',
    description: '回复灵力的常用丹药，修炼者必备。',
    quantity: 1,
    effects: [{ attribute: 'qi', operation: 'add', value: 30, duration: 'instant' }],
    value: 10,
    stackable: true,
    maxStack: 20,
  },
  {
    id: 'life_saving_pill',
    name: '续命丹',
    type: 'consumable',
    subtype: '回复',
    description: '高级疗伤丹药，可同时回复生命与灵力。',
    quantity: 1,
    effects: [
      { attribute: 'hp', operation: 'add', value: 50, duration: 'instant' },
      { attribute: 'qi', operation: 'add', value: 50, duration: 'instant' },
    ],
    value: 40,
    stackable: true,
    maxStack: 10,
  },
  {
    id: 'stamina_pill',
    name: '强体丹',
    type: 'consumable',
    subtype: '回复',
    description: '回复体力的丹药，战斗后服用可迅速恢复。',
    quantity: 1,
    effects: [{ attribute: 'stamina', operation: 'add', value: 40, duration: 'instant' }],
    value: 12,
    stackable: true,
    maxStack: 20,
  },
  {
    id: 'supreme_revival_pill',
    name: '大还丹',
    type: 'consumable',
    subtype: '回复',
    description: '顶级回复丹药，可大幅回复生命、灵力和体力。',
    quantity: 1,
    effects: [
      { attribute: 'hp', operation: 'add', value: 100, duration: 'instant' },
      { attribute: 'qi', operation: 'add', value: 80, duration: 'instant' },
      { attribute: 'stamina', operation: 'add', value: 60, duration: 'instant' },
    ],
    value: 100,
    stackable: true,
    maxStack: 5,
  },

  // ==================== 消耗品 — 永久增幅类 ====================
  {
    id: 'body_tempering_pill',
    name: '淬体丹',
    type: 'consumable',
    subtype: '增幅',
    description: '淬炼体魄的丹药，永久提升生命上限。',
    quantity: 1,
    effects: [{ attribute: 'maxHp', operation: 'add', value: 10, duration: 'permanent' }],
    value: 50,
    stackable: true,
    maxStack: 10,
  },
  {
    id: 'spirit_focus_pill',
    name: '凝神丹',
    type: 'consumable',
    subtype: '增幅',
    description: '稳固心神的丹药，永久提升意志力。',
    quantity: 1,
    effects: [{ attribute: 'willpower', operation: 'add', value: 5, duration: 'permanent' }],
    value: 60,
    stackable: true,
    maxStack: 10,
  },
  {
    id: 'foundation_establishing_pill',
    name: '筑基丹',
    type: 'consumable',
    subtype: '增幅',
    description: '大幅提升修炼进度的珍贵丹药，突破时服用可增加成功几率。',
    quantity: 1,
    effects: [{ attribute: 'cultivation', operation: 'add', value: 40, duration: 'instant' }],
    value: 150,
    stackable: true,
    maxStack: 5,
  },
  {
    id: 'golden_core_pill',
    name: '结金丹',
    type: 'consumable',
    subtype: '增幅',
    description: '金丹期修士梦寐以求的丹药，服用后可大幅推进修炼。',
    quantity: 1,
    effects: [
      { attribute: 'cultivation', operation: 'add', value: 60, duration: 'instant' },
      { attribute: 'willpower', operation: 'add', value: 3, duration: 'permanent' },
    ],
    value: 300,
    stackable: true,
    maxStack: 3,
  },

  // ==================== 消耗品 — 解毒清心类 ====================
  {
    id: 'detox_pill',
    name: '解毒丹',
    type: 'consumable',
    subtype: '解毒',
    description: '可解常见毒性的丹药。',
    quantity: 1,
    effects: [{ attribute: 'hp', operation: 'add', value: 10, duration: 'instant' }],
    value: 15,
    stackable: true,
    maxStack: 20,
  },
  {
    id: 'mind_clearing_pill',
    name: '清心丹',
    type: 'consumable',
    subtype: '清心',
    description: '清除心魔杂念，修炼前服用可稳定心神。',
    quantity: 1,
    effects: [{ attribute: 'willpower', operation: 'add', value: 8, duration: 'combat' }],
    value: 20,
    stackable: true,
    maxStack: 15,
  },

  // ==================== 材料 — 灵草类 ====================
  {
    id: 'spirit_herb',
    name: '聚灵草',
    type: 'material',
    subtype: '灵草',
    description: '蕴含稀薄灵气的药草，是炼丹的基础材料。',
    quantity: 1,
    effects: [],
    value: 5,
    stackable: true,
    maxStack: 50,
  },
  {
    id: 'blood_soul_flower',
    name: '血魂花',
    type: 'material',
    subtype: '灵草',
    description: '生长在灵气浓郁之地的血色花朵，可入药炼制高级丹药。',
    quantity: 1,
    effects: [],
    value: 20,
    stackable: true,
    maxStack: 30,
  },
  {
    id: 'heavenly_heart_orchid',
    name: '天心兰',
    type: 'material',
    subtype: '灵草',
    description: '传说中可增强悟性的珍稀兰花。',
    quantity: 1,
    effects: [{ attribute: 'cultivation', operation: 'add', value: 10, duration: 'instant' }],
    value: 80,
    stackable: true,
    maxStack: 10,
  },
  {
    id: 'ice_soul_grass',
    name: '冰魄草',
    type: 'material',
    subtype: '灵草',
    description: '生长于极寒之地的灵草，散发刺骨寒意。',
    quantity: 1,
    effects: [],
    value: 15,
    stackable: true,
    maxStack: 30,
  },

  // ==================== 材料 — 矿石类 ====================
  {
    id: 'spirit_stone_fragment',
    name: '灵石碎片',
    type: 'material',
    subtype: '矿石',
    description: '灵石矿中开采的碎片，蕴含微量灵力，可用于交易。',
    quantity: 1,
    effects: [],
    value: 3,
    stackable: true,
    maxStack: 100,
  },
  {
    id: 'dark_iron_essence',
    name: '玄铁精',
    type: 'material',
    subtype: '矿石',
    description: '提炼自玄铁的精华，是锻造灵器的优质材料。',
    quantity: 1,
    effects: [],
    value: 25,
    stackable: true,
    maxStack: 30,
  },
  {
    id: 'celestial_meteor_iron',
    name: '天外陨铁',
    type: 'material',
    subtype: '矿石',
    description: '天外陨落的奇异金属，蕴含星辰之力。',
    quantity: 1,
    effects: [],
    value: 60,
    stackable: true,
    maxStack: 15,
  },
  {
    id: 'spirit_jade_core',
    name: '灵玉髓',
    type: 'material',
    subtype: '矿石',
    description: '灵石矿脉核心产出的极品灵玉，是炼制法宝的核心材料。',
    quantity: 1,
    effects: [],
    value: 120,
    stackable: true,
    maxStack: 10,
  },

  // ==================== 材料 — 残卷类 ====================
  {
    id: 'technique_fragment',
    name: '功法残页',
    type: 'material',
    subtype: '残卷',
    description: '上古功法的残页，虽不完整但仍有参悟价值。',
    quantity: 1,
    effects: [{ attribute: 'cultivation', operation: 'add', value: 15, duration: 'instant' }],
    value: 30,
    stackable: true,
    maxStack: 20,
  },
  {
    id: 'alchemy_ancient_recipe',
    name: '炼丹古方',
    type: 'material',
    subtype: '残卷',
    description: '记载了古法炼丹之术的残破方子，可参悟炼丹之道。',
    quantity: 1,
    effects: [],
    value: 50,
    stackable: false,
    maxStack: 1,
  },
  {
    id: 'formation_diagram',
    name: '阵法图录',
    type: 'material',
    subtype: '残卷',
    description: '记载了上古阵法的图录，蕴含阵法至理。',
    quantity: 1,
    effects: [],
    value: 80,
    stackable: false,
    maxStack: 1,
  },
];

// ==================== 查找函数 ====================

const itemById = new Map<string, GameItem>();
const equipmentById = new Map<string, Equipment>();

for (const item of ALL_ITEMS) {
  itemById.set(item.id, item);
}
for (const eq of ALL_EQUIPMENT) {
  equipmentById.set(eq.id, eq);
}

/** 根据 ID 查找物品（消耗品、材料等） */
export function getItemById(id: string): GameItem | undefined {
  const item = itemById.get(id);
  return item ? { ...item } : undefined;
}

/** 根据 ID 查找装备 */
export function getEquipmentById(id: string): Equipment | undefined {
  const eq = equipmentById.get(id);
  return eq ? { ...eq, specialEffects: [...eq.specialEffects], stats: { ...eq.stats } } : undefined;
}

/** 根据类型获取物品列表 */
export function getItemsByType(type: ItemType): GameItem[] {
  return ALL_ITEMS.filter((i) => i.type === type).map((i) => ({ ...i }));
}

/** 根据槽位获取装备列表 */
export function getEquipmentBySlot(slot: string): Equipment[] {
  return ALL_EQUIPMENT.filter((e) => e.slot === slot).map((e) => ({
    ...e,
    specialEffects: [...e.specialEffects],
    stats: { ...e.stats },
  }));
}

/** 获取所有装备 ID */
export function getAllEquipmentIds(): string[] {
  return [...equipmentById.keys()];
}

/** 获取所有物品 ID */
export function getAllItemIds(): string[] {
  return [...itemById.keys()];
}

// ==================== NPC 商品列表 ====================

/** 根据 NPC ID 获取默认商店商品 */
export function getShopInventory(npcId: string): GameItem[] {
  switch (npcId) {
    case 'old_chen':
      // 苍梧城杂货铺老板 — 基础消耗品和材料
      return [
        'revival_pill',
        'spirit_gathering_pill',
        'stamina_pill',
        'detox_pill',
        'body_tempering_pill',
        'spirit_focus_pill',
        'spirit_herb',
        'spirit_stone_fragment',
        'dark_iron_essence',
        'technique_fragment',
      ]
        .map((id) => getItemById(id))
        .filter((i): i is GameItem => i !== undefined);
    case 'wang_steward':
      // 青云宗王执事 — 宗门专属物品 + 功法
      return [
        'revival_pill',
        'spirit_gathering_pill',
        'foundation_establishing_pill',
        'mind_clearing_pill',
        'spirit_herb',
        'blood_soul_flower',
        'spirit_stone_fragment',
        'technique_fragment',
      ]
        .map((id) => getItemById(id))
        .filter((i): i is GameItem => i !== undefined);
    default:
      // 默认商人库存
      return ['revival_pill', 'spirit_gathering_pill', 'spirit_herb']
        .map((id) => getItemById(id))
        .filter((i): i is GameItem => i !== undefined);
  }
}

/** 根据区域危险度生成随机掉落 */
export function getDefaultLoot(dangerLevel: number): GameItem[] {
  const loot: GameItem[] = [];
  const roll = Math.random;

  // 根据危险度决定掉落数量和品质
  const commonChance = Math.min(0.9, 0.3 + dangerLevel * 0.05);
  const rareChance = Math.min(0.5, dangerLevel * 0.05);
  const epicChance = Math.min(0.2, dangerLevel * 0.02);

  // 基础掉落：灵石碎片
  if (roll() < commonChance) {
    const qty = Math.floor(roll() * dangerLevel) + 1;
    const fragment = getItemById('spirit_stone_fragment');
    if (fragment) {
      fragment.quantity = qty;
      loot.push(fragment);
    }
  }

  // 常见掉落：聚灵草
  if (roll() < commonChance) {
    const qty = Math.floor(roll() * (dangerLevel / 2)) + 1;
    const herb = getItemById('spirit_herb');
    if (herb) {
      herb.quantity = qty;
      loot.push(herb);
    }
  }

  // 稀有掉落：丹药
  if (roll() < rareChance) {
    const pill = getItemById(roll() < 0.5 ? 'revival_pill' : 'spirit_gathering_pill');
    if (pill) {
      pill.quantity = Math.floor(roll() * 3) + 1;
      loot.push(pill);
    }
  }

  // 史诗掉落：特殊材料
  if (roll() < epicChance) {
    const materialIds = ['dark_iron_essence', 'blood_soul_flower', 'ice_soul_grass'];
    const id = materialIds[Math.floor(roll() * materialIds.length)]!;
    const mat = getItemById(id);
    if (mat) {
      mat.quantity = 1;
      loot.push(mat);
    }
  }

  return loot;
}

/** 获取装备的灵石价值 */
export function getEquipmentValue(eq: Equipment): number {
  const realmBonus = eq.realmRequirement * 5;
  const gradeBonus = gradeValueMultiplier(eq.grade) * 20;
  const effectBonus = eq.specialEffects.length * 15;
  return Math.round(realmBonus + gradeBonus + effectBonus);
}
