// ============================================================
// 战斗编排器 — 回合结算、敌人AI、胜负判定
// 所有函数为纯函数，接受只读状态，返回事件列表
// ============================================================

import * as Events from '../game/events';
import type {
  CombatAction,
  CombatSkill,
  CombatState,
  Enemy,
  GameEvent,
  GameItem,
  GameState,
} from '../game/types';
import {
  applyDefendReduction,
  calcEnemyDamage,
  calcFlee,
  calcPetBasicDamage,
  calcPetSkillDamage,
  calcPlayerDamage,
  calculatePlayerAttack,
  calculatePlayerDefense,
  generateLoot,
} from './combat-resolver';

// ==================== 回合处理结果 ====================

export interface RoundResult {
  /** 需要应用的 events（stat_change + combat_turn） */
  events: GameEvent[];
  /** 战斗是否结束 */
  combatEnded: boolean;
  /** 结束结果（仅在 combatEnded 为 true 时有值） */
  endResult?: 'victory' | 'defeat' | 'fled';
  /** 战利品（仅在 victory 时有值） */
  loot?: GameItem[];
}

// ==================== 辅助函数 ====================

/** 检查战斗是否结束 */
export function checkCombatEnd(state: GameState): 'ongoing' | 'victory' | 'defeat' {
  if (!state.combat) return 'ongoing';
  if (state.combat.enemy.stats.hp <= 0) return 'victory';
  if (state.player.stats.hp <= 0) return 'defeat';
  return 'ongoing';
}

/** Boss 战不允许逃跑 */
export function canFlee(combatState: CombatState): boolean {
  return combatState.combatType !== 'boss';
}

/** 获取背包中可用于战斗的消耗品 */
export function getUsableCombatItems(state: GameState): GameItem[] {
  return state.inventory.filter(
    (item) =>
      item.type === 'consumable' &&
      item.effects.some((e) => e.duration === 'instant' || e.duration === 'combat')
  );
}

/** 检查灵宠是否可以助战 */
export function canPetAssist(state: GameState): boolean {
  if (!state.activePetId) return false;
  const pet = state.pets.find((p) => p.id === state.activePetId);
  if (!pet) return false;
  if (pet.stats.hp <= 0) return false;
  // 检查宠物是否有可用技能
  const availableSkills = pet.skills.filter((s) => s.currentCooldown <= 0);
  return availableSkills.length > 0 || pet.stats.attack > 0;
}

// ==================== 敌人 AI ====================

/** 根据 behavior 字段决定敌人行动 */
export function decideEnemyAction(
  enemy: Enemy,
  randomFn: () => number = Math.random
): CombatAction {
  const hpRatio = enemy.stats.hp / enemy.stats.maxHp;
  const hasSkill = enemy.skills.length > 0;
  const roll = randomFn();

  switch (enemy.behavior) {
    case 'aggressive':
      // 70% 攻击，30% 技能（如果有）
      if (hasSkill && roll < 0.3) {
        const idx = Math.floor(randomFn() * enemy.skills.length);
        const skill = enemy.skills[idx];
        if (skill) return { type: 'attack', skillName: skill.name };
        return { type: 'attack' };
      }
      return { type: 'attack' };

    case 'defensive':
      // 40% 攻击，30% 防御，30% 技能
      if (hpRatio < 0.4) {
        return { type: 'defend' };
      }
      if (roll < 0.4) return { type: 'attack' };
      if (roll < 0.7) return { type: 'defend' };
      if (hasSkill) {
        const idx = Math.floor(randomFn() * enemy.skills.length);
        const skill = enemy.skills[idx];
        if (skill) return { type: 'attack', skillName: skill.name };
        return { type: 'attack' };
      }
      return { type: 'attack' };

    case 'berserk':
      // 血越少越疯狂，80% 攻击/技能，20% 防御
      if (hpRatio < 0.3) {
        // 濒死狂暴：优先用最强技能
        if (hasSkill) {
          const bestSkill = enemy.skills.reduce((a, b) =>
            a.damageMultiplier > b.damageMultiplier ? a : b
          );
          return { type: 'attack', skillName: bestSkill.name };
        }
        return { type: 'attack' };
      }
      if (hasSkill && roll < 0.4) {
        const idx = Math.floor(randomFn() * enemy.skills.length);
        const skill = enemy.skills[idx];
        if (skill) return { type: 'attack', skillName: skill.name };
        return { type: 'attack' };
      }
      if (roll < 0.8) return { type: 'attack' };
      return { type: 'defend' };

    case 'cunning':
      // 血量高时用技能，血量低时防御多
      if (hpRatio > 0.5) {
        if (hasSkill && roll < 0.6) {
          const idx = Math.floor(randomFn() * enemy.skills.length);
          const skill = enemy.skills[idx];
          if (skill) return { type: 'attack', skillName: skill.name };
        }
        return { type: 'attack' };
      }
      if (hpRatio < 0.3) {
        return roll < 0.5 ? { type: 'defend' } : { type: 'attack' };
      }
      return roll < 0.4 ? { type: 'defend' } : { type: 'attack' };

    default:
      return roll < 0.5 ? { type: 'attack' } : { type: 'defend' };
  }
}

// ==================== 回合处理 ====================

/** 处理一整个战斗回合 */
export function processRound(
  state: GameState,
  playerAction: CombatAction,
  randomFn: () => number = Math.random
): RoundResult {
  const events: GameEvent[] = [];
  const combat = state.combat;
  if (!combat) {
    return { events: [], combatEnded: true };
  }

  const playerAttack = calculatePlayerAttack(state);
  const playerDefense = calculatePlayerDefense(state);
  const enemy = combat.enemy;

  // ---- 处理逃跑 ----
  if (playerAction.type === 'flee') {
    if (!canFlee(combat)) {
      // Boss 战不可逃跑
      const enemyAction: CombatAction = { type: 'attack' };
      const enemyDmg = calcEnemyDamage(
        enemy.attack,
        playerDefense,
        enemy.name,
        'attack',
        undefined,
        randomFn
      );
      events.push(Events.statChange('player', { hp: -enemyDmg.damage }));
      events.push(
        Events.combatTurn(
          combat.turn + 1,
          playerAction,
          enemyAction,
          `Boss 战无法逃跑！${enemyDmg.narrative}`
        )
      );
    } else {
      const fleeResult = calcFlee(
        state.player.realm.progressIndex,
        enemy.realm.progressIndex,
        enemy.attack,
        playerDefense,
        randomFn
      );

      if (fleeResult.success) {
        events.push(
          Events.combatTurn(combat.turn + 1, playerAction, { type: 'attack' }, fleeResult.narrative)
        );
        return {
          events,
          combatEnded: true,
          endResult: 'fled',
        };
      }

      // 逃跑失败，敌人攻击
      const enemyAction: CombatAction = { type: 'attack' };
      events.push(Events.statChange('player', { hp: -fleeResult.counterDamage }));
      events.push(
        Events.combatTurn(combat.turn + 1, playerAction, enemyAction, fleeResult.narrative)
      );
    }
  }

  // ---- 处理玩家行动 ----
  let playerDefending = false;

  if (playerAction.type === 'attack') {
    const skillName = playerAction.skillName;
    let skill: CombatSkill | undefined;
    if (skillName) {
      // 从装备的功法中查找技能
      const equippedTech = state.player.techniques.find((t) => t.equipped);
      skill = equippedTech?.skills.find((s) => s.name === skillName);
    }

    const dmgResult = calcPlayerDamage(
      playerAttack,
      enemy.defense,
      enemy.name,
      skill ? 'skill' : 'attack',
      skill,
      state.player.stats.qi,
      state.player.stats.stamina,
      randomFn
    );

    if (dmgResult.resourceFail) {
      // 资源不足，降级为普通攻击
      const basicDmg = calcPlayerDamage(
        playerAttack,
        enemy.defense,
        enemy.name,
        'attack',
        undefined,
        undefined,
        undefined,
        randomFn
      );
      events.push(Events.statChange('enemy', { hp: -basicDmg.damage }));
      events.push(
        Events.narrative(
          'system',
          `${dmgResult.narrative} 你改为普通攻击，对${enemy.name}造成 ${basicDmg.damage} 点伤害。`
        )
      );
    } else {
      events.push(Events.statChange('enemy', { hp: -dmgResult.damage }));
      if (dmgResult.cost) {
        if (dmgResult.cost.qi) {
          events.push(Events.statChange('player', { qi: -dmgResult.cost.qi }));
        }
        if (dmgResult.cost.stamina) {
          events.push(Events.statChange('player', { stamina: -dmgResult.cost.stamina }));
        }
      }
    }
  } else if (playerAction.type === 'defend') {
    playerDefending = true;
  } else if (playerAction.type === 'item') {
    // 使用物品：在 stat_change 处理中体现
    const item = state.inventory.find((i) => i.id === playerAction.itemId);
    if (item) {
      events.push(Events.itemUse(item.id, item.effects));
      for (const effect of item.effects) {
        if (effect.duration === 'instant') {
          const changes: Partial<{ hp: number; qi: number; stamina: number; willpower: number }> =
            {};
          if (effect.attribute === 'hp') changes.hp = effect.value;
          if (effect.attribute === 'qi') changes.qi = effect.value;
          if (effect.attribute === 'stamina') changes.stamina = effect.value;
          if (effect.attribute === 'willpower') changes.willpower = effect.value;
          if (Object.keys(changes).length > 0) {
            events.push(Events.statChange('player', changes));
          }
        }
      }
    }
  } else if (playerAction.type === 'pet_assist') {
    // 灵宠助战：技能优先，支持冷却和忠诚度
    const pet = state.pets.find((p) => p.id === state.activePetId);
    if (pet) {
      // 忠诚度检查：是否拒绝行动
      const loyaltyRoll = randomFn();
      const willRefuse =
        (pet.loyalty <= 19 && loyaltyRoll < 0.5) || (pet.loyalty <= 30 && loyaltyRoll < 0.25);

      if (willRefuse) {
        events.push(
          Events.narrative(
            'system',
            pet.loyalty <= 19
              ? `${pet.name}对你的命令置若罔闻，叛逆地站在一旁。`
              : `${pet.name}显得不太情愿，没有回应你的指令。`
          )
        );
      } else {
        // 忠诚度伤害加成
        const loyaltyMultiplier = pet.loyalty >= 80 ? 1.15 : 1.0;

        const skillName = playerAction.petSkillName;
        const skill = skillName
          ? pet.skills.find((s) => s.name === skillName && s.currentCooldown <= 0)
          : undefined;

        if (skill) {
          // 使用宠物技能
          const dmgResult = calcPetSkillDamage(
            pet.stats.attack,
            skill.cooldown,
            enemy.defense,
            randomFn
          );
          const finalDmg = Math.max(1, Math.round(dmgResult.damage * loyaltyMultiplier));
          events.push(Events.statChange('enemy', { hp: -finalDmg }));
          events.push(Events.petSkillCooldown(pet.id, skill.name, skill.cooldown));
          events.push(
            Events.narrative(
              'system',
              `${pet.name}施展「${skill.name}」，对${enemy.name}${dmgResult.narrative}！`
            )
          );
        } else {
          // 普通攻击
          const dmgResult = calcPetBasicDamage(pet.stats.attack, enemy.defense, randomFn);
          const finalDmg = Math.max(1, Math.round(dmgResult.damage * loyaltyMultiplier));
          events.push(Events.statChange('enemy', { hp: -finalDmg }));
          events.push(
            Events.narrative(
              'system',
              `${pet.name}协助攻击，对${enemy.name}${dmgResult.narrative}！`
            )
          );
        }
      }
    }
  }

  // ---- 敌人行动 ----
  const enemyAction = decideEnemyAction(enemy, randomFn);

  if (enemyAction.type === 'attack') {
    const skillName = enemyAction.skillName;
    const skill = skillName ? enemy.skills.find((s) => s.name === skillName) : undefined;

    let enemyDmg = calcEnemyDamage(
      enemy.attack,
      playerDefense,
      enemy.name,
      skill ? 'skill' : 'attack',
      skill,
      randomFn
    );

    if (playerDefending) {
      enemyDmg = {
        ...enemyDmg,
        damage: applyDefendReduction(enemyDmg.damage),
        narrative: `你采取防御姿态，${enemyDmg.narrative.replace(/造成 \d+ 点伤害/, `造成 ${applyDefendReduction(enemyDmg.damage)} 点伤害（减半）`)}`,
      };
    }

    events.push(Events.statChange('player', { hp: -enemyDmg.damage }));
  }
  // 敌人防御：不需要额外处理，因为不影响 player 的伤害值

  // ---- 宠物技能冷却递减 ----
  const activePet = state.pets.find((p) => p.id === state.activePetId);
  if (activePet) {
    for (const skill of activePet.skills) {
      if (skill.currentCooldown > 0) {
        events.push(Events.petSkillCooldown(activePet.id, skill.name, skill.currentCooldown - 1));
      }
    }
  }

  // ---- 生成回合叙事 ----
  const turnNarrative = buildTurnNarrative(state, playerAction, enemyAction, playerDefending);

  events.push(Events.combatTurn(combat.turn + 1, playerAction, enemyAction, turnNarrative));

  // ---- 检查战斗结束 ----
  // 临时应用 events 来判断战斗是否结束（仅在内存中检查）
  const enemyHpChange = events
    .filter((e) => e.type === 'stat_change' && e.target === 'enemy')
    .reduce((sum, e) => {
      if (e.type === 'stat_change' && e.changes.hp) return sum + e.changes.hp;
      return sum;
    }, 0);
  const playerHpChange = events
    .filter((e) => e.type === 'stat_change' && e.target === 'player')
    .reduce((sum, e) => {
      if (e.type === 'stat_change' && e.changes.hp) return sum + e.changes.hp;
      return sum;
    }, 0);

  const newEnemyHp = enemy.stats.hp + enemyHpChange;
  const newPlayerHp = state.player.stats.hp + playerHpChange;

  if (newEnemyHp <= 0) {
    return {
      events,
      combatEnded: true,
      endResult: 'victory',
      loot: generateLoot(enemy.loot, randomFn),
    };
  }

  if (newPlayerHp <= 0) {
    return {
      events,
      combatEnded: true,
      endResult: 'defeat',
    };
  }

  return {
    events,
    combatEnded: false,
  };
}

// ==================== 回合叙事生成 ====================

/** 构建战斗回合叙事文本 */
export function buildTurnNarrative(
  state: GameState,
  playerAction: CombatAction,
  enemyAction: CombatAction,
  playerDefending: boolean
): string {
  const parts: string[] = [];
  const enemy = state.combat?.enemy;
  const enemyName = enemy?.name ?? '敌人';

  // 玩家行动描述
  switch (playerAction.type) {
    case 'attack': {
      const skillName = playerAction.skillName;
      parts.push(skillName ? `你施展「${skillName}」攻击${enemyName}` : `你向${enemyName}发起攻击`);
      break;
    }
    case 'defend':
      parts.push('你凝神静气，摆出防御姿态');
      break;
    case 'item': {
      const item = state.inventory.find((i) => i.id === playerAction.itemId);
      parts.push(item ? `你使用了「${item.name}」` : '你使用了物品');
      break;
    }
    case 'flee':
      parts.push('你试图逃离战斗');
      break;
    case 'pet_assist': {
      const pet = state.pets.find((p) => p.id === state.activePetId);
      if (pet) {
        const skillName = playerAction.petSkillName;
        parts.push(skillName ? `你命令${pet.name}施展「${skillName}」` : `你命令${pet.name}助战`);
      } else {
        parts.push('你召唤灵宠助战');
      }
      break;
    }
  }

  // 敌人行动描述
  switch (enemyAction.type) {
    case 'attack': {
      const skillName = enemyAction.skillName;
      if (skillName) {
        parts.push(`，${enemyName}施展「${skillName}」反击`);
      } else {
        parts.push(`，${enemyName}发起反击`);
      }
      if (playerDefending) {
        parts.push('，防御姿态减免了部分伤害');
      }
      break;
    }
    case 'defend':
      parts.push(`，${enemyName}采取守势`);
      break;
    default:
      parts.push(`，${enemyName}伺机而动`);
  }

  parts.push('。');

  // 状态总结
  if (enemy) {
    const enemyHpRatio = Math.round((enemy.stats.hp / enemy.stats.maxHp) * 100);
    const playerHpRatio = Math.round((state.player.stats.hp / state.player.stats.maxHp) * 100);
    parts.push(` [敌方${enemyName} HP:${enemyHpRatio}% | 玩家 HP:${playerHpRatio}%]`);
  }

  return parts.join('');
}
