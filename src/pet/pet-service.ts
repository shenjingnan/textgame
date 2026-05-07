// ============================================================
// 灵宠服务层 — 喂养、互动、进化、战斗伤害计算
// 纯函数模块，返回 GameEvent[] 由 engine 应用
// ============================================================

import * as Events from '../game/events';
import type { GameEvent, GameState, SpiritPet } from '../game/types';
import type { PetTemplate } from './pet-data';
import { getPetTemplateById } from './pet-data';

// ==================== 宠物查询 ====================

/** 根据 ID 或名称查找宠物 */
export function getPetByQuery(state: GameState, query: string): SpiritPet | undefined {
  const lower = query.toLowerCase();
  return (
    state.pets.find((p) => p.id === lower) ??
    state.pets.find((p) => p.name.toLowerCase().includes(lower))
  );
}

/** 获取当前出战宠物 */
export function getActivePet(state: GameState): SpiritPet | undefined {
  if (!state.activePetId) return undefined;
  return state.pets.find((p) => p.id === state.activePetId);
}

/** 获取宠物可用技能（冷却完成的） */
export function getAvailablePetSkills(pet: SpiritPet): SpiritPet['skills'] {
  return pet.skills.filter((s) => s.currentCooldown <= 0);
}

// ==================== 宠物喂养 ====================

/**
 * 使用背包中的消耗品喂养指定宠物
 */
export function feedPet(
  state: GameState,
  petId: string,
  foodItemId: string
): { events: GameEvent[]; error?: string } {
  const pet = state.pets.find((p) => p.id === petId);
  if (!pet) {
    return { events: [], error: '找不到指定的灵宠' };
  }

  // 在背包中查找物品
  let idx = state.inventory.findIndex((i) => i.id === foodItemId);
  if (idx < 0) {
    idx = state.inventory.findIndex((i) => i.name.toLowerCase().includes(foodItemId.toLowerCase()));
  }
  if (idx < 0) {
    return { events: [], error: `背包中没有找到 "${foodItemId}"` };
  }

  const item = state.inventory[idx]!;

  // 只能喂消耗品
  if (item.type !== 'consumable') {
    return { events: [], error: `"${item.name}" 不能用来喂养灵宠` };
  }

  // 计算治疗效果
  let healAmount = 0;
  for (const effect of item.effects) {
    if (effect.attribute === 'hp' && effect.operation === 'add') {
      healAmount += effect.value;
    }
  }

  // 如果没有 HP 恢复效果，仍有少量恢复
  if (healAmount === 0) {
    healAmount = Math.round(pet.stats.maxHp * 0.1);
  }

  // 检查是否为宠物最爱食物，计算忠诚度变化
  let loyaltyChange = 3;
  const template = getPetTemplateById(pet.templateId);
  if (template?.favoriteFoods?.some((f) => item.name.includes(f) || f.includes(item.name))) {
    loyaltyChange = 8 + Math.floor(Math.random() * 8); // 8~15
  }

  const events: GameEvent[] = [];

  // 消耗物品
  events.push(Events.itemUse(item.id, item.effects));

  // 喂养事件
  events.push(Events.petFeed(pet.id, item.id, healAmount, loyaltyChange));

  // 叙事
  const extra = loyaltyChange >= 8 ? '灵宠看起来非常开心！' : '';
  events.push(
    Events.narrative(
      'system',
      `你用 ${item.name} 喂养了 ${pet.name}，恢复了 ${healAmount} 点生命。忠诚度 +${loyaltyChange}。${extra}`
    )
  );

  return { events };
}

// ==================== 宠物互动 ====================

/** 与宠物互动提升忠诚度 */
export function interactWithPet(
  state: GameState,
  petId: string
): { events: GameEvent[]; error?: string } {
  const pet = state.pets.find((p) => p.id === petId);
  if (!pet) {
    return { events: [], error: '找不到指定的灵宠' };
  }

  const loyaltyChange = 2 + Math.floor(Math.random() * 4); // 2~5

  const narratives = [
    `你轻轻抚摸了 ${pet.name} 的头，它亲昵地蹭了蹭你的手。`,
    `你与 ${pet.name} 一同修炼，彼此之间灵力共鸣。`,
    `你给 ${pet.name} 梳了梳毛发，它舒服地趴在你身边。`,
    `${pet.name} 兴奋地绕着你转圈，你陪它玩耍了一会儿。`,
  ];
  const narrative = narratives[Math.floor(Math.random() * narratives.length)]!;

  const events: GameEvent[] = [
    Events.petInteract(pet.id, loyaltyChange),
    Events.narrative('system', `${narrative} 忠诚度 +${loyaltyChange}。`),
  ];

  return { events };
}

// ==================== 宠物进化 ====================

/** 尝试使宠物进化 */
export function attemptPetEvolution(
  state: GameState,
  petId: string
): { events: GameEvent[]; error?: string } {
  const pet = state.pets.find((p) => p.id === petId);
  if (!pet) {
    return { events: [], error: '找不到指定的灵宠' };
  }

  const template = getPetTemplateById(pet.templateId);
  if (!template) {
    return { events: [], error: '找不到该灵宠的模板数据' };
  }

  const newStage = pet.evolutionStage + 1;
  const path = pet.evolutionPath as 'normal' | 'divine' | 'demonic';
  const chain = template.evolutionChain[path];
  const nextStageData = chain?.find((s) => s.stage === newStage);

  if (!nextStageData) {
    return { events: [], error: `${pet.name} 已达到当前路径的最大进化阶段` };
  }

  // 忠诚度检查
  if (path === 'divine' && pet.loyalty < 70) {
    return {
      events: [],
      error: `神圣进化需要忠诚度 >= 70，当前忠诚度 ${pet.loyalty}`,
    };
  }
  if (path === 'demonic' && pet.loyalty < 40) {
    return {
      events: [],
      error: `魔化进化需要忠诚度 >= 40，当前忠诚度 ${pet.loyalty}`,
    };
  }
  if (path === 'normal' && pet.loyalty < 50) {
    return {
      events: [],
      error: `进化需要忠诚度 >= 50，当前忠诚度 ${pet.loyalty}`,
    };
  }

  const events: GameEvent[] = [
    Events.petEvolve(pet.id, newStage, path),
    Events.narrative(
      'system',
      `${pet.name} 经历了蜕变，进化为 ${nextStageData.speciesName}！` +
        `（${newStage}阶 · ${path === 'divine' ? '神圣' : path === 'demonic' ? '魔化' : '普通'}路线）`
    ),
  ];

  return { events };
}

// ==================== 宠物战斗伤害计算 ====================

/** 计算宠物技能伤害 */
export function calculatePetSkillDamage(
  pet: SpiritPet,
  skillName: string,
  enemyDefense: number,
  randomFn?: () => number
): { damage: number; isCrit: boolean; narrative: string } {
  const rng = randomFn ?? Math.random;
  const skill = pet.skills.find((s) => s.name === skillName);

  const baseDamage = skill
    ? pet.stats.attack * (skill.cooldown > 0 ? 0.7 : 1.0) - enemyDefense * 0.3
    : pet.stats.attack * 0.7 - enemyDefense * 0.3;

  const variance = 0.85 + rng() * 0.3;
  const isCrit = rng() < 0.08;
  const critMultiplier = isCrit ? 1.8 : 1.0;
  const damage = Math.max(1, Math.round(baseDamage * variance * critMultiplier));

  const narratives = [
    `${pet.name} 扑向敌人，造成了 ${damage} 点伤害`,
    `${pet.name} 猛攻敌人，造成了 ${damage} 点伤害`,
    `${pet.name} 发动攻击，造成了 ${damage} 点伤害`,
  ];
  const narrative = narratives[Math.floor(rng() * narratives.length)]!;

  return {
    damage,
    isCrit,
    narrative: isCrit ? `${narrative}（暴击！）` : `${narrative}！`,
  };
}

/** 计算宠物普通攻击伤害 */
export function calculatePetBasicDamage(
  pet: SpiritPet,
  enemyDefense: number,
  randomFn?: () => number
): number {
  const rng = randomFn ?? Math.random;
  const baseDamage = pet.stats.attack * 0.7 - enemyDefense * 0.3;
  return Math.max(1, Math.round(baseDamage * (0.9 + rng() * 0.2)));
}

/** 检查宠物忠诚度对战斗的影响 */
export function checkLoyaltyCombatEffect(
  pet: SpiritPet,
  randomFn?: () => number
): { damageMultiplier: number; willRefuse: boolean } {
  const rng = randomFn ?? Math.random;

  if (pet.loyalty >= 80) {
    return { damageMultiplier: 1.15, willRefuse: false };
  }
  if (pet.loyalty <= 30) {
    return { damageMultiplier: 1.0, willRefuse: rng() < 0.25 };
  }
  if (pet.loyalty <= 19) {
    return { damageMultiplier: 0.9, willRefuse: rng() < 0.5 };
  }

  return { damageMultiplier: 1.0, willRefuse: false };
}

// ==================== 宠物升级 ====================

/** 计算宠物升级后的属性增长 */
export function calcPetLevelUpStats(
  template: PetTemplate,
  currentLevel: number,
  newLevel: number
): Partial<{
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}> {
  const levelDiff = newLevel - currentLevel;
  if (levelDiff <= 0) return {};

  const growthPerLevel = {
    hp: Math.round(template.baseStats.maxHp * 0.06),
    maxHp: Math.round(template.baseStats.maxHp * 0.06),
    attack: Math.round(template.baseStats.attack * 0.05),
    defense: Math.round(template.baseStats.defense * 0.05),
    speed: Math.round(template.baseStats.speed * 0.04),
  };

  return {
    hp: growthPerLevel.hp * levelDiff,
    maxHp: growthPerLevel.maxHp * levelDiff,
    attack: growthPerLevel.attack * levelDiff,
    defense: growthPerLevel.defense * levelDiff,
    speed: growthPerLevel.speed * levelDiff,
  };
}
