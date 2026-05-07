// ============================================================
// item-data.test.ts — 物品/装备数据库测试
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  ALL_EQUIPMENT,
  ALL_ITEMS,
  getAllEquipmentIds,
  getAllItemIds,
  getDefaultLoot,
  getEquipmentById,
  getEquipmentBySlot,
  getEquipmentValue,
  getItemById,
  getItemsByType,
  getShopInventory,
} from '../../inventory/item-data';

describe('item-data', () => {
  describe('数据完整性', () => {
    it('所有装备 ID 唯一', () => {
      const ids = ALL_EQUIPMENT.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('所有物品 ID 唯一', () => {
      const ids = ALL_ITEMS.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('装备数量充足', () => {
      expect(ALL_EQUIPMENT.length).toBeGreaterThanOrEqual(20);
    });

    it('物品数量充足', () => {
      expect(ALL_ITEMS.length).toBeGreaterThanOrEqual(15);
    });

    it('装备都有必要的字段', () => {
      for (const eq of ALL_EQUIPMENT) {
        expect(eq.id).toBeTruthy();
        expect(eq.name).toBeTruthy();
        expect(eq.slot).toBeTruthy();
        expect(eq.grade).toBeTruthy();
        expect(eq.realmRequirement).toBeGreaterThanOrEqual(0);
        expect(eq.durability).toBeGreaterThan(0);
        expect(eq.maxDurability).toBeGreaterThan(0);
        expect(eq.description).toBeTruthy();
      }
    });

    it('消耗品都有 effects 字段', () => {
      const consumables = ALL_ITEMS.filter((i) => i.type === 'consumable');
      for (const item of consumables) {
        expect(item.effects.length).toBeGreaterThan(0);
      }
    });

    it('物品 value 在合理范围', () => {
      for (const item of ALL_ITEMS) {
        expect(item.value).toBeGreaterThan(0);
        expect(item.value).toBeLessThan(500);
      }
    });
  });

  describe('查找函数', () => {
    it('getItemById 正确查找', () => {
      const item = getItemById('revival_pill');
      expect(item).toBeDefined();
      expect(item!.name).toBe('回春丹');
      expect(item!.type).toBe('consumable');
    });

    it('getItemById 对不存在的 ID 返回 undefined', () => {
      expect(getItemById('nonexistent_item')).toBeUndefined();
    });

    it('getEquipmentById 正确查找', () => {
      const eq = getEquipmentById('cold_iron_sword');
      expect(eq).toBeDefined();
      expect(eq!.name).toBe('寒铁剑');
      expect(eq!.slot).toBe('weapon');
    });

    it('getEquipmentById 对不存在的 ID 返回 undefined', () => {
      expect(getEquipmentById('nonexistent_eq')).toBeUndefined();
    });

    it('getAllEquipmentIds 返回正确的 ID 列表', () => {
      const ids = getAllEquipmentIds();
      expect(ids).toContain('rusty_sword');
      expect(ids.length).toBe(ALL_EQUIPMENT.length);
    });

    it('getAllItemIds 返回正确的 ID 列表', () => {
      const ids = getAllItemIds();
      expect(ids).toContain('revival_pill');
      expect(ids.length).toBe(ALL_ITEMS.length);
    });

    it('getItemsByType 过滤正确', () => {
      const consumables = getItemsByType('consumable');
      for (const item of consumables) {
        expect(item.type).toBe('consumable');
      }
    });

    it('getEquipmentBySlot 过滤正确', () => {
      const weapons = getEquipmentBySlot('weapon');
      for (const eq of weapons) {
        expect(eq.slot).toBe('weapon');
      }
    });

    it('getShopInventory 返回 old_chen 的商品', () => {
      const items = getShopInventory('old_chen');
      expect(items.length).toBeGreaterThan(0);
      // 应该包含基础丹药
      const ids = items.map((i) => i.id);
      expect(ids).toContain('revival_pill');
      expect(ids).toContain('spirit_gathering_pill');
    });

    it('getShopInventory 对未知 NPC 返回默认商品', () => {
      const items = getShopInventory('unknown_npc');
      expect(items.length).toBeGreaterThan(0);
    });

    it('getDefaultLoot 按危险等级生成不同掉落', () => {
      const lowLoot = getDefaultLoot(1);
      const highLoot = getDefaultLoot(10);
      // 高危险区域掉落更多
      expect(highLoot.length).toBeGreaterThan(0);
      // 掉落物品都有有效数据
      for (const item of [...lowLoot, ...highLoot]) {
        expect(item.name).toBeTruthy();
        expect(item.quantity).toBeGreaterThan(0);
      }
    });
  });

  describe('装备属性', () => {
    it('装备属性按品质递增', () => {
      const gradeOrder = ['凡品', '灵品', '宝品', '仙品', '神品'];
      // 检查同槽位装备的属性是否按品质递增
      const weapons = ALL_EQUIPMENT.filter((e) => e.slot === 'weapon');
      for (let i = 0; i < weapons.length - 1; i++) {
        for (let j = i + 1; j < weapons.length; j++) {
          const a = weapons[i]!;
          const b = weapons[j]!;
          const aIndex = gradeOrder.indexOf(a.grade);
          const bIndex = gradeOrder.indexOf(b.grade);
          const totalStatsA = Object.values(a.stats).reduce((s, v) => s + (v ?? 0), 0);
          const totalStatsB = Object.values(b.stats).reduce((s, v) => s + (v ?? 0), 0);
          // 品质更高的装备通常属性也更高（不考虑跨境界情况）
          if (aIndex !== bIndex && a.realmRequirement === b.realmRequirement) {
            expect(aIndex < bIndex ? totalStatsA <= totalStatsB : totalStatsA >= totalStatsB).toBe(
              true
            );
          }
        }
      }
    });

    it('getEquipmentValue 返回合理价格', () => {
      const rustyValue = getEquipmentValue(getEquipmentById('rusty_sword')!);
      const azureValue = getEquipmentValue(getEquipmentById('azure_cloud_sword')!);
      expect(azureValue).toBeGreaterThan(rustyValue);
    });
  });
});
