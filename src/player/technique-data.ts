// ============================================================
// 功法模板数据库
// 所有功法的静态数据定义，按 ID 索引
// ============================================================

import type { CombatSkill, ItemGrade, SpecialEffect, Technique } from '../game/types';

// ==================== 辅助函数 ====================

function s(trigger: SpecialEffect['trigger'], effect: string, value: number): SpecialEffect {
  return { trigger, effect, value };
}

function skill(
  name: string,
  damageMultiplier: number,
  qiCost: number,
  staminaCost: number,
  description: string,
  specialEffect?: SpecialEffect
): CombatSkill {
  const sk: CombatSkill = { name, damageMultiplier, qiCost, staminaCost, description };
  if (specialEffect) {
    sk.specialEffect = specialEffect;
  }
  return sk;
}

// ==================== 功法模板 ====================

interface TechniqueTemplate {
  id: string;
  name: string;
  grade: ItemGrade;
  realmRequirement: number;
  skills: CombatSkill[];
  passiveEffects: SpecialEffect[];
  description: string;
}

const TECHNIQUE_TEMPLATES: TechniqueTemplate[] = [
  // ==================== 炼气期功法 ====================

  {
    id: 'basic_sword_art',
    name: '基础剑诀',
    grade: '凡品',
    realmRequirement: 0,
    skills: [
      skill('刺剑式', 1.2, 5, 0, '基础御剑刺击'),
      skill('横剑式', 0.8, 0, 8, '剑身横挡防御', s('on_defend', '格挡', 15)),
    ],
    passiveEffects: [],
    description: '最基础的御剑之术，包含刺剑式与横剑式两招，是炼气期散修的入门功法。',
  },
  {
    id: 'qi_guidance_art',
    name: '引气诀',
    grade: '凡品',
    realmRequirement: 0,
    skills: [skill('灵气冲击', 1.3, 10, 0, '凝聚灵气化为冲击波攻击敌人')],
    passiveEffects: [s('on_cultivate', '灵气引导', 2)],
    description: '引导天地灵气为己所用的基础功法，可略微提升修炼速度。',
  },
  {
    id: 'iron_body_art',
    name: '铁骨功',
    grade: '凡品',
    realmRequirement: 0,
    skills: [
      skill('铁壁防御', 0.1, 0, 12, '以身体硬接攻击大幅降低伤害', s('on_defend', '铁壁', 25)),
    ],
    passiveEffects: [],
    description: '以灵力淬炼体魄的功法，修炼后肉身如铁，防御大增。',
  },

  // ==================== 筑基期功法 ====================

  {
    id: 'azure_sword_scripture',
    name: '青云剑经',
    grade: '灵品',
    realmRequirement: 4,
    skills: [
      skill('飞星逐月', 1.5, 15, 0, '剑如流星追月，迅捷凌厉'),
      skill('青云护体', 0.3, 20, 0, '剑气护体抵御伤害', s('on_defend', '剑气护盾', 30)),
    ],
    passiveEffects: [s('on_cultivate', '剑道参悟', 3)],
    description: '青云宗外门弟子必修的剑经，剑招飘逸如云，攻守兼备。',
  },
  {
    id: 'flame_mantra',
    name: '烈火心法',
    grade: '灵品',
    realmRequirement: 4,
    skills: [skill('烈焰焚身', 1.8, 20, 0, '以灵力催动烈焰灼烧敌人')],
    passiveEffects: [],
    description: '以火灵力淬炼经脉的心法，攻击霸道猛烈，但消耗灵力较多。',
  },
  {
    id: 'water_mirror_art',
    name: '水镜术',
    grade: '灵品',
    realmRequirement: 5,
    skills: [
      skill('水镜反弹', 0.0, 25, 0, '展开水镜将伤害反弹', s('on_defend', '镜反', 40)),
      skill('水刃', 1.4, 12, 0, '凝水为刃远程攻击'),
    ],
    passiveEffects: [s('passive', '水性调和', 2)],
    description: '仿效水之柔性的防御功法，以静制动，以柔克刚。',
  },

  // ==================== 金丹期功法 ====================

  {
    id: 'golden_core_method',
    name: '金丹大道',
    grade: '宝品',
    realmRequirement: 8,
    skills: [
      skill('金丹威压', 1.6, 18, 0, '以金丹威能震慑并攻击敌人'),
      skill('丹火护体', 0.2, 22, 0, '金丹之火环绕护体', s('on_defend', '丹火盾', 35)),
    ],
    passiveEffects: [s('on_cultivate', '金丹运转', 5), s('passive', '丹气滋养', 3)],
    description: '金丹期修士的正统功法，以金丹为核心运转周天，修炼速度大幅提升。',
  },
  {
    id: 'thunder_sutra',
    name: '天雷正法',
    grade: '宝品',
    realmRequirement: 10,
    skills: [
      skill('天雷击', 2.0, 30, 0, '引动天雷之力轰击敌人'),
      skill('雷遁', 0.0, 15, 10, '以雷光包裹自身闪避攻击', s('on_defend', '闪避', 45)),
    ],
    passiveEffects: [],
    description: '以天雷淬体的霸道功法，攻击力极其恐怖，但消耗灵力也极为巨大。',
  },

  // ==================== 元婴期功法 ====================

  {
    id: 'primordial_spirit_art',
    name: '元神秘法',
    grade: '仙品',
    realmRequirement: 12,
    skills: [
      skill('元神出窍', 2.2, 35, 0, '元婴出窍发动灵魂层面的攻击'),
      skill('元神归位', 0.1, 40, 0, '元神护住肉身大幅减伤', s('on_defend', '元神护体', 50)),
    ],
    passiveEffects: [s('on_cultivate', '元神参悟', 8), s('passive', '神识扩展', 5)],
    description: '元婴期修士修炼元神的至高功法，元婴不灭则修士不死。',
  },
  {
    id: 'void_dao_scripture',
    name: '虚空道经',
    grade: '仙品',
    realmRequirement: 14,
    skills: [
      skill('虚空斩', 2.4, 40, 0, '撕裂虚空斩断一切'),
      skill('虚空遁', 0.0, 25, 15, '遁入虚空躲避攻击', s('on_defend', '虚空闪避', 55)),
    ],
    passiveEffects: [s('passive', '虚空感应', 6)],
    description: '传说中领悟空间法则的功法，能让修士短暂遁入虚空，攻防一体。',
  },
];

// ==================== 查找函数 ====================

const techniqueById = new Map<string, TechniqueTemplate>();

for (const tpl of TECHNIQUE_TEMPLATES) {
  techniqueById.set(tpl.id, tpl);
}

/** 根据 ID 获取功法模板 */
export function getTechniqueTemplateById(id: string): TechniqueTemplate | undefined {
  return techniqueById.get(id);
}

/** 根据境界获取可学功法列表 */
export function getTechniquesByRealm(progressIndex: number): TechniqueTemplate[] {
  return TECHNIQUE_TEMPLATES.filter((t) => t.realmRequirement <= progressIndex);
}

/** 获取所有功法 ID */
export function getAllTechniqueIds(): string[] {
  return [...techniqueById.keys()];
}

/** 从模板创建 Technique 实例（用于学习功法事件） */
export function createTechniqueFromTemplate(templateId: string): Technique | undefined {
  const tpl = techniqueById.get(templateId);
  if (!tpl) return undefined;

  return {
    id: tpl.id,
    name: tpl.name,
    type: 'technique',
    grade: tpl.grade,
    realmRequirement: tpl.realmRequirement,
    skills: tpl.skills.map((sk) => ({ ...sk })),
    passiveEffects: tpl.passiveEffects.map((pe) => ({ ...pe })),
    description: tpl.description,
    equipped: false,
  };
}
