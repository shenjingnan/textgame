// ============================================================
// 境界系统 — 修炼、突破、天劫核心逻辑
// 纯函数模块，无副作用，返回 GameEvent[] 由 engine 应用
// ============================================================

import * as Events from '../game/events';
import { calculatePassiveEffects, getRealmFromProgress, REALM_DEFINITIONS } from '../game/state';
import type { GameEvent, GameState, RealmName, SubStage } from '../game/types';

// ==================== 突破检查结果 ====================

export interface BreakthroughCheckResult {
  canAttempt: boolean;
  reason?: string;
  currentRealm: string;
  cultivation: number;
  breakthroughDifficulty: number;
  tribulationRisk: number;
  missingItems?: string[];
}

// ==================== 突破结果 ====================

export interface BreakthroughResult {
  success: boolean;
  events: GameEvent[];
  triggersTribulation: boolean;
  failurePenalty?: {
    cultivationLoss: number;
    statDamage: number;
    description: string;
  };
}

// ==================== 天劫结果 ====================

export interface TribulationResult {
  survived: boolean;
  events: GameEvent[];
}

// ==================== 修炼速度 ====================

export interface CultivationSpeed {
  baseRate: number;
  locationBonus: number;
  talentBonus: number;
  total: number;
  breakdown: string;
}

// ==================== 突破检查 ====================

export function canAttemptBreakthrough(state: GameState): BreakthroughCheckResult {
  const realmDef = REALM_DEFINITIONS[state.player.realm.name];
  const realmStr = `${realmDef.name}${state.player.realm.subStage}`;
  const cult = state.player.realm.cultivation;

  if (cult < realmDef.minCultivation) {
    return {
      canAttempt: false,
      reason: `修炼进度不足（当前 ${cult}%，需要 ${realmDef.minCultivation}%）`,
      currentRealm: realmStr,
      cultivation: cult,
      breakthroughDifficulty: realmDef.breakthroughDifficulty,
      tribulationRisk: realmDef.tribulationRisk,
    };
  }

  // 检查是否为当前境界最高小阶段（圆满），如果是则不允许继续突破
  if (state.player.realm.subStage === '圆满') {
    // 跨大境界突破，检查所需物品
    if (realmDef.requiredItems && realmDef.requiredItems.length > 0) {
      const ownedItemIds = new Set(state.inventory.map((i) => i.id));
      const missing = realmDef.requiredItems.filter((id) => !ownedItemIds.has(id));
      if (missing.length > 0) {
        return {
          canAttempt: false,
          reason: `缺少突破所需物品：${missing.join('、')}`,
          currentRealm: realmStr,
          cultivation: cult,
          breakthroughDifficulty: realmDef.breakthroughDifficulty,
          tribulationRisk: realmDef.tribulationRisk,
          missingItems: missing,
        };
      }
    }
  }

  return {
    canAttempt: true,
    currentRealm: realmStr,
    cultivation: cult,
    breakthroughDifficulty: realmDef.breakthroughDifficulty,
    tribulationRisk: realmDef.tribulationRisk,
  };
}

// ==================== 执行突破 ====================

export function attemptBreakthrough(
  state: GameState,
  randomFn: () => number = Math.random
): BreakthroughResult {
  const check = canAttemptBreakthrough(state);
  if (!check.canAttempt) {
    return {
      success: false,
      events: [Events.narrative('system', `突破失败：${check.reason}`)],
      triggersTribulation: false,
      failurePenalty: {
        cultivationLoss: 0,
        statDamage: 0,
        description: check.reason ?? '条件不足',
      },
    };
  }

  const realmDef = REALM_DEFINITIONS[state.player.realm.name];
  const isMajorBreakthrough = state.player.realm.subStage === '圆满';

  // 同境界小阶段突破难度减半
  const effectiveDifficulty = isMajorBreakthrough
    ? realmDef.breakthroughDifficulty
    : realmDef.breakthroughDifficulty * 0.5;

  // willpower 加成
  const willpowerBonus = 1 + 0.1 * (state.player.stats.willpower / 100);

  // 天机感应天赋加成
  const talentBonus = state.player.flags['destiny_sense'] ? 1.1 : 1.0;

  let successChance = (1 - effectiveDifficulty) * willpowerBonus * talentBonus;
  successChance = Math.max(0.05, Math.min(0.95, successChance));

  const roll = randomFn();
  const success = roll < successChance;

  if (success) {
    return buildSuccessResult(state, isMajorBreakthrough);
  }
  return buildFailureResult(state);
}

function buildSuccessResult(state: GameState, isMajorBreakthrough: boolean): BreakthroughResult {
  const currentIndex = state.player.realm.progressIndex;
  let newProgressIndex: number;
  let newSubStage: string;
  let newRealmName: string;

  if (isMajorBreakthrough) {
    // 跨大境界：进入下一境界的「前期」
    newProgressIndex = currentIndex + 1;
    const newRealm = getRealmFromProgress(newProgressIndex);
    newSubStage = newRealm.subStage;
    newRealmName = newRealm.name;
  } else {
    // 同境界小阶段提升
    newProgressIndex = currentIndex + 1;
    const newRealm = getRealmFromProgress(newProgressIndex);
    newSubStage = newRealm.subStage;
    newRealmName = newRealm.name;
  }

  // 突破成功叙事
  const majorText = isMajorBreakthrough
    ? `天道感应，天地灵气如潮水般涌入体内！你成功突破瓶颈，踏入**${newRealmName}${newSubStage}**！`
    : `灵气涌动，修为更进一步！你已臻至**${newRealmName}${newSubStage}**。`;

  const events: GameEvent[] = [
    Events.narrative('system', majorText),
    Events.realmAdvance(newSubStage as SubStage, newRealmName as RealmName, newProgressIndex),
    // 突破后少量属性提升（固定）
    Events.statChange('player', { willpower: 2 }),
  ];

  // 检查是否触发天劫（仅跨大境界且有天劫风险的境界）
  const realmDef = REALM_DEFINITIONS[newRealmName as keyof typeof REALM_DEFINITIONS];
  const triggersTribulation = isMajorBreakthrough && (realmDef?.tribulationRisk ?? 0) > 0;

  return { success: true, events, triggersTribulation };
}

function buildFailureResult(state: GameState): BreakthroughResult {
  const realmDef = REALM_DEFINITIONS[state.player.realm.name];
  const cultivationLoss = 10 + Math.floor(Math.random() * 21); // 10-30
  const statDamage = 5 + Math.floor(realmDef.index * 3); // 随境界递增

  const description = `突破${state.player.realm.name}${state.player.realm.subStage}失败，修为反噬！损失了 ${cultivationLoss}% 的修炼进度。`;

  const events: GameEvent[] = [
    Events.narrative('system', `真气紊乱，经脉震荡！${description}`),
    Events.cultivationGain(-cultivationLoss),
    Events.statChange('player', { hp: -statDamage }),
  ];

  return {
    success: false,
    events,
    triggersTribulation: false,
    failurePenalty: { cultivationLoss, statDamage, description },
  };
}

// ==================== 天劫结算 ====================

export function resolveTribulation(
  state: GameState,
  randomFn: () => number = Math.random
): TribulationResult {
  const realmDef = REALM_DEFINITIONS[state.player.realm.name];
  const willpowerBonus = 1 + 0.2 * (state.player.stats.willpower / 50);
  let survivalChance = (1 - realmDef.tribulationRisk) * willpowerBonus;
  survivalChance = Math.max(0.1, Math.min(0.95, survivalChance));

  const roll = randomFn();
  const survived = roll < survivalChance;

  if (survived) {
    return {
      survived: true,
      events: [
        Events.narrative(
          'system',
          `天雷滚滚，九死一生！你以坚强的意志抵御天劫，成功踏入**${state.player.realm.name}${state.player.realm.subStage}**！` +
            `\n天劫洗礼后，你的神识更加坚韧。`
        ),
        Events.statChange('player', { willpower: 5, maxHp: 20, maxQi: 30 }),
      ],
    };
  }

  // 天劫失败：境界保留但修为清零、重伤
  return {
    survived: false,
    events: [
      Events.narrative(
        'system',
        `天劫威力远超预期！你虽勉强保住境界，但身受重伤，修为尽失。` +
          `\n「修行之路，劫难重重。重整旗鼓，再踏仙途。」`
      ),
      Events.cultivationGain(-state.player.realm.cultivation),
      Events.statChange('player', {
        hp: -Math.floor(state.player.stats.maxHp * 0.5),
        qi: -Math.floor(state.player.stats.maxQi * 0.3),
      }),
    ],
  };
}

// ==================== 修炼速度计算 ====================

export function calculateCultivationSpeed(state: GameState): CultivationSpeed {
  const realmIndex = state.player.realm.progressIndex;

  // 基础修炼速度：5 + 境界加权
  const baseRate = 5 + realmIndex * 0.5;

  // 位置加成
  const location = getCurrentLocationForCultivation(state);
  const locationBonus = calcLocationBonus(location?.type);

  // 天赋加成
  const talentBonus = state.player.flags['natural_spirit_root'] ? 0.2 * baseRate : 0;

  // 装备被动修炼加成
  const passiveEffects = calculatePassiveEffects(state.player.equipment);
  const equipBonus = passiveEffects.cultivationBonus;

  const total = Math.max(1, baseRate + locationBonus + talentBonus + equipBonus);

  const parts: string[] = [`基础: ${baseRate.toFixed(1)}`];
  if (locationBonus !== 0)
    parts.push(`位置: ${locationBonus > 0 ? '+' : ''}${locationBonus.toFixed(1)}`);
  if (talentBonus > 0) parts.push(`灵根天赋: +${talentBonus.toFixed(1)}`);
  if (equipBonus > 0) parts.push(`装备加成: +${equipBonus.toFixed(1)}`);

  return {
    baseRate,
    locationBonus,
    talentBonus,
    total: Math.round(total * 10) / 10,
    breakdown: parts.join(' | '),
  };
}

function calcLocationBonus(type?: string): number {
  switch (type) {
    case 'city':
      return 0;
    case 'wilderness':
      return 2;
    case 'sect':
      return 3;
    case 'dungeon':
      return -1;
    case 'secret_realm':
      return 5;
    case 'market':
      return 0;
    default:
      return 1;
  }
}

function getCurrentLocationForCultivation(state: GameState) {
  return state.world.regions
    .flatMap((r) => r.locations)
    .find((l) => l.id === state.world.currentLocationId);
}

// ==================== 主动修炼 ====================

export function performCultivation(state: GameState, rounds: number = 1): GameEvent[] {
  const clampedRounds = Math.max(1, Math.min(10, Math.floor(rounds)));
  const speed = calculateCultivationSpeed(state);
  const currentCult = state.player.realm.cultivation;
  const remainingCapacity = 100 - currentCult;
  const totalGain = Math.min(remainingCapacity, speed.total * clampedRounds);

  const events: GameEvent[] = [];

  // 修炼叙事
  const locationType = getCurrentLocationForCultivation(state)?.type ?? 'wilderness';
  let localeDesc: string;
  switch (locationType) {
    case 'wilderness':
      localeDesc = '山野灵气充沛';
      break;
    case 'sect':
      localeDesc = '宗门灵气浓郁';
      break;
    case 'secret_realm':
      localeDesc = '秘境之中灵气如实质';
      break;
    case 'dungeon':
      localeDesc = '矿洞中灵气稀薄，修炼效果不佳';
      break;
    default:
      localeDesc = '周围的灵气尚可';
  }

  const actionText =
    clampedRounds > 1
      ? `你凝神静气，闭目修炼了 ${clampedRounds} 个周天。`
      : '你凝神静气，运功修炼了一个周天。';

  events.push(
    Events.narrative(
      'system',
      `${actionText}\n${localeDesc}，修炼速度：${speed.total}/周天（${speed.breakdown}）。` +
        `\n修炼进度 +${Math.round(totalGain)}%（当前 ${Math.round(Math.min(100, currentCult + totalGain))}%）`
    )
  );

  events.push(Events.cultivationGain(Math.round(totalGain)));

  // 修炼满时给出提示
  if (currentCult + totalGain >= 100) {
    events.push(
      Events.narrative(
        'system',
        `\n💡 修炼已达圆满！可以尝试突破境界（输入 /look 后再突破，或等待系统提示）。`
      )
    );
  }

  return events;
}

// ==================== 获取下一境界信息 ====================

export function getNextRealmInfo(currentIndex: number): {
  nextSubStage?: string;
  nextRealm?: string;
  newProgressIndex: number;
  isMajorBreakthrough: boolean;
  isMaxRealm: boolean;
} {
  if (currentIndex >= 35) {
    return { newProgressIndex: 35, isMajorBreakthrough: false, isMaxRealm: true };
  }

  const next = getRealmFromProgress(currentIndex + 1);
  const currentSubStage = getRealmFromProgress(currentIndex).subStage;

  return {
    nextSubStage: next.subStage,
    nextRealm: next.name,
    newProgressIndex: currentIndex + 1,
    isMajorBreakthrough: currentSubStage === '圆满',
    isMaxRealm: false,
  };
}
