// ============================================================
// 战斗编排器 单元测试
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  canFlee,
  canPetAssist,
  checkCombatEnd,
  decideEnemyAction,
  getUsableCombatItems,
  processRound,
} from '../../combat/combat-manager';
import { createInitialState } from '../../game/state';
import type { CombatState, Enemy, GameItem, GameState } from '../../game/types';

// ==================== 测试数据 ====================

function makeTestState(): GameState {
  const state = createInitialState('测试修士', 'normal', []);
  // Set player to combat-ready stats
  state.player.stats = {
    hp: 200,
    maxHp: 200,
    qi: 100,
    maxQi: 100,
    stamina: 80,
    maxStamina: 80,
    willpower: 25,
  };
  state.player.baseStats = {
    hp: 200,
    maxHp: 200,
    qi: 100,
    maxQi: 100,
    stamina: 80,
    maxStamina: 80,
    willpower: 25,
  };
  state.player.realm = { name: '筑基', subStage: '前期', progressIndex: 4, cultivation: 0 };
  return state;
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
      possible: [],
      experience: 20,
    },
    description: '一只测试用的狼',
    behavior: 'aggressive',
    ...overrides,
  };
}

function makeCombatState(enemy?: Enemy): CombatState {
  return {
    active: true,
    combatType: enemy?.type ?? 'minor',
    enemy: enemy ?? makeTestEnemy(),
    turn: 0,
    playerAction: null,
    enemyAction: null,
    log: [],
    result: 'ongoing',
  };
}

// ==================== checkCombatEnd ====================

describe('checkCombatEnd', () => {
  it('should return ongoing when both sides have HP', () => {
    const state = makeTestState();
    state.combat = makeCombatState();
    expect(checkCombatEnd(state)).toBe('ongoing');
  });

  it('should return victory when enemy HP is 0', () => {
    const state = makeTestState();
    const enemy = makeTestEnemy({
      stats: { hp: 0, maxHp: 120, qi: 40, maxQi: 40, stamina: 80, maxStamina: 80, willpower: 15 },
    });
    state.combat = makeCombatState(enemy);
    expect(checkCombatEnd(state)).toBe('victory');
  });

  it('should return defeat when player HP is 0', () => {
    const state = makeTestState();
    state.player.stats.hp = 0;
    state.combat = makeCombatState();
    expect(checkCombatEnd(state)).toBe('defeat');
  });

  it('should return ongoing when combat is null', () => {
    const state = makeTestState();
    state.combat = null;
    expect(checkCombatEnd(state)).toBe('ongoing');
  });
});

// ==================== canFlee ====================

describe('canFlee', () => {
  it('should allow fleeing from minor enemy', () => {
    const cs = makeCombatState(makeTestEnemy({ type: 'minor' }));
    expect(canFlee(cs)).toBe(true);
  });

  it('should not allow fleeing from boss', () => {
    const cs = makeCombatState(makeTestEnemy({ type: 'boss' }));
    expect(canFlee(cs)).toBe(false);
  });
});

// ==================== getUsableCombatItems ====================

describe('getUsableCombatItems', () => {
  it('should return combat consumables from inventory', () => {
    const state = makeTestState();
    const healPill: GameItem = {
      id: 'heal_pill',
      name: '回春丹',
      type: 'consumable',
      subtype: 'pill',
      description: '恢复生命值',
      quantity: 3,
      effects: [{ attribute: 'hp', operation: 'add', value: 50, duration: 'instant' }],
      value: 10,
      stackable: true,
      maxStack: 10,
    };
    state.inventory.push(healPill);
    const items = getUsableCombatItems(state);
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe('heal_pill');
  });

  it('should not return non-consumable or non-combat items', () => {
    const state = makeTestState();
    const material: GameItem = {
      id: 'ore',
      name: '矿石',
      type: 'material',
      subtype: 'ore',
      description: '一块矿石',
      quantity: 1,
      effects: [],
      value: 5,
      stackable: false,
      maxStack: 1,
    };
    state.inventory.push(material);
    const items = getUsableCombatItems(state);
    expect(items).toHaveLength(0);
  });
});

// ==================== canPetAssist ====================

describe('canPetAssist', () => {
  it('should return false when no active pet', () => {
    const state = makeTestState();
    expect(canPetAssist(state)).toBe(false);
  });

  it('should return true when pet has attack power', () => {
    const state = makeTestState();
    state.activePetId = 'test_pet';
    state.pets.push({
      id: 'test_pet',
      name: '小白',
      species: '灵狐',
      level: 1,
      loyalty: 50,
      stats: { hp: 80, maxHp: 80, attack: 15, defense: 5, speed: 20 },
      skills: [],
      evolutionStage: 1,
      evolutionPath: 'normal',
      description: '一只小白狐',
    });
    expect(canPetAssist(state)).toBe(true);
  });
});

// ==================== decideEnemyAction ====================

describe('decideEnemyAction', () => {
  it('should prefer attack for aggressive behavior', () => {
    const enemy = makeTestEnemy({ behavior: 'aggressive' });
    const action = decideEnemyAction(enemy, () => 0.5);
    expect(action.type).toBe('attack');
  });

  it('should return defend for defensive behavior at low HP', () => {
    const enemy = makeTestEnemy({
      behavior: 'defensive',
      stats: { hp: 30, maxHp: 120, qi: 40, maxQi: 40, stamina: 80, maxStamina: 80, willpower: 15 },
    });
    const action = decideEnemyAction(enemy, () => 0.5);
    expect(action.type).toBe('defend');
  });

  it('should use skill for aggressive enemy when roll is low', () => {
    const enemy = makeTestEnemy({
      behavior: 'aggressive',
      skills: [
        {
          name: '咆哮',
          qiCost: 0,
          staminaCost: 10,
          damageMultiplier: 1.3,
          description: '发出一声咆哮',
        },
      ],
    });
    const action = decideEnemyAction(enemy, () => 0.1);
    expect(action.type).toBe('attack');
    if (action.type === 'attack') {
      expect(action.skillName).toBe('咆哮');
    }
  });

  it('should use strongest skill in berserk low HP', () => {
    const enemy = makeTestEnemy({
      behavior: 'berserk',
      stats: { hp: 30, maxHp: 120, qi: 40, maxQi: 40, stamina: 80, maxStamina: 80, willpower: 15 },
      skills: [
        { name: '弱击', qiCost: 0, staminaCost: 5, damageMultiplier: 1.2, description: '' },
        { name: '强击', qiCost: 0, staminaCost: 10, damageMultiplier: 1.8, description: '' },
      ],
    });
    const action2 = decideEnemyAction(enemy, () => 0.5);
    if (action2.type === 'attack') {
      expect(action2.skillName).toBe('强击');
    }
  });
});

// ==================== processRound ====================

describe('processRound', () => {
  const rng = () => 0.5;

  it('should return empty events when combat is null', () => {
    const state = makeTestState();
    state.combat = null;
    const result = processRound(state, { type: 'attack' }, rng);
    expect(result.combatEnded).toBe(true);
    expect(result.events).toHaveLength(0);
  });

  it('should process attack action and produce events', () => {
    const state = makeTestState();
    state.combat = makeCombatState();
    const result = processRound(state, { type: 'attack' }, rng);

    expect(result.events.length).toBeGreaterThan(0);

    // Should have an enemy stat_change
    const enemyHpChange = result.events.find(
      (e) => e.type === 'stat_change' && e.target === 'enemy'
    );
    expect(enemyHpChange).toBeDefined();

    // Should have a combat_turn event
    const turnEvent = result.events.find((e) => e.type === 'combat_turn');
    expect(turnEvent).toBeDefined();
  });

  it('should process defend action', () => {
    const state = makeTestState();
    state.combat = makeCombatState();
    const result = processRound(state, { type: 'defend' }, rng);

    // Player should take damage from enemy attack (even when defending)
    // Defending does not guarantee 0 damage, but should reduce it
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('should handle successful flee', () => {
    const state = makeTestState();
    state.player.realm = { name: '金丹', subStage: '前期', progressIndex: 8, cultivation: 0 };
    state.combat = makeCombatState(makeTestEnemy({ type: 'minor' }));

    const result = processRound(state, { type: 'flee' }, () => 0.01);
    expect(result.combatEnded).toBe(true);
    expect(result.endResult).toBe('fled');
  });

  it('should not allow flee from boss', () => {
    const state = makeTestState();
    state.combat = makeCombatState(makeTestEnemy({ type: 'boss' }));

    const result = processRound(state, { type: 'flee' }, rng);
    const turnEvent = result.events.find((e) => e.type === 'combat_turn');
    expect(turnEvent).toBeDefined();
    // Boss flee should result in enemy attack, not successful escape
    if (turnEvent?.type === 'combat_turn') {
      expect(turnEvent.narrative).toContain('无法逃跑');
    }
  });

  it('should handle item use', () => {
    const state = makeTestState();
    state.combat = makeCombatState();
    const healPill: GameItem = {
      id: 'heal_pill',
      name: '回春丹',
      type: 'consumable',
      subtype: 'pill',
      description: '恢复生命值',
      quantity: 3,
      effects: [{ attribute: 'hp', operation: 'add', value: 50, duration: 'instant' }],
      value: 10,
      stackable: true,
      maxStack: 10,
    };
    state.inventory.push(healPill);

    const result = processRound(state, { type: 'item', itemId: 'heal_pill' }, rng);
    expect(result.events.length).toBeGreaterThan(0);

    // Should have item_use event
    const itemUseEvent = result.events.find((e) => e.type === 'item_use');
    expect(itemUseEvent).toBeDefined();
  });

  it('should handle pet assist', () => {
    const state = makeTestState();
    state.combat = makeCombatState();
    state.activePetId = 'test_pet';
    state.pets.push({
      id: 'test_pet',
      name: '小白',
      species: '灵狐',
      level: 1,
      loyalty: 50,
      stats: { hp: 80, maxHp: 80, attack: 15, defense: 5, speed: 20 },
      skills: [],
      evolutionStage: 1,
      evolutionPath: 'normal',
      description: '一只小白狐',
    });

    const result = processRound(state, { type: 'pet_assist' }, rng);
    const enemyHpChange = result.events.find(
      (e) => e.type === 'stat_change' && e.target === 'enemy'
    );
    expect(enemyHpChange).toBeDefined();
  });

  it('should end combat with victory when enemy HP depleted', () => {
    const state = makeTestState();
    // Create a very weak enemy that will die in one hit
    const enemy = makeTestEnemy({
      stats: { hp: 5, maxHp: 120, qi: 40, maxQi: 40, stamina: 80, maxStamina: 80, willpower: 15 },
      defense: 0,
    });
    state.combat = makeCombatState(enemy);

    const result = processRound(state, { type: 'attack' }, () => 0.5);
    expect(result.combatEnded).toBe(true);
    expect(result.endResult).toBe('victory');
    expect(result.loot).toBeDefined();
    expect(result.loot!.length).toBeGreaterThan(0);
  });
});
