// ============================================================
// 物品使用服务 — 消耗品效果系统
// 纯函数模块，返回 GameEvent[] 由 engine 应用
// ============================================================

import * as Events from '../game/events';
import type { GameEvent, GameState, ItemEffect } from '../game/types';

// ==================== 物品使用 ====================

/**
 * 使用指定物品，返回由此产生的 GameEvent 数组。
 * 调用者应将 events 传入 applyEvents。
 * 返回空数组并附带 error 信息表示无法使用。
 */
export function useItem(state: GameState, itemId: string): { events: GameEvent[]; error?: string } {
  // 在背包中查找物品
  const lower = itemId.toLowerCase();
  let idx = state.inventory.findIndex((i) => i.id === lower);
  if (idx < 0) {
    idx = state.inventory.findIndex((i) => i.name.toLowerCase().includes(lower));
  }
  if (idx < 0) {
    return { events: [], error: `背包中没有找到 "${itemId}"` };
  }

  const item = state.inventory[idx]!;

  // 只能使用消耗品
  if (item.type !== 'consumable') {
    return { events: [], error: `"${item.name}" 不是消耗品，无法使用` };
  }

  // 必须有可用的效果
  if (!item.effects || item.effects.length === 0) {
    return { events: [], error: `"${item.name}" 没有任何使用效果` };
  }

  const events: GameEvent[] = [];

  // 物品使用事件（reducer 减数量）
  events.push(Events.itemUse(item.id, item.effects));

  // 解析每个效果
  for (const effect of item.effects) {
    events.push(...resolveItemEffect(state, effect, item.name));
  }

  // 使用叙事
  events.push(Events.narrative('system', generateUseNarrative(item.name, item.effects)));

  return { events };
}

// ==================== 效果解析 ====================

const STAT_ATTRIBUTES = ['hp', 'maxHp', 'qi', 'maxQi', 'stamina', 'maxStamina', 'willpower'];

function resolveItemEffect(state: GameState, effect: ItemEffect, itemName: string): GameEvent[] {
  const events: GameEvent[] = [];
  let { value, operation, attribute, duration } = effect;

  // 天赋加成：丹道奇才
  const itemBonus = state.player.flags['item_effect_bonus'];
  if (typeof itemBonus === 'number' && itemBonus > 0) {
    value = Math.round(value * (1 + itemBonus));
  }

  switch (operation) {
    case 'add': {
      if (STAT_ATTRIBUTES.includes(attribute)) {
        // 属性加减
        const changes: Record<string, number> = {};
        changes[attribute] = value;

        if (duration === 'permanent') {
          // 永久属性提升同时增加 current 和 max
          if (attribute.startsWith('max')) {
            changes[attribute.replace('max', '').toLowerCase()] = value;
          }
        }

        events.push(Events.statChange('player', changes));
      } else if (attribute === 'cultivation') {
        events.push(Events.cultivationGain(value));
      } else if (attribute === 'spirit_stones') {
        events.push(Events.spiritStonesChange(value, `使用 ${itemName}`));
      } else {
        // 未知属性，设置 flag
        events.push(Events.flagSet(`item_effect_${attribute}`, value));
      }
      break;
    }

    case 'multiply': {
      if (duration === 'combat') {
        // 战斗临时 buff，设置 flag 供 LLM 参考
        events.push(Events.flagSet(`combat_buff_${attribute}`, value));
        events.push(
          Events.narrative('system', `使用了 ${itemName}，${attribute} 暂时提升至 ${value} 倍。`)
        );
      } else if (duration === 'permanent') {
        // 永久倍率 — 直接修改对应属性
        if (STAT_ATTRIBUTES.includes(attribute)) {
          const currentVal =
            (state.player.stats as unknown as Record<string, number>)[attribute] ?? 0;
          const changes: Record<string, number> = {};
          changes[attribute] = Math.round(currentVal * (value - 1));
          events.push(Events.statChange('player', changes));
        }
      } else {
        // instant multiply — 按倍率增加
        if (STAT_ATTRIBUTES.includes(attribute)) {
          const currentVal =
            (state.player.stats as unknown as Record<string, number>)[attribute] ?? 0;
          const changes: Record<string, number> = {};
          changes[attribute] = Math.round(currentVal * (value - 1));
          events.push(Events.statChange('player', changes));
        }
      }
      break;
    }

    case 'set': {
      if (STAT_ATTRIBUTES.includes(attribute)) {
        const changes: Record<string, number> = {};
        changes[attribute] = value;
        events.push(Events.statChange('player', changes));
      } else {
        events.push(Events.flagSet(`item_effect_${attribute}`, value));
      }
      break;
    }
  }

  return events;
}

// ==================== 叙事生成 ====================

function generateUseNarrative(itemName: string, effects: ItemEffect[]): string {
  const parts: string[] = [];
  for (const e of effects) {
    const sign = e.value >= 0 ? '+' : '';
    const nameMap: Record<string, string> = {
      hp: '生命值',
      maxHp: '生命上限',
      qi: '灵力值',
      maxQi: '灵力上限',
      stamina: '体力',
      maxStamina: '体力上限',
      willpower: '意志力',
      cultivation: '修炼进度',
      spirit_stones: '灵石',
    };
    const attrName = nameMap[e.attribute] ?? e.attribute;

    switch (e.operation) {
      case 'add':
        parts.push(`${attrName}${sign}${e.value}`);
        break;
      case 'multiply':
        parts.push(`${attrName} ×${e.value}`);
        break;
      case 'set':
        parts.push(`${attrName} 设为 ${e.value}`);
        break;
    }

    if (e.duration === 'permanent') {
      parts[parts.length - 1] += '（永久）';
    } else if (e.duration === 'combat') {
      parts[parts.length - 1] += '（战斗内）';
    }
  }

  return `使用了 ${itemName}：${parts.join('，')}。`;
}

/** 清除所有战斗临时 buff */
export function clearCombatBuffs(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  for (const key of Object.keys(state.player.flags)) {
    if (key.startsWith('combat_buff_')) {
      events.push(Events.flagSet(key, 0));
    }
  }
  return events;
}
