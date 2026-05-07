// ============================================================
// 战斗数值解析器 单元测试
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  applyDefendReduction,
  applyVariance,
  calcEnemyDamage,
  calcExperience,
  calcFlee,
  calcPlayerDamage,
  calculateCompositePower,
  generateLoot,
  quickResolve,
  rollCrit,
} from '../../combat/combat-resolver';
import { createInitialState } from '../../game/state';
import type { CombatSkill, Enemy, GameState } from '../../game/types';

// ==================== 测试数据 ====================

function makeTestState(): GameState {
  return createInitialState('测试修士', 'normal', []);
}

function makeTestEnemy(overrides?: Partial<Enemy>): Enemy {
  return {
    id: 'test_wolf',
    name: '测试狼',
    type: 'minor',
    realm: { name: '炼气', subStage: '后期', progressIndex: 2, cultivation: 0 },
    stats: { hp: 120, maxHp: 120, qi: 40, maxQi: 40, stamina: 80, maxStamina: 80, willpower: 15 },
    attack: 28,
    defense: 8,
    skills: [],
    loot: {
      guaranteed: [{ itemId: 'test_hide', quantity: 1 }],
      possible: [{ itemId: 'test_fang', quantity: 1, chance: 0.5 }],
      experience: 20,
    },
    description: '一只测试用的狼',
    behavior: 'aggressive',
    ...overrides,
  };
}

function makeTestSkill(overrides?: Partial<CombatSkill>): CombatSkill {
  return {
    name: '测试剑法',
    qiCost: 10,
    staminaCost: 5,
    damageMultiplier: 1.5,
    description: '测试用技能',
    ...overrides,
  };
}

// ==================== applyVariance ====================

describe('applyVariance', () => {
  it('should apply variance within ±20% range', () => {
    const results: number[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(applyVariance(100, Math.random));
    }
    const min = Math.min(...results);
    const max = Math.max(...results);
    expect(min).toBeGreaterThanOrEqual(80);
    expect(max).toBeLessThanOrEqual(120);
  });

  it('should return at least 1', () => {
    expect(applyVariance(1, () => 0)).toBe(1);
  });

  it('should produce deterministic result with fixed randomFn', () => {
    const result = applyVariance(100, () => 0.5);
    expect(result).toBe(100); // variance = 0.8 + 0.5*0.4 = 1.0
  });
});

// ==================== rollCrit ====================

describe('rollCrit', () => {
  it('should return false when random >= 0.05', () => {
    expect(rollCrit(() => 0.05)).toBe(false);
    expect(rollCrit(() => 0.5)).toBe(false);
  });

  it('should return true when random < 0.05', () => {
    expect(rollCrit(() => 0.04)).toBe(true);
    expect(rollCrit(() => 0)).toBe(true);
  });
});

// ==================== applyDefendReduction ====================

describe('applyDefendReduction', () => {
  it('should halve the damage', () => {
    expect(applyDefendReduction(100)).toBe(50);
    expect(applyDefendReduction(50)).toBe(25);
  });

  it('should return at least 1', () => {
    expect(applyDefendReduction(1)).toBe(1);
  });
});

// ==================== calcPlayerDamage ====================

describe('calcPlayerDamage', () => {
  const rng = () => 0.5;

  it('should calculate basic attack damage', () => {
    const result = calcPlayerDamage(
      50,
      10,
      '测试狼',
      'attack',
      undefined,
      undefined,
      undefined,
      rng
    );
    expect(result.damage).toBeGreaterThan(0);
    expect(result.isCrit).toBe(false);
    expect(result.narrative).toContain('测试狼');
    expect(result.resourceFail).toBeUndefined();
  });

  it('should apply skill damage multiplier', () => {
    const skill = makeTestSkill();
    const basicResult = calcPlayerDamage(
      50,
      10,
      '测试狼',
      'attack',
      undefined,
      undefined,
      undefined,
      rng
    );
    const skillResult = calcPlayerDamage(50, 10, '测试狼', 'skill', skill, 100, 100, rng);
    expect(skillResult.damage).toBeGreaterThan(basicResult.damage);
    expect(skillResult.cost).toEqual({ qi: 10, stamina: 5 });
  });

  it('should fail when qi is insufficient', () => {
    const skill = makeTestSkill();
    const result = calcPlayerDamage(50, 10, '测试狼', 'skill', skill, 5, 100, rng);
    expect(result.resourceFail).toBe(true);
    expect(result.damage).toBe(0);
    expect(result.narrative).toContain('灵力不足');
  });

  it('should fail when stamina is insufficient', () => {
    const skill = makeTestSkill();
    const result = calcPlayerDamage(50, 10, '测试狼', 'skill', skill, 100, 3, rng);
    expect(result.resourceFail).toBe(true);
    expect(result.damage).toBe(0);
    expect(result.narrative).toContain('体力不支');
  });

  it('should handle crit hits', () => {
    const result = calcPlayerDamage(
      100,
      0,
      '测试狼',
      'attack',
      undefined,
      undefined,
      undefined,
      () => 0.01
    );
    expect(result.isCrit).toBe(true);
    expect(result.narrative).toContain('暴击');
  });

  it('should produce minimum damage of 1', () => {
    const result = calcPlayerDamage(
      1,
      100,
      '测试狼',
      'attack',
      undefined,
      undefined,
      undefined,
      () => 0
    );
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});

// ==================== calcEnemyDamage ====================

describe('calcEnemyDamage', () => {
  const rng = () => 0.5;

  it('should calculate basic enemy attack damage', () => {
    const result = calcEnemyDamage(30, 5, '测试狼', 'attack', undefined, rng);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.narrative).toContain('测试狼');
  });

  it('should apply skill damage for enemy', () => {
    const skill = makeTestSkill();
    const basicResult = calcEnemyDamage(30, 5, '测试狼', 'attack', undefined, rng);
    const skillResult = calcEnemyDamage(30, 5, '测试狼', 'skill', skill, rng);
    expect(skillResult.damage).toBeGreaterThan(basicResult.damage);
  });

  it('should produce minimum damage of 1', () => {
    const result = calcEnemyDamage(1, 100, '测试狼', 'attack', undefined, () => 0);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});

// ==================== calcFlee ====================

describe('calcFlee', () => {
  it('should succeed when random is very low and realm is higher', () => {
    const result = calcFlee(5, 2, 30, 10, () => 0.01);
    expect(result.success).toBe(true);
    expect(result.counterDamage).toBe(0);
  });

  it('should fail when random is very high', () => {
    const result = calcFlee(0, 10, 30, 10, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.counterDamage).toBeGreaterThan(0);
    expect(result.narrative).toContain('逃跑失败');
  });

  it('should have higher flee chance with realm advantage', () => {
    // With large advantage, should succeed even at 0.5
    const result = calcFlee(10, 2, 30, 10, () => 0.5);
    expect(result.success).toBe(true);
  });
});

// ==================== calculateCompositePower ====================

describe('calculateCompositePower', () => {
  it('should return higher power for stronger entities', () => {
    const weak = calculateCompositePower(
      0,
      { hp: 50, maxHp: 50, qi: 30, maxQi: 30, stamina: 40, maxStamina: 40, willpower: 10 },
      20,
      5,
      0
    );
    const strong = calculateCompositePower(
      4,
      { hp: 200, maxHp: 200, qi: 100, maxQi: 100, stamina: 80, maxStamina: 80, willpower: 30 },
      50,
      20,
      10
    );
    expect(strong).toBeGreaterThan(weak);
  });
});

// ==================== quickResolve ====================

describe('quickResolve', () => {
  it('should return victory for vastly stronger player', () => {
    // Player at 金丹期 should easily beat 炼气 enemy
    const state = makeTestState();
    state.player.realm = { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 0 };
    state.player.stats = {
      hp: 300,
      maxHp: 300,
      qi: 450,
      maxQi: 450,
      stamina: 120,
      maxStamina: 120,
      willpower: 50,
    };
    state.player.baseStats = { ...state.player.stats };

    const enemy = makeTestEnemy();
    const result = quickResolve(state, enemy, () => 0.5);

    expect(result.result).toBe('victory');
    expect(result.hpLoss).toBeGreaterThan(0);
    expect(result.loot).toBeDefined();
    expect(result.loot!.length).toBeGreaterThan(0);
  });

  it('should return defeat for much weaker player', () => {
    const state = makeTestState();
    // Player at 炼气前期 vs 金丹 enemy
    const enemy = makeTestEnemy({
      realm: { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 0 },
      stats: {
        hp: 500,
        maxHp: 500,
        qi: 300,
        maxQi: 300,
        stamina: 200,
        maxStamina: 200,
        willpower: 50,
      },
      attack: 70,
      defense: 30,
    });

    const result = quickResolve(state, enemy, () => 0.5);
    expect(result.result).toBe('defeat');
    expect(result.hpLoss).toBeGreaterThan(0);
  });
});

// ==================== generateLoot ====================

describe('generateLoot', () => {
  it('should always include guaranteed items', () => {
    const lootTable = {
      guaranteed: [{ itemId: 'guaranteed_item', quantity: 2 }],
      possible: [],
      experience: 10,
    };
    const loot = generateLoot(lootTable, () => 0.5);
    expect(loot).toHaveLength(1);
    expect(loot[0]!.id).toBe('guaranteed_item');
    expect(loot[0]!.quantity).toBe(2);
  });

  it('should include possible items when roll succeeds', () => {
    const lootTable = {
      guaranteed: [],
      possible: [{ itemId: 'rare_item', quantity: 1, chance: 0.5 }],
      experience: 10,
    };
    const loot = generateLoot(lootTable, () => 0.1);
    expect(loot).toHaveLength(1);
    expect(loot[0]!.id).toBe('rare_item');
  });

  it('should skip possible items when roll fails', () => {
    const lootTable = {
      guaranteed: [],
      possible: [{ itemId: 'rare_item', quantity: 1, chance: 0.5 }],
      experience: 10,
    };
    const loot = generateLoot(lootTable, () => 0.9);
    expect(loot).toHaveLength(0);
  });
});

// ==================== calcExperience ====================

describe('calcExperience', () => {
  it('should give more exp for boss', () => {
    const minor = makeTestEnemy({ type: 'minor' });
    const boss = makeTestEnemy({ type: 'boss' });
    expect(calcExperience(boss)).toBeGreaterThan(calcExperience(minor));
  });

  it('should scale with realm index', () => {
    const lowRealm = makeTestEnemy({
      realm: { name: '炼气', subStage: '前期', progressIndex: 0, cultivation: 0 },
    });
    const highRealm = makeTestEnemy({
      realm: { name: '筑基', subStage: '前期', progressIndex: 4, cultivation: 0 },
    });
    expect(calcExperience(highRealm)).toBeGreaterThan(calcExperience(lowRealm));
  });
});
