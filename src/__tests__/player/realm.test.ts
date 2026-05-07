// ============================================================
// 境界系统测试 — 突破、天劫、修炼速度
// ============================================================

import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../game/state';
import type { GameState } from '../../game/types';
import {
  attemptBreakthrough,
  calculateCultivationSpeed,
  canAttemptBreakthrough,
  getNextRealmInfo,
  performCultivation,
  resolveTribulation,
} from '../../player/realm';
import { CANGWU_MOUNTAINS } from '../../world/world-data';

// ==================== 测试辅助 ====================

function makeState(overrides?: Partial<GameState>): GameState {
  const state = createInitialState('测试修士', 'normal', CANGWU_MOUNTAINS);
  if (overrides) {
    Object.assign(state, overrides);
  }
  return state;
}

/** 将 cultivation 设置为 100 的快速方法 */
function setMaxCultivation(state: GameState): void {
  state.player.realm.cultivation = 100;
}

// ==================== canAttemptBreakthrough ====================

describe('canAttemptBreakthrough', () => {
  it('should return canAttempt: false when cultivation < 100', () => {
    const state = makeState();
    state.player.realm.cultivation = 30;
    const result = canAttemptBreakthrough(state);
    expect(result.canAttempt).toBe(false);
    expect(result.reason).toContain('不足');
  });

  it('should return canAttempt: true when cultivation is 100', () => {
    const state = makeState();
    setMaxCultivation(state);
    const result = canAttemptBreakthrough(state);
    expect(result.canAttempt).toBe(true);
    expect(result.breakthroughDifficulty).toBeGreaterThan(0);
  });

  it('should report correct realm info', () => {
    const state = makeState();
    setMaxCultivation(state);
    const result = canAttemptBreakthrough(state);
    expect(result.currentRealm).toContain('炼气');
    expect(result.cultivation).toBe(100);
  });

  it('should report tribulationRisk correctly', () => {
    const state = makeState();
    setMaxCultivation(state);
    const result = canAttemptBreakthrough(state);
    // 炼气期天劫风险为0
    expect(result.tribulationRisk).toBe(0);
  });
});

// ==================== attemptBreakthrough ====================

describe('attemptBreakthrough', () => {
  it('should return failure result when canAttempt is false', () => {
    const state = makeState();
    // cultivation is 0, can't break through
    const result = attemptBreakthrough(state, () => 0);
    expect(result.success).toBe(false);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('should succeed when randomFn returns very low value (always win)', () => {
    const state = makeState();
    setMaxCultivation(state);
    // random = 0 always wins since successChance >= 0.05
    const result = attemptBreakthrough(state, () => 0);
    expect(result.success).toBe(true);
    // Should have realm_advance event
    const advanceEvent = result.events.find((e) => e.type === 'realm_advance');
    expect(advanceEvent).toBeDefined();
    if (advanceEvent && advanceEvent.type === 'realm_advance') {
      // 炼气前期 -> 炼气中期
      expect(advanceEvent.newProgressIndex).toBe(1);
    }
  });

  it('should fail when randomFn returns very high value (always lose)', () => {
    const state = makeState();
    setMaxCultivation(state);
    // random = 0.99 always fails (clamped max is 0.95)
    const result = attemptBreakthrough(state, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.failurePenalty).toBeDefined();
    expect(result.failurePenalty!.cultivationLoss).toBeGreaterThan(0);
    // Should have cultivation_gain with negative amount
    const cultEvent = result.events.find((e) => e.type === 'cultivation_gain');
    expect(cultEvent).toBeDefined();
  });

  it('should produce narrative event on success', () => {
    const state = makeState();
    setMaxCultivation(state);
    const result = attemptBreakthrough(state, () => 0);
    const narrativeEvents = result.events.filter((e) => e.type === 'narrative');
    expect(narrativeEvents.length).toBeGreaterThan(0);
  });

  it('should produce narrative and stat_change on failure', () => {
    const state = makeState();
    setMaxCultivation(state);
    const result = attemptBreakthrough(state, () => 0.99);
    const narrativeEvents = result.events.filter((e) => e.type === 'narrative');
    const statEvents = result.events.filter((e) => e.type === 'stat_change');
    expect(narrativeEvents.length).toBeGreaterThan(0);
    expect(statEvents.length).toBeGreaterThan(0);
  });
});

// ==================== resolveTribulation ====================

describe('resolveTribulation', () => {
  it('should survive when random = 0 (always win)', () => {
    const state = makeState();
    // need a realm with tribulationRisk > 0
    state.player.realm = { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 0 };
    const result = resolveTribulation(state, () => 0);
    expect(result.survived).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
    // Should have stat bonuses
    const statEvent = result.events.find((e) => e.type === 'stat_change');
    expect(statEvent).toBeDefined();
  });

  it('should fail tribulation when random = 0.99', () => {
    const state = makeState();
    state.player.realm = { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 50 };
    const result = resolveTribulation(state, () => 0.99);
    expect(result.survived).toBe(false);
  });

  it('should always survive for 炼气 realm (tribulationRisk = 0)', () => {
    const state = makeState();
    // 炼气 has tribulationRisk = 0, so survival chance is very high
    const result = resolveTribulation(state, () => 0.5);
    expect(result.survived).toBe(true);
  });

  it('should include narrative events in tribulation result', () => {
    const state = makeState();
    state.player.realm = { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 30 };
    const result = resolveTribulation(state, () => 0);
    const narrativeEvents = result.events.filter((e) => e.type === 'narrative');
    expect(narrativeEvents.length).toBeGreaterThan(0);
  });
});

// ==================== calculateCultivationSpeed ====================

describe('calculateCultivationSpeed', () => {
  it('should return base rate > 0 for any state', () => {
    const state = makeState();
    const speed = calculateCultivationSpeed(state);
    expect(speed.total).toBeGreaterThan(0);
    expect(speed.baseRate).toBeGreaterThan(0);
  });

  it('should give location bonus for wilderness', () => {
    const state = makeState();
    state.world.currentLocationId = 'outside_forest'; // wilderness
    const speed = calculateCultivationSpeed(state);
    expect(speed.locationBonus).toBeGreaterThan(0);
  });

  it('should give location bonus for sect', () => {
    const state = makeState();
    state.world.currentLocationId = 'qingyun_outer'; // sect
    const speed = calculateCultivationSpeed(state);
    expect(speed.locationBonus).toBe(3);
  });

  it('should give high bonus for secret_realm', () => {
    const state = makeState();
    state.world.currentLocationId = 'ancient_cave'; // secret_realm
    const speed = calculateCultivationSpeed(state);
    expect(speed.locationBonus).toBe(5);
  });

  it('should give negative bonus for dungeon', () => {
    const state = makeState();
    state.world.currentLocationId = 'abandoned_mine'; // dungeon
    const speed = calculateCultivationSpeed(state);
    expect(speed.locationBonus).toBe(-1);
  });

  it('should give zero bonus for city', () => {
    const state = makeState();
    state.world.currentLocationId = 'cangwu_city'; // city
    const speed = calculateCultivationSpeed(state);
    expect(speed.locationBonus).toBe(0);
  });

  it('should include natural_spirit_root talent bonus', () => {
    const state = makeState();
    state.player.flags['natural_spirit_root'] = true;
    const speed = calculateCultivationSpeed(state);
    expect(speed.talentBonus).toBeGreaterThan(0);
    expect(speed.total).toBeGreaterThan(speed.baseRate);
  });

  it('should have breakdown string', () => {
    const state = makeState();
    const speed = calculateCultivationSpeed(state);
    expect(speed.breakdown).toBeDefined();
    expect(speed.breakdown.length).toBeGreaterThan(0);
  });
});

// ==================== performCultivation ====================

describe('performCultivation', () => {
  it('should return events with cultivation_gain', () => {
    const state = makeState();
    const events = performCultivation(state, 1);
    const cultEvent = events.find((e) => e.type === 'cultivation_gain');
    expect(cultEvent).toBeDefined();
    if (cultEvent && cultEvent.type === 'cultivation_gain') {
      expect(cultEvent.amount).toBeGreaterThan(0);
    }
  });

  it('should return narrative event', () => {
    const state = makeState();
    const events = performCultivation(state, 1);
    const narrativeEvents = events.filter((e) => e.type === 'narrative');
    expect(narrativeEvents.length).toBeGreaterThan(0);
  });

  it('should scale with multiple rounds', () => {
    const state = makeState();
    const events1 = performCultivation(state, 1);
    const events3 = performCultivation(state, 3);

    const gain1 = events1
      .filter((e) => e.type === 'cultivation_gain')
      .reduce((sum, e) => sum + (e.type === 'cultivation_gain' ? e.amount : 0), 0);
    const gain3 = events3
      .filter((e) => e.type === 'cultivation_gain')
      .reduce((sum, e) => sum + (e.type === 'cultivation_gain' ? e.amount : 0), 0);

    expect(gain3).toBeGreaterThanOrEqual(gain1);
  });

  it('should clamp rounds to max 10', () => {
    const state = makeState();
    const events = performCultivation(state, 100);
    expect(events.length).toBeGreaterThan(0);
    // should not throw
  });

  it('should not exceed 100 cultivation cap', () => {
    const state = makeState();
    state.player.realm.cultivation = 95;
    const events = performCultivation(state, 10);
    const cultEvent = events.find((e) => e.type === 'cultivation_gain');
    if (cultEvent && cultEvent.type === 'cultivation_gain') {
      // gain should be at most 5 (remaining to 100)
      expect(cultEvent.amount).toBeLessThanOrEqual(5);
    }
  });
});

// ==================== getNextRealmInfo ====================

describe('getNextRealmInfo', () => {
  it('should return correct next for 炼气前期 (index 0)', () => {
    const info = getNextRealmInfo(0);
    expect(info.newProgressIndex).toBe(1);
    expect(info.isMajorBreakthrough).toBe(false);
    expect(info.isMaxRealm).toBe(false);
  });

  it('should detect major breakthrough at 圆满', () => {
    // 炼气圆满 = index 3
    const info = getNextRealmInfo(3);
    expect(info.isMajorBreakthrough).toBe(true);
    expect(info.nextRealm).toBe('筑基');
  });

  it('should return isMaxRealm for index 35 (渡劫圆满)', () => {
    const info = getNextRealmInfo(35);
    expect(info.isMaxRealm).toBe(true);
  });
});
