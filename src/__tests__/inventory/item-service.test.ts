// ============================================================
// item-service.test.ts — 物品使用服务测试
// ============================================================

import { describe, expect, it } from 'vitest';
import * as Events from '../../game/events';
import { applyEvents, createInitialState } from '../../game/state';
import type { GameState } from '../../game/types';
import { clearCombatBuffs, useItem } from '../../inventory/item-service';
import { CANGWU_MOUNTAINS } from '../../world/world-data';

// ==================== 测试辅助 ====================

function createTestState(overrides?: Partial<GameState>): GameState {
  const state = createInitialState('测试散修', 'normal', CANGWU_MOUNTAINS);
  if (overrides) {
    Object.assign(state, overrides);
  }
  return state;
}

function addItemToInventory(
  state: GameState,
  id: string,
  name: string,
  effects: GameState['inventory'][0]['effects'],
  overrides: Partial<GameState['inventory'][0]> = {}
): GameState {
  return applyEvents(state, [
    Events.itemAdd({
      id,
      name,
      type: 'consumable',
      subtype: '回复',
      description: '测试物品',
      quantity: 3,
      effects,
      value: 10,
      stackable: true,
      maxStack: 20,
      ...overrides,
    }),
  ]);
}

// ==================== 测试 ====================

describe('item-service', () => {
  describe('useItem', () => {
    it('使用回血丹药正确回复 HP', () => {
      const state = createTestState();
      state.player.stats.hp = 50;
      state.player.stats.maxHp = 100;

      const s = addItemToInventory(state, 'pill_hp', '回血丹', [
        { attribute: 'hp', operation: 'add', value: 30, duration: 'instant' },
      ]);

      const result = useItem(s, 'pill_hp');
      expect(result.error).toBeUndefined();
      expect(result.events.length).toBeGreaterThanOrEqual(2); // item_use + stat_change + narrative

      const next = applyEvents(s, result.events);
      expect(next.player.stats.hp).toBe(80); // 50 + 30
      // 数量减少
      const item = next.inventory.find((i) => i.id === 'pill_hp');
      expect(item!.quantity).toBe(2);
    });

    it('使用回蓝丹药正确回复 Qi', () => {
      const state = createTestState();
      state.player.stats.qi = 20;
      state.player.stats.maxQi = 100;

      const s = addItemToInventory(state, 'pill_qi', '聚灵丹', [
        { attribute: 'qi', operation: 'add', value: 30, duration: 'instant' },
      ]);

      const result = useItem(s, 'pill_qi');
      expect(result.error).toBeUndefined();

      const next = applyEvents(s, result.events);
      expect(next.player.stats.qi).toBe(50);
    });

    it('永久属性丹药正确增加 maxHp', () => {
      const state = createTestState();
      state.player.stats.maxHp = 100;
      state.player.stats.hp = 80;

      const s = addItemToInventory(state, 'pill_perma', '淬体丹', [
        { attribute: 'maxHp', operation: 'add', value: 10, duration: 'permanent' },
      ]);

      const result = useItem(s, 'pill_perma');
      expect(result.error).toBeUndefined();

      const next = applyEvents(s, result.events);
      expect(next.player.stats.maxHp).toBe(110);
      // permanent 效果也回血
      expect(next.player.stats.hp).toBe(90);
    });

    it('数量为 0 时拒绝使用', () => {
      const state = createTestState();
      const s = addItemToInventory(state, 'pill_hp', '回血丹', [
        { attribute: 'hp', operation: 'add', value: 30, duration: 'instant' },
      ]);
      // 用掉所有
      let current = s;
      for (let i = 0; i < 3; i++) {
        const r = useItem(current, 'pill_hp');
        if (r.error) break;
        current = applyEvents(current, r.events);
      }

      const result = useItem(current, 'pill_hp');
      expect(result.error).toBeDefined();
    });

    it('非消耗品无法使用', () => {
      const state = createTestState();
      const s = applyEvents(state, [
        Events.itemAdd({
          id: 'herb',
          name: '灵草',
          type: 'material',
          subtype: '灵草',
          description: '材料',
          quantity: 5,
          effects: [],
          value: 5,
          stackable: true,
          maxStack: 50,
        }),
      ]);

      const result = useItem(s, 'herb');
      expect(result.error).toBeDefined();
    });

    it('丹道奇才天赋加成', () => {
      const state = createTestState();
      state.player.flags['item_effect_bonus'] = 0.5;
      state.player.stats.hp = 50;
      state.player.stats.maxHp = 100;

      const s = addItemToInventory(state, 'pill_hp', '回血丹', [
        { attribute: 'hp', operation: 'add', value: 30, duration: 'instant' },
      ]);

      const result = useItem(s, 'pill_hp');
      const next = applyEvents(s, result.events);
      // 30 * (1 + 0.5) = 45, 50 + 45 = 95
      expect(next.player.stats.hp).toBe(95);
    });

    it('模糊匹配物品名称', () => {
      const state = createTestState();
      state.player.stats.hp = 50;
      state.player.stats.maxHp = 100;

      const s = addItemToInventory(state, 'pill_hp', '回血丹', [
        { attribute: 'hp', operation: 'add', value: 30, duration: 'instant' },
      ]);

      const result = useItem(s, '回血');
      expect(result.error).toBeUndefined();

      const next = applyEvents(s, result.events);
      expect(next.player.stats.hp).toBe(80);
    });

    it('物品使用生成叙事事件', () => {
      const state = createTestState();
      state.player.stats.hp = 50;
      state.player.stats.maxHp = 100;

      const s = addItemToInventory(state, 'pill_hp', '回血丹', [
        { attribute: 'hp', operation: 'add', value: 30, duration: 'instant' },
      ]);

      const result = useItem(s, 'pill_hp');
      const narrative = result.events.find((e) => e.type === 'narrative');
      expect(narrative).toBeDefined();
    });
  });

  describe('clearCombatBuffs', () => {
    it('清除所有战斗临时 buff', () => {
      const state = createTestState();
      state.player.flags['combat_buff_attack'] = 1.5;
      state.player.flags['combat_buff_defense'] = 1.3;
      state.player.flags['permanent_flag'] = 'keep';

      const events = clearCombatBuffs(state);
      const next = applyEvents(state, events);

      expect(next.player.flags['combat_buff_attack']).toBe(0);
      expect(next.player.flags['combat_buff_defense']).toBe(0);
      expect(next.player.flags['permanent_flag']).toBe('keep');
    });
  });
});
