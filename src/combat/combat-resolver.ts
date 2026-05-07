// ============================================================
// 战斗数值解析器 — 纯数值计算（无副作用）
// 所有函数接受 randomFn 参数便于测试注入
// ============================================================

import { REALM_DEFINITIONS } from '../game/state';
import type { CombatSkill, CoreStats, Enemy, GameItem, GameState, LootTable } from '../game/types';
import { getItemById } from '../inventory/item-data';

// ==================== 辅助 ====================

/** 从数组中随机选择一个元素 */
function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return (
    arr[Math.floor(rng() * arr.length)] ??
    arr[0] ??
    (() => {
      throw new Error('empty array');
    })()
  );
}

// ==================== 战斗数值类型 ====================

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  narrative: string;
  /** 消耗的资源（灵力/体力），仅玩家攻击时有值 */
  cost?: { qi?: number; stamina?: number };
  /** 是否因资源不足而技能失败 */
  resourceFail?: boolean;
}

export interface FleeResult {
  success: boolean;
  narrative: string;
  /** 逃跑失败时，敌人免费攻击的伤害值（0 表示成功） */
  counterDamage: number;
}

export interface QuickResolveResult {
  result: 'victory' | 'defeat';
  hpLoss: number;
  narrative: string;
  loot?: GameItem[];
}

// ==================== 战力计算 ====================

/** 从 GameState 计算玩家攻击力 */
export function calculatePlayerAttack(state: GameState): number {
  const realmDef = REALM_DEFINITIONS[state.player.realm.name];
  let attack = 20 + state.player.realm.progressIndex * 5;

  // 境界倍率（先应用，装备作为固定加成在倍率之后）
  attack = Math.round(attack * realmDef.statMultiplier);

  // 装备加成（在倍率之后，作为固定数值加成）
  for (const eq of Object.values(state.player.equipment)) {
    if (!eq) continue;
    if (eq.stats.hp) attack += Math.round(eq.stats.hp * 0.5);
    if (eq.stats.willpower) attack += Math.round(eq.stats.willpower * 0.8);
  }

  // 天赋加成：剑心通明
  const combatBonus = state.player.flags.combat_damage_bonus;
  if (typeof combatBonus === 'number' && combatBonus > 0) {
    attack = Math.round(attack * (1 + combatBonus));
  }

  return attack;
}

/** 从 GameState 计算玩家防御力 */
export function calculatePlayerDefense(state: GameState): number {
  const realmDef = REALM_DEFINITIONS[state.player.realm.name];
  let defense = 10 + state.player.realm.progressIndex * 3;

  // 应用缩减的 statMultiplier（40% 比例，使防御不至于完全无用）
  defense = Math.round(defense * (1 + (realmDef.statMultiplier - 1) * 0.4));

  // 装备加成（在倍率之后）
  for (const eq of Object.values(state.player.equipment)) {
    if (!eq) continue;
    if (eq.stats.maxHp) defense += Math.round(eq.stats.maxHp * 0.15);
  }

  return defense;
}

/** 计算综合战力值（用于速杀判定） */
export function calculateCompositePower(
  realmIndex: number,
  stats: CoreStats,
  attack: number,
  defense: number,
  equipmentBonus: number
): number {
  const realmDef =
    REALM_DEFINITIONS[
      Object.keys(REALM_DEFINITIONS)[
        Math.min(8, Math.floor(realmIndex / 4))
      ] as keyof typeof REALM_DEFINITIONS
    ];
  const realmFactor = realmDef?.statMultiplier ?? 1.0;
  return Math.round(
    (attack * 1.5 + defense + stats.maxHp * 0.3 + stats.maxQi * 0.2 + equipmentBonus) * realmFactor
  );
}

// ==================== 伤害计算 ====================

/** 应用随机波动 ±20%，保证最小伤害为 1 */
export function applyVariance(baseDamage: number, randomFn: () => number = Math.random): number {
  const variance = 0.8 + randomFn() * 0.4;
  return Math.max(1, Math.round(baseDamage * variance));
}

/** 暴击判定 5% 概率 */
export function rollCrit(randomFn: () => number = Math.random): boolean {
  return randomFn() < 0.05;
}

/** 防御姿态伤害减免 */
export function applyDefendReduction(damage: number): number {
  return Math.max(1, Math.round(damage * 0.5));
}

/** 玩家攻击敌人伤害计算 */
export function calcPlayerDamage(
  playerAttack: number,
  enemyDefense: number,
  enemyName: string,
  actionType: 'attack' | 'skill',
  skill?: CombatSkill,
  playerQi?: number,
  playerStamina?: number,
  randomFn: () => number = Math.random
): DamageResult {
  // 技能消耗检查
  if (actionType === 'skill' && skill) {
    const cost: { qi?: number; stamina?: number } = {};

    if (skill.qiCost > 0) {
      if (playerQi !== undefined && playerQi < skill.qiCost) {
        return {
          damage: 0,
          isCrit: false,
          narrative: `灵力不足，无法施展「${skill.name}」！`,
          cost: { qi: skill.qiCost },
          resourceFail: true,
        };
      }
      cost.qi = skill.qiCost;
    }

    if (skill.staminaCost > 0) {
      if (playerStamina !== undefined && playerStamina < skill.staminaCost) {
        return {
          damage: 0,
          isCrit: false,
          narrative: `体力不支，无法施展「${skill.name}」！`,
          cost: { stamina: skill.staminaCost },
          resourceFail: true,
        };
      }
      cost.stamina = skill.staminaCost;
    }

    const baseDamage = playerAttack * (skill.damageMultiplier || 1.0) - enemyDefense * 0.5;
    const variedDamage = applyVariance(Math.max(1, baseDamage), randomFn);
    const isCrit = rollCrit(randomFn);
    const finalDamage = isCrit ? Math.round(variedDamage * 2) : Math.round(variedDamage);
    const clampedDamage = Math.max(1, finalDamage);

    const critText = isCrit ? '暴击！' : '';
    const narratives = [
      `你施展「${skill.name}」，对${enemyName}造成 ${clampedDamage} 点伤害！${critText}`,
      `「${skill.name}」凌厉而出，${enemyName}受创 ${clampedDamage} 点！${critText}`,
      `灵力涌动间，「${skill.name}」正中${enemyName}，伤害 ${clampedDamage} 点！${critText}`,
    ];

    return {
      damage: clampedDamage,
      isCrit,
      narrative: pickRandom(narratives, randomFn),
      cost,
    };
  }

  // 普通攻击
  const baseDamage = playerAttack - enemyDefense * 0.5;
  const variedDamage = applyVariance(Math.max(1, baseDamage), randomFn);
  const isCrit = rollCrit(randomFn);
  const finalDamage = isCrit ? Math.round(variedDamage * 2) : Math.round(variedDamage);
  const clampedDamage = Math.max(1, finalDamage);

  const critText = isCrit ? '暴击！' : '';
  const narratives = [
    `你发起攻击，对${enemyName}造成 ${clampedDamage} 点伤害！${critText}`,
    `你一剑斩出，${enemyName}受创 ${clampedDamage} 点！${critText}`,
    `你灵力运转，一击命中${enemyName}，伤害 ${clampedDamage} 点！${critText}`,
  ];

  return {
    damage: clampedDamage,
    isCrit,
    narrative: pickRandom(narratives, randomFn),
  };
}

/** 敌人攻击玩家伤害计算 */
export function calcEnemyDamage(
  enemyAttack: number,
  playerDefense: number,
  enemyName: string,
  actionType: 'attack' | 'skill',
  skill?: CombatSkill,
  randomFn: () => number = Math.random
): DamageResult {
  if (actionType === 'skill' && skill) {
    const baseDamage = enemyAttack * (skill.damageMultiplier || 1.0) - playerDefense * 0.5;
    const variedDamage = applyVariance(Math.max(1, baseDamage), randomFn);
    const isCrit = rollCrit(randomFn);
    const finalDamage = isCrit ? Math.round(variedDamage * 2) : Math.round(variedDamage);
    const clampedDamage = Math.max(1, finalDamage);

    const critText = isCrit ? '暴击！' : '';
    const narratives = [
      `${enemyName}施展「${skill.name}」，对你造成 ${clampedDamage} 点伤害！${critText}`,
      `${enemyName}的「${skill.name}」来势凶猛，你受伤 ${clampedDamage} 点！${critText}`,
      `「${skill.name}」袭来，你被击中，损失 ${clampedDamage} 点生命！${critText}`,
    ];

    return {
      damage: clampedDamage,
      isCrit,
      narrative: pickRandom(narratives, randomFn),
    };
  }

  const baseDamage = enemyAttack - playerDefense * 0.5;
  const variedDamage = applyVariance(Math.max(1, baseDamage), randomFn);
  const isCrit = rollCrit(randomFn);
  const finalDamage = isCrit ? Math.round(variedDamage * 2) : Math.round(variedDamage);
  const clampedDamage = Math.max(1, finalDamage);

  const critText = isCrit ? '暴击！' : '';
  const narratives = [
    `${enemyName}发起攻击，对你造成 ${clampedDamage} 点伤害！${critText}`,
    `${enemyName}攻势凌厉，你受伤 ${clampedDamage} 点！${critText}`,
    `${enemyName}一击袭来，你损失 ${clampedDamage} 点生命！${critText}`,
  ];

  return {
    damage: clampedDamage,
    isCrit,
    narrative: pickRandom(narratives, randomFn),
  };
}

// ==================== 逃跑判定 ====================

/** 计算逃跑成功率 */
export function calcFlee(
  playerRealmIndex: number,
  enemyRealmIndex: number,
  enemyAttack: number,
  playerDefense: number,
  randomFn: () => number = Math.random
): FleeResult {
  // Boss 不可逃跑由 combat-manager 层面处理，这里只计算成功率
  const realmDiff = playerRealmIndex - enemyRealmIndex;
  // 基础成功率 40%，境界差影响 ±15% 每个级别
  const baseChance = 0.4 + realmDiff * 0.15;
  const successChance = Math.max(0.05, Math.min(0.95, baseChance));
  const roll = randomFn();

  if (roll < successChance) {
    const narratives = [
      '你身形一闪，成功脱离了战斗！',
      '你施展身法，趁敌人不备抽身而退！',
      '你抓住机会，迅速脱离了战场！',
    ];
    return {
      success: true,
      narrative: pickRandom(narratives, randomFn),
      counterDamage: 0,
    };
  }

  // 逃跑失败，敌人免费攻击
  const enemyDamage = calcEnemyDamage(
    enemyAttack,
    playerDefense,
    '敌人',
    'attack',
    undefined,
    randomFn
  );
  return {
    success: false,
    narrative: `逃跑失败！${enemyDamage.narrative}`,
    counterDamage: enemyDamage.damage,
  };
}

// ==================== 小怪速杀 ====================

/** 小怪速杀判定：比较综合战力，直接返回结果 */
export function quickResolve(
  state: GameState,
  enemy: Enemy,
  randomFn: () => number = Math.random
): QuickResolveResult {
  const playerAttack = calculatePlayerAttack(state);
  const playerDefense = calculatePlayerDefense(state);
  const playerPower = calculateCompositePower(
    state.player.realm.progressIndex,
    state.player.stats,
    playerAttack,
    playerDefense,
    state.player.spiritStones > 0 ? 2 : 0
  );
  const enemyPower = calculateCompositePower(
    enemy.realm.progressIndex,
    enemy.stats,
    enemy.attack,
    enemy.defense,
    enemy.skills.length * 3
  );

  const powerRatio = playerPower / Math.max(1, enemyPower);

  if (powerRatio >= 1.2) {
    // 碾压获胜
    const hpLoss = Math.round(state.player.stats.maxHp * (0.02 + randomFn() * 0.05));
    const loot = generateLoot(enemy.loot, randomFn);
    const lootText =
      loot.length > 0
        ? `\n获得战利品：${loot.map((l) => `${l.name}x${l.quantity}`).join('、')}`
        : '';

    const narratives = [
      `你轻松击败了${enemy.name}，仅仅受了些轻伤。${lootText}`,
      `以你的实力，${enemy.name}不堪一击。${lootText}`,
      `三两招之间，${enemy.name}便已败下阵来。${lootText}`,
    ];

    return {
      result: 'victory',
      hpLoss,
      narrative: pickRandom(narratives, randomFn),
      loot,
    };
  }

  if (powerRatio >= 0.8) {
    // 势均力敌，小胜
    const hpLoss = Math.round(state.player.stats.maxHp * (0.1 + randomFn() * 0.15));
    const loot = generateLoot(enemy.loot, randomFn);
    const lootText =
      loot.length > 0
        ? `\n获得战利品：${loot.map((l) => `${l.name}x${l.quantity}`).join('、')}`
        : '';

    const narratives = [
      `经过一番周旋，你最终战胜了${enemy.name}，但消耗了不少体力。${lootText}`,
      `${enemy.name}颇为难缠，但你还是取得了胜利。${lootText}`,
      `你与${enemy.name}缠斗片刻，终于找到破绽将之击败。${lootText}`,
    ];

    return {
      result: 'victory',
      hpLoss,
      narrative: pickRandom(narratives, randomFn),
      loot,
    };
  }

  if (powerRatio >= 0.65) {
    // 险胜
    const hpLoss = Math.round(state.player.stats.maxHp * (0.18 + randomFn() * 0.15));
    const loot = generateLoot(enemy.loot, randomFn);
    const lootText =
      loot.length > 0
        ? `\n获得战利品：${loot.map((l) => `${l.name}x${l.quantity}`).join('、')}`
        : '';

    const narratives = [
      `你与${enemy.name}激战许久，几乎力竭，最终险胜。${lootText}`,
      `${enemy.name}实力不俗，你拼尽全力才勉强取胜，伤势不轻。${lootText}`,
    ];

    return {
      result: 'victory',
      hpLoss,
      narrative: pickRandom(narratives, randomFn),
      loot,
    };
  }

  if (powerRatio >= 0.5) {
    // 勉强撤退
    const hpLoss = Math.round(state.player.stats.maxHp * (0.22 + randomFn() * 0.2));

    const narratives = [
      `${enemy.name}实力明显强于你，一番苦战后你带伤撤退。`,
      `你与${enemy.name}力战不敌，幸好及时脱身。`,
    ];

    return {
      result: 'defeat',
      hpLoss,
      narrative: pickRandom(narratives, randomFn),
    };
  }

  // 惨败：实力差距过大
  const hpLoss = Math.round(state.player.stats.maxHp * (0.3 + randomFn() * 0.3));

  const narratives = [
    `你与${enemy.name}苦战一番，终究不敌，身受重伤，狼狈撤退。`,
    `${enemy.name}的实力远超你的预料，你重伤濒死，被迫撤退。`,
    `一番激战后，你意识到远不是${enemy.name}的对手，重伤而退。`,
  ];

  return {
    result: 'defeat',
    hpLoss,
    narrative: pickRandom(narratives, randomFn),
  };
}

// ==================== 战利品生成 ====================

/** 从 LootTable 抽取战利品 */
export function generateLoot(
  lootTable: LootTable,
  randomFn: () => number = Math.random
): GameItem[] {
  const loot: GameItem[] = [];

  function createLootItem(itemId: string, quantity: number): GameItem {
    const template = getItemById(itemId);
    if (template) {
      return { ...template, quantity };
    }
    // 回退：模板未找到时使用 itemId 作为名称
    return {
      id: itemId,
      name: itemId,
      type: 'misc',
      subtype: 'loot',
      description: '',
      quantity,
      effects: [],
      value: 0,
      stackable: true,
      maxStack: 99,
    };
  }

  // 必定掉落
  for (const entry of lootTable.guaranteed) {
    loot.push(createLootItem(entry.itemId, entry.quantity));
  }

  // 概率掉落
  for (const entry of lootTable.possible) {
    if (randomFn() < entry.chance) {
      loot.push(createLootItem(entry.itemId, entry.quantity));
    }
  }

  return loot;
}

// ==================== 经验计算 ====================

/** 计算击败敌人的经验值 */
export function calcExperience(enemy: Enemy): number {
  const baseExp = enemy.type === 'boss' ? 50 : 15;
  const realmBonus = enemy.realm.progressIndex * 5;
  return baseExp + realmBonus;
}

// ==================== 宠物战斗伤害 ====================

export interface PetDamageResult {
  damage: number;
  isCrit: boolean;
  narrative: string;
}

/** 计算宠物技能伤害 */
export function calcPetSkillDamage(
  petAttack: number,
  _skillCooldown: number,
  enemyDefense: number,
  randomFn: () => number = Math.random
): PetDamageResult {
  const baseDamage = petAttack * 1.0 - enemyDefense * 0.3;
  const variedDamage = applyVariance(Math.max(1, baseDamage), randomFn);
  const isCrit = rollCrit(randomFn);
  const finalDamage = isCrit ? Math.round(variedDamage * 1.8) : Math.round(variedDamage);
  const clampedDamage = Math.max(1, finalDamage);

  return {
    damage: clampedDamage,
    isCrit,
    narrative: isCrit ? `造成 ${clampedDamage} 点伤害（暴击！）` : `造成 ${clampedDamage} 点伤害`,
  };
}

/** 计算宠物普通攻击伤害 */
export function calcPetBasicDamage(
  petAttack: number,
  enemyDefense: number,
  randomFn: () => number = Math.random
): PetDamageResult {
  const baseDamage = petAttack * 0.7 - enemyDefense * 0.3;
  const variedDamage = applyVariance(Math.max(1, baseDamage), randomFn);
  const isCrit = rollCrit(randomFn);
  const finalDamage = isCrit ? Math.round(variedDamage * 1.8) : Math.round(variedDamage);
  const clampedDamage = Math.max(1, finalDamage);

  return {
    damage: clampedDamage,
    isCrit,
    narrative: isCrit ? `造成 ${clampedDamage} 点伤害（暴击！）` : `造成 ${clampedDamage} 点伤害`,
  };
}
