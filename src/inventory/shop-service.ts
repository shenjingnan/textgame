// ============================================================
// 商店服务 — 买卖逻辑、价格计算、默认库存生成
// 纯函数模块，返回 { events, error? }
// ============================================================

import * as Events from '../game/events';
import { getCurrentLocation } from '../game/state';
import type { GameEvent, GameItem, GameState, NPC, NPCAttitude } from '../game/types';
import { getItemById, getShopInventory } from './item-data';

// ==================== 类型定义 ====================

export interface TradeResult {
  events: GameEvent[];
  error?: string;
}

// ==================== 商人查找 ====================

/** 获取当前位置所有商人 NPC */
export function getMerchantNpcs(state: GameState): NPC[] {
  const location = getCurrentLocation(state);
  if (!location) return [];
  return location.npcs.filter((npc) => npc.role === 'merchant');
}

/** 获取指定商人的商品列表 */
export function getShopItems(state: GameState, npcId: string): GameItem[] {
  const location = getCurrentLocation(state);
  if (!location) return [];

  const npc = location.npcs.find((n) => n.id === npcId);
  if (!npc || npc.role !== 'merchant') return [];

  // 如果 NPC inventory 有手动配置的数据，使用它
  if (npc.inventory.length > 0) {
    return npc.inventory.map((i) => ({ ...i }));
  }

  // 否则从默认商品库生成
  return getShopInventory(npcId);
}

// ==================== 买卖操作 ====================

/**
 * 玩家从商人处购买物品
 */
export function buyItem(
  state: GameState,
  npcId: string,
  itemId: string,
  quantity: number = 1
): TradeResult {
  const location = getCurrentLocation(state);
  if (!location) {
    return { events: [], error: '当前位置信息丢失' };
  }

  const npc = location.npcs.find((n) => n.id === npcId);
  if (!npc) {
    return { events: [], error: `找不到商人 "${npcId}"` };
  }
  if (npc.role !== 'merchant') {
    return { events: [], error: `"${npc.name}" 不是商人，无法交易` };
  }
  if (npc.attitude === 'hostile') {
    return { events: [], error: `"${npc.name}" 对你充满敌意，拒绝交易` };
  }

  const shopItems = getShopItems(state, npcId);
  // 在商店中查找物品
  const lower = itemId.toLowerCase();
  let shopItem = shopItems.find((i) => i.id === lower);
  if (!shopItem) {
    shopItem = shopItems.find((i) => i.name.toLowerCase().includes(lower));
  }
  if (!shopItem) {
    // 也尝试从数据库查找
    const fromDb = getItemById(lower);
    if (fromDb) {
      shopItem = fromDb;
    } else {
      return { events: [], error: `"${npc.name}" 不出售 "${itemId}"` };
    }
  }

  if (quantity < 1) quantity = 1;
  if (shopItem.maxStack && quantity > shopItem.maxStack) {
    return {
      events: [],
      error: `最多购买 ${shopItem.maxStack} 个 "${shopItem.name}"`,
    };
  }

  const unitPrice = calculateBuyPrice(shopItem, npc.attitude);
  const totalPrice = unitPrice * quantity;

  if (state.player.spiritStones < totalPrice) {
    return {
      events: [],
      error: `灵石不足，需要 ${totalPrice}（当前：${state.player.spiritStones}）`,
    };
  }

  const bought: GameItem = {
    ...shopItem,
    effects: shopItem.effects.map((e) => ({ ...e })),
    quantity,
  };

  return {
    events: [
      Events.trade([bought], [], -totalPrice),
      Events.narrative(
        'system',
        `从 ${npc.name} 处购买了 ${shopItem.name} x${quantity}，花费 ${totalPrice} 灵石。`
      ),
    ],
  };
}

/**
 * 玩家向商人出售物品
 */
export function sellItem(
  state: GameState,
  npcId: string,
  itemId: string,
  quantity: number = 1
): TradeResult {
  const location = getCurrentLocation(state);
  if (!location) {
    return { events: [], error: '当前位置信息丢失' };
  }

  const npc = location.npcs.find((n) => n.id === npcId);
  if (!npc) {
    return { events: [], error: `找不到商人 "${npcId}"` };
  }
  if (npc.role !== 'merchant') {
    return { events: [], error: `"${npc.name}" 不是商人，无法交易` };
  }
  if (npc.attitude === 'hostile') {
    return { events: [], error: `"${npc.name}" 对你充满敌意，拒绝交易` };
  }

  // 在玩家背包中查找
  const lower = itemId.toLowerCase();
  let idx = state.inventory.findIndex((i) => i.id === lower);
  if (idx < 0) {
    idx = state.inventory.findIndex((i) => i.name.toLowerCase().includes(lower));
  }
  if (idx < 0) {
    return { events: [], error: `背包中没有 "${itemId}"` };
  }

  const invItem = state.inventory[idx]!;

  // 装备不能出售
  if (invItem.type === 'equipment') {
    // 检查是否已装备
    for (const [, eq] of Object.entries(state.player.equipment)) {
      if (eq && eq.id === invItem.id) {
        return {
          events: [],
          error: `"${invItem.name}" 正在装备中，请先卸下后再出售`,
        };
      }
    }
  }

  if (quantity < 1 || quantity > invItem.quantity) {
    return {
      events: [],
      error: `背包中 "${invItem.name}" 只有 ${invItem.quantity} 个`,
    };
  }

  const unitPrice = calculateSellPrice(invItem, npc.attitude);
  const totalPrice = unitPrice * quantity;

  const sold: GameItem = {
    ...invItem,
    effects: invItem.effects.map((e) => ({ ...e })),
    quantity,
  };

  return {
    events: [
      Events.trade([], [sold], totalPrice),
      Events.narrative(
        'system',
        `向 ${npc.name} 出售了 ${invItem.name} x${quantity}，获得 ${totalPrice} 灵石。`
      ),
    ],
  };
}

// ==================== 价格计算 ====================

const ATTITUDE_MULTIPLIERS: Record<NPCAttitude, { buy: number; sell: number }> = {
  friendly: { buy: 1.0, sell: 0.7 },
  neutral: { buy: 1.2, sell: 0.5 },
  hostile: { buy: 1.5, sell: 0.3 },
};

/** 计算购买价格（基础价 × buyPremium） */
export function calculateBuyPrice(item: GameItem, attitude: NPCAttitude): number {
  const base = item.value;
  const multiplier = ATTITUDE_MULTIPLIERS[attitude].buy;
  return Math.max(1, Math.round(base * multiplier));
}

/** 计算出售价格（基础价 × sellDiscount） */
export function calculateSellPrice(item: GameItem, attitude: NPCAttitude): number {
  const base = item.value;
  const multiplier = ATTITUDE_MULTIPLIERS[attitude].sell;
  return Math.max(1, Math.round(base * multiplier));
}

// ==================== 默认库存生成 ====================

/** 为 NPC 生成默认商品库存 */
export function generateDefaultShopInventory(npc: NPC): GameItem[] {
  return getShopInventory(npc.id);
}
