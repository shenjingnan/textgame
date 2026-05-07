// ============================================================
// shop-service.test.ts — 交易服务测试
// ============================================================

import { describe, expect, it } from 'vitest';
import * as Events from '../../game/events';
import { applyEvents, createInitialState } from '../../game/state';
import type { GameState, NPC } from '../../game/types';
import {
  buyItem,
  calculateBuyPrice,
  calculateSellPrice,
  generateDefaultShopInventory,
  getMerchantNpcs,
  getShopItems,
  sellItem,
} from '../../inventory/shop-service';
import { CANGWU_MOUNTAINS } from '../../world/world-data';

// ==================== 测试辅助 ====================

function createTestState(overrides?: Partial<GameState>): GameState {
  const state = createInitialState('测试散修', 'normal', CANGWU_MOUNTAINS);
  if (overrides) {
    Object.assign(state, overrides);
  }
  return state;
}

// ==================== 测试 ====================

describe('shop-service', () => {
  describe('getMerchantNpcs', () => {
    it('苍梧城有商人老陈', () => {
      const state = createTestState();
      const merchants = getMerchantNpcs(state);
      expect(merchants.length).toBeGreaterThanOrEqual(1);
      expect(merchants.some((m) => m.id === 'old_chen')).toBe(true);
    });

    it('非城市区域可能没有商人', () => {
      const state = createTestState();
      // 移动到密林（野外，无商人）
      const s = applyEvents(state, [Events.locationChange('cangwu_city', 'outer_forest')]);
      const merchants = getMerchantNpcs(s);
      expect(merchants.every((m) => m.role === 'merchant')).toBe(true);
    });
  });

  describe('getShopItems', () => {
    it('返回商人商品列表', () => {
      const state = createTestState();
      const items = getShopItems(state, 'old_chen');
      expect(items.length).toBeGreaterThan(0);
    });

    it('对非商人 NPC 返回空数组', () => {
      const state = createTestState();
      const items = getShopItems(state, 'zhao_guard');
      expect(items).toEqual([]);
    });
  });

  describe('calculateBuyPrice / calculateSellPrice', () => {
    const pill = {
      id: 'test_pill',
      name: '测试丹药',
      type: 'consumable' as const,
      subtype: '回复',
      description: '',
      quantity: 1,
      effects: [],
      value: 100,
      stackable: true,
      maxStack: 20,
    };

    it('friendly 价格最优惠', () => {
      expect(calculateBuyPrice(pill, 'friendly')).toBe(100);
      expect(calculateSellPrice(pill, 'friendly')).toBe(70);
    });

    it('neutral 价格适中', () => {
      expect(calculateBuyPrice(pill, 'neutral')).toBe(120);
      expect(calculateSellPrice(pill, 'neutral')).toBe(50);
    });

    it('hostile 价格最差', () => {
      expect(calculateBuyPrice(pill, 'hostile')).toBe(150);
      expect(calculateSellPrice(pill, 'hostile')).toBe(30);
    });

    it('价格不会小于 1', () => {
      const cheapItem = { ...pill, value: 1 };
      expect(calculateBuyPrice(cheapItem, 'friendly')).toBeGreaterThanOrEqual(1);
      expect(calculateSellPrice(cheapItem, 'neutral')).toBeGreaterThanOrEqual(1);
    });
  });

  describe('buyItem', () => {
    it('灵石足够时成功购买', () => {
      const state = createTestState();
      state.player.spiritStones = 200;

      const result = buyItem(state, 'old_chen', 'revival_pill', 3);
      expect(result.error).toBeUndefined();
      expect(result.events.length).toBeGreaterThan(0);

      const next = applyEvents(state, result.events);
      // 灵石减少
      const price = calculateBuyPrice(
        { value: 10, maxStack: 20 } as GameState['inventory'][0],
        'friendly'
      );
      expect(next.player.spiritStones).toBe(200 - price * 3);
      // 物品在背包中
      expect(next.inventory.find((i) => i.id === 'revival_pill')).toBeDefined();
    });

    it('灵石不足时拒绝购买', () => {
      const state = createTestState();
      state.player.spiritStones = 5;

      const result = buyItem(state, 'old_chen', 'revival_pill', 10);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('灵石不足');
    });

    it('hostile 商人拒绝交易', () => {
      const state = createTestState();
      state.player.spiritStones = 200;
      // 改 old_chen 的 attitude 为 hostile
      const location = state.world.regions
        .flatMap((r) => r.locations)
        .find((l) => l.id === 'cangwu_city');
      const oldChen = location!.npcs.find((n) => n.id === 'old_chen')!;
      const originalAttitude = oldChen.attitude;
      oldChen.attitude = 'hostile';

      try {
        const result = buyItem(state, 'old_chen', 'revival_pill', 1);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('敌意');
      } finally {
        // 恢复原始 attitude，避免污染后续测试
        oldChen.attitude = originalAttitude;
      }
    });

    it('非商人 NPC 不能购买', () => {
      const state = createTestState();
      const result = buyItem(state, 'zhao_guard', 'revival_pill', 1);
      expect(result.error).toBeDefined();
    });

    it('不存在的商品返回错误', () => {
      const state = createTestState();
      state.player.spiritStones = 200;

      const result = buyItem(state, 'old_chen', 'nonexistent_item', 1);
      expect(result.error).toBeDefined();
    });

    it('购买后生成交易 narrative', () => {
      const state = createTestState();
      state.player.spiritStones = 200;

      const result = buyItem(state, 'old_chen', 'revival_pill', 1);
      const narrative = result.events.find((e) => e.type === 'narrative');
      expect(narrative).toBeDefined();
    });
  });

  describe('sellItem', () => {
    it('出售成功获得灵石', () => {
      const state = createTestState();
      state.player.spiritStones = 50;
      // 给玩家一个物品
      const s = applyEvents(state, [
        Events.itemAdd({
          id: 'sell_test',
          name: '出售测试',
          type: 'material',
          subtype: '测试',
          description: '',
          quantity: 5,
          effects: [],
          value: 30,
          stackable: true,
          maxStack: 20,
        }),
      ]);

      const result = sellItem(s, 'old_chen', 'sell_test', 2);
      expect(result.error).toBeUndefined();

      const next = applyEvents(s, result.events);
      expect(next.player.spiritStones).toBeGreaterThan(50);
      // 数量减少
      const item = next.inventory.find((i) => i.id === 'sell_test');
      expect(item!.quantity).toBe(3);
    });

    it('背包中没有物品时返回错误', () => {
      const state = createTestState();
      const result = sellItem(state, 'old_chen', 'nonexistent', 1);
      expect(result.error).toBeDefined();
    });

    it('超出数量时返回错误', () => {
      const state = createTestState();
      const s = applyEvents(state, [
        Events.itemAdd({
          id: 'sell_test',
          name: '出售测试',
          type: 'material',
          subtype: '测试',
          description: '',
          quantity: 2,
          effects: [],
          value: 10,
          stackable: true,
          maxStack: 50,
        }),
      ]);

      const result = sellItem(s, 'old_chen', 'sell_test', 10);
      expect(result.error).toBeDefined();
    });

    it('非商人 NPC 不能出售', () => {
      const state = createTestState();
      const s = applyEvents(state, [
        Events.itemAdd({
          id: 'sell_test',
          name: '出售测试',
          type: 'material',
          subtype: '测试',
          description: '',
          quantity: 5,
          effects: [],
          value: 10,
          stackable: true,
          maxStack: 50,
        }),
      ]);
      const result = sellItem(s, 'zhao_guard', 'sell_test', 1);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateDefaultShopInventory', () => {
    it('为 NPC 生成默认商品', () => {
      const npc: NPC = {
        id: 'old_chen',
        name: '老陈',
        realm: { name: '筑基', subStage: '中期', progressIndex: 5, cultivation: 50 },
        faction: '散修联盟',
        attitude: 'friendly',
        role: 'merchant',
        personality: '和善',
        inventory: [],
        description: '',
      };
      const items = generateDefaultShopInventory(npc);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
