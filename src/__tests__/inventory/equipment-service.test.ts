// ============================================================
// equipment-service.test.ts — 装备服务测试
// ============================================================

import { describe, expect, it } from 'vitest';
import * as Events from '../../game/events';
import { applyEvents, createInitialState } from '../../game/state';
import type { Equipment, GameItem, GameState } from '../../game/types';
import {
  canEquip,
  canRepair,
  degradeEquipment,
  equipItem,
  findEquipmentAnywhere,
  getEquippableItems,
  repairEquipment,
  unequipItem,
} from '../../inventory/equipment-service';
import { CANGWU_MOUNTAINS } from '../../world/world-data';

// ==================== 测试辅助 ====================

function createTestState(overrides?: Partial<GameState>): GameState {
  const state = createInitialState('测试散修', 'normal', CANGWU_MOUNTAINS);
  if (overrides) {
    Object.assign(state, overrides);
  }
  return state;
}

function createEquipmentInInventory(state: GameState, eq: Equipment): GameState {
  const gameItem: GameItem = {
    id: eq.id,
    name: eq.name,
    type: 'equipment',
    subtype: eq.subtype,
    description: eq.description,
    quantity: 1,
    effects: [],
    value: 50,
    stackable: false,
    maxStack: 1,
    slot: eq.slot,
    grade: eq.grade,
    realmRequirement: eq.realmRequirement,
    durability: eq.durability,
    maxDurability: eq.maxDurability,
    equipStats: { ...eq.stats },
    specialEffects: [...eq.specialEffects],
  };
  return applyEvents(state, [Events.itemAdd(gameItem)]);
}

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'test_sword',
    name: '测试铁剑',
    type: 'equipment',
    slot: 'weapon',
    subtype: '飞剑',
    grade: '凡品',
    stats: { maxHp: 10 },
    realmRequirement: 0,
    durability: 100,
    maxDurability: 100,
    specialEffects: [],
    description: '测试用剑',
    ...overrides,
  };
}

// ==================== 测试 ====================

describe('equipment-service', () => {
  describe('getEquippableItems', () => {
    it('背包为空时返回空列表', () => {
      const state = createTestState();
      const items = getEquippableItems(state);
      expect(items).toEqual([]);
    });

    it('返回背包中的可装备物品', () => {
      const state = createTestState();
      const eq = makeEquipment();
      const s = createEquipmentInInventory(state, eq);
      const items = getEquippableItems(s);
      expect(items.length).toBe(1);
      expect(items[0]!.slot).toBe('weapon');
      expect(items[0]!.name).toBe('测试铁剑');
    });

    it('不包含非装备物品', () => {
      const state = createTestState();
      const s = applyEvents(state, [
        Events.itemAdd({
          id: 'pill_01',
          name: '回血丹',
          type: 'consumable',
          subtype: '回复',
          description: '',
          quantity: 1,
          effects: [],
          value: 10,
          stackable: true,
          maxStack: 20,
        }),
      ]);
      expect(getEquippableItems(s)).toEqual([]);
    });
  });

  describe('canEquip', () => {
    it('境界足够时可以装备', () => {
      const state = createTestState();
      const eq = makeEquipment({ realmRequirement: 0 });
      expect(canEquip(state, eq)).toBe(true);
    });

    it('境界不足时不能装备', () => {
      const state = createTestState();
      // 初始 progressIndex 为 0
      const eq = makeEquipment({ realmRequirement: 8 }); // 金丹期
      expect(canEquip(state, eq)).toBe(false);
    });
  });

  describe('equipItem', () => {
    it('正确装备到空槽位', () => {
      const state = createTestState();
      const eq = makeEquipment();
      const s = createEquipmentInInventory(state, eq);

      const result = equipItem(s, 'test_sword');
      expect(result.error).toBeUndefined();
      expect(result.events.length).toBeGreaterThan(0);

      // 应用事件后验证装备已装上
      const next = applyEvents(s, result.events);
      expect(next.player.equipment.weapon).not.toBeNull();
      expect(next.player.equipment.weapon!.name).toBe('测试铁剑');
      // 背包中的装备物品已被移除
      expect(next.inventory.find((i) => i.id === 'test_sword')).toBeUndefined();
    });

    it('按名称模糊匹配', () => {
      const state = createTestState();
      const eq = makeEquipment();
      const s = createEquipmentInInventory(state, eq);

      const result = equipItem(s, '铁剑');
      expect(result.error).toBeUndefined();
    });

    it('境界不足时拒绝', () => {
      const state = createTestState();
      const eq = makeEquipment({ realmRequirement: 10, id: 'high_level_sword' });
      const s = createEquipmentInInventory(state, eq);

      const result = equipItem(s, 'high_level_sword');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('境界不足');
    });

    it('物品不存在时返回错误', () => {
      const state = createTestState();
      const result = equipItem(state, 'nonexistent');
      expect(result.error).toBeDefined();
    });

    it('替换已有装备（旧装备回背包）', () => {
      const state = createTestState();
      const oldEq = makeEquipment({ id: 'old_sword', name: '旧剑' });
      const newEq = makeEquipment({ id: 'new_sword', name: '新剑', stats: { maxHp: 50 } });

      let s = createEquipmentInInventory(state, oldEq);
      s = applyEvents(s, equipItem(s, 'old_sword').events);
      expect(s.player.equipment.weapon!.id).toBe('old_sword');

      // 放入新装备
      s = createEquipmentInInventory(s, newEq);
      const result = equipItem(s, 'new_sword');
      expect(result.error).toBeUndefined();

      const next = applyEvents(s, result.events);
      // 新装备已装上
      expect(next.player.equipment.weapon!.id).toBe('new_sword');
      // 旧装备回背包
      expect(next.inventory.find((i) => i.id === 'old_sword')).toBeDefined();
    });

    it('损坏装备无法装备', () => {
      const state = createTestState();
      const eq = makeEquipment({ durability: 0 });
      const s = createEquipmentInInventory(state, eq);

      const result = equipItem(s, 'test_sword');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('已损坏');
    });
  });

  describe('unequipItem', () => {
    it('卸下装备后回到背包', () => {
      const state = createTestState();
      const eq = makeEquipment();
      let s = createEquipmentInInventory(state, eq);
      s = applyEvents(s, equipItem(s, 'test_sword').events);
      expect(s.player.equipment.weapon).not.toBeNull();

      const result = unequipItem(s, 'weapon');
      expect(result.error).toBeUndefined();

      const next = applyEvents(s, result.events);
      expect(next.player.equipment.weapon).toBeNull();
      expect(next.inventory.find((i) => i.id === 'test_sword')).toBeDefined();
    });

    it('空槽位时返回错误', () => {
      const state = createTestState();
      const result = unequipItem(state, 'weapon');
      expect(result.error).toBeDefined();
    });

    it('无效槽位时返回错误', () => {
      const state = createTestState();
      const result = unequipItem(state, 'invalid');
      expect(result.error).toBeDefined();
    });
  });

  describe('耐久系统', () => {
    it('degradeEquipment 正确减少耐久', () => {
      const eq = makeEquipment({ durability: 100, maxDurability: 100 });
      const degraded = degradeEquipment(eq, 10);
      expect(degraded.durability).toBe(90);
      expect(degraded.maxDurability).toBe(100);
    });

    it('耐久不能低于 0', () => {
      const eq = makeEquipment({ durability: 5, maxDurability: 100 });
      const degraded = degradeEquipment(eq, 10);
      expect(degraded.durability).toBe(0);
    });

    it('canRepair 判断正确', () => {
      const eq = makeEquipment({ durability: 50, maxDurability: 100 });
      expect(canRepair(eq)).toBe(true);
    });

    it('满耐久不需要修理', () => {
      const eq = makeEquipment({ durability: 100, maxDurability: 100 });
      expect(canRepair(eq)).toBe(false);
    });

    it('修理装备消耗灵石并恢复耐久', () => {
      const state = createTestState();
      const eq = makeEquipment({ durability: 50, maxDurability: 100 });
      let s = createEquipmentInInventory(state, eq);
      s = applyEvents(s, equipItem(s, 'test_sword').events);
      // 手动设置降低耐久
      s.player.equipment.weapon = { ...s.player.equipment.weapon!, durability: 50 };
      s.player.spiritStones = 100;

      const result = repairEquipment(s, 'weapon');
      expect(result.error).toBeUndefined();
      expect(result.events.length).toBeGreaterThan(0);

      const next = applyEvents(s, result.events);
      expect(next.player.equipment.weapon!.durability).toBe(100);
      // 灵石减少了
      expect(next.player.spiritStones).toBeLessThan(100);
    });

    it('灵石不足时修理失败', () => {
      const state = createTestState();
      const eq = makeEquipment({ durability: 50, maxDurability: 100 });
      let s = createEquipmentInInventory(state, eq);
      s = applyEvents(s, equipItem(s, 'test_sword').events);
      s.player.equipment.weapon = { ...s.player.equipment.weapon!, durability: 50 };
      s.player.spiritStones = 0;

      const result = repairEquipment(s, 'weapon');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('灵石不足');
    });
  });

  describe('findEquipmentAnywhere', () => {
    it('查找已装备的物品', () => {
      const state = createTestState();
      const eq = makeEquipment();
      let s = createEquipmentInInventory(state, eq);
      s = applyEvents(s, equipItem(s, 'test_sword').events);

      const result = findEquipmentAnywhere(s, 'test_sword');
      expect(result).toBeDefined();
      expect(result!.source).toBe('equipped');
      expect(result!.slot).toBe('weapon');
    });

    it('查找背包中的装备', () => {
      const state = createTestState();
      const eq = makeEquipment();
      const s = createEquipmentInInventory(state, eq);

      const result = findEquipmentAnywhere(s, 'test_sword');
      expect(result).toBeDefined();
      expect(result!.source).toBe('inventory');
    });

    it('查找不存在的装备返回 undefined', () => {
      const state = createTestState();
      expect(findEquipmentAnywhere(state, 'nothing')).toBeUndefined();
    });
  });
});
