// ============================================================
// 装备服务 — 装备穿脱、耐久管理、境界校验
// 纯函数模块，返回 { events, error? }
// ============================================================

import * as Events from '../game/events';
import type { Equipment, EquipmentSlot, GameEvent, GameState } from '../game/types';
import { getEquipmentById } from './item-data';

// ==================== 装备操作 ====================

export interface EquipmentResult {
  events: GameEvent[];
  error?: string;
}

/** 获取背包中可装备的物品列表 */
export function getEquippableItems(
  state: GameState
): { slot: EquipmentSlot; itemId: string; name: string; grade: string }[] {
  return state.inventory
    .filter((i) => i.type === 'equipment' && i.slot)
    .map((i) => ({
      slot: i.slot!,
      itemId: i.id,
      name: i.name,
      grade: i.grade ?? '凡品',
    }));
}

/** 校验境界需求 */
export function canEquip(state: GameState, equipment: Equipment): boolean {
  return state.player.realm.progressIndex >= equipment.realmRequirement;
}

/** 根据 ID 或名称在背包中模糊查找装备物品 */
function findEquipmentInInventory(
  state: GameState,
  query: string
): { index: number; item: Equipment } | { error: string } {
  const lower = query.toLowerCase();
  // 先按 ID 精确匹配
  let idx = state.inventory.findIndex((i) => i.type === 'equipment' && i.slot && i.id === lower);
  if (idx < 0) {
    // 按名称模糊匹配
    idx = state.inventory.findIndex(
      (i) => i.type === 'equipment' && i.slot && i.name.toLowerCase().includes(lower)
    );
  }
  if (idx < 0) {
    return { error: `背包中没有找到名称为 "${query}" 的装备` };
  }

  const gameItem = state.inventory[idx]!;
  if (!gameItem.slot || !gameItem.equipStats) {
    return { error: `"${gameItem.name}" 不是可装备的物品` };
  }

  const equipment: Equipment = {
    id: gameItem.id,
    name: gameItem.name,
    type: 'equipment',
    slot: gameItem.slot,
    subtype: gameItem.subtype as Equipment['subtype'],
    grade: gameItem.grade ?? '凡品',
    stats: { ...gameItem.equipStats },
    realmRequirement: gameItem.realmRequirement ?? 0,
    durability: gameItem.durability ?? gameItem.maxDurability ?? 100,
    maxDurability: gameItem.maxDurability ?? 100,
    specialEffects: gameItem.specialEffects ? [...gameItem.specialEffects] : [],
    description: gameItem.description,
  };

  return { index: idx, item: equipment };
}

/**
 * 从背包装备物品到对应槽位
 */
export function equipItem(state: GameState, query: string): EquipmentResult {
  const found = findEquipmentInInventory(state, query);
  if ('error' in found) {
    return { events: [], error: found.error };
  }

  const equipment = found.item;

  // 境界校验
  if (!canEquip(state, equipment)) {
    return {
      events: [],
      error: `境界不足，无法装备 "${equipment.name}"（需要境界 progressIndex >= ${equipment.realmRequirement}）`,
    };
  }

  // 耐久检查
  if (equipment.durability <= 0) {
    return {
      events: [],
      error: `"${equipment.name}" 已损坏，请先修理后再装备`,
    };
  }

  return {
    events: [Events.equipmentChange(equipment.slot, equipment)],
  };
}

/**
 * 卸下指定槽位的装备
 */
export function unequipItem(state: GameState, slot: string): EquipmentResult {
  const validSlots: EquipmentSlot[] = ['weapon', 'armor', 'treasure', 'accessory'];
  if (!validSlots.includes(slot as EquipmentSlot)) {
    return {
      events: [],
      error: `无效的装备槽位 "${slot}"，可选：weapon/armor/treasure/accessory`,
    };
  }

  const eqSlot = slot as EquipmentSlot;
  const current = state.player.equipment[eqSlot];

  if (!current) {
    return { events: [], error: `${slotName(eqSlot)}槽位已经是空的` };
  }

  return {
    events: [Events.equipmentChange(eqSlot, null)],
  };
}

// ==================== 耐久管理 ====================

/** 减少装备耐久，返回新装备对象 */
export function degradeEquipment(equipment: Equipment, amount: number): Equipment {
  const newDurability = Math.max(0, equipment.durability - amount);
  return { ...equipment, durability: newDurability };
}

/** 判断是否可修理 */
export function canRepair(equipment: Equipment): boolean {
  return equipment.durability < equipment.maxDurability;
}

/** 修理装备，消耗灵石 */
export function repairEquipment(state: GameState, slot: string): EquipmentResult {
  const validSlots: EquipmentSlot[] = ['weapon', 'armor', 'treasure', 'accessory'];
  if (!validSlots.includes(slot as EquipmentSlot)) {
    return {
      events: [],
      error: `无效的装备槽位 "${slot}"，可选：weapon/armor/treasure/accessory`,
    };
  }

  const eqSlot = slot as EquipmentSlot;
  const current = state.player.equipment[eqSlot];

  if (!current) {
    return { events: [], error: `${slotName(eqSlot)}槽位没有装备` };
  }

  if (!canRepair(current)) {
    return { events: [], error: `"${current.name}" 耐久完好，无需修理` };
  }

  const missingDurability = current.maxDurability - current.durability;
  const repairCost = Math.max(1, Math.ceil(missingDurability * 0.5));

  if (state.player.spiritStones < repairCost) {
    return {
      events: [],
      error: `灵石不足，修理需要 ${repairCost} 灵石（当前：${state.player.spiritStones}）`,
    };
  }

  const repaired: Equipment = {
    ...current,
    durability: current.maxDurability,
  };

  return {
    events: [
      Events.spiritStonesChange(-repairCost, `修理 ${current.name}`),
      Events.equipmentChange(eqSlot, repaired),
      Events.narrative(
        'system',
        `消耗 ${repairCost} 灵石修理了 ${current.name}，耐久恢复至 ${current.maxDurability}/${current.maxDurability}。`
      ),
    ],
  };
}

// ==================== 辅助函数 ====================

const SLOT_NAMES: Record<EquipmentSlot, string> = {
  weapon: '武器',
  armor: '护甲',
  treasure: '法宝',
  accessory: '饰品',
};

function slotName(slot: EquipmentSlot): string {
  return SLOT_NAMES[slot];
}

/** 根据物品 ID/名称查找装备（同时查背包和已装备的） */
export function findEquipmentAnywhere(
  state: GameState,
  query: string
): { equipment: Equipment; source: 'inventory' | 'equipped'; slot?: EquipmentSlot } | undefined {
  const lower = query.toLowerCase();

  // 先查已装备的
  for (const [slot, eq] of Object.entries(state.player.equipment)) {
    if (eq && (eq.id === lower || eq.name.toLowerCase().includes(lower))) {
      return { equipment: { ...eq }, source: 'equipped', slot: slot as EquipmentSlot };
    }
  }

  // 再查背包
  const found = findEquipmentInInventory(state, query);
  if (!('error' in found)) {
    return { equipment: found.item, source: 'inventory' };
  }

  // 查物品数据库
  const fromDb = getEquipmentById(lower);
  if (fromDb) {
    return { equipment: fromDb, source: 'inventory' };
  }

  return undefined;
}
