// ============================================================
// LLM Tool Calling JSON Schema — emit_events 函数定义
// 使用 TypeBox (pi-ai 重新导出) 构建类型安全的 Schema
// ============================================================

import { type TSchema, Type } from '@mariozechner/pi-ai';

// ==================== 物品效果 ====================

const ItemEffectSchema = Type.Object({
  attribute: Type.String(),
  operation: Type.Union([Type.Literal('add'), Type.Literal('multiply'), Type.Literal('set')]),
  value: Type.Number(),
  duration: Type.Union([
    Type.Literal('instant'),
    Type.Literal('combat'),
    Type.Literal('permanent'),
  ]),
});

// ==================== 菜单选项 & 决策 ====================

const MenuChoiceSchema = Type.Object({
  id: Type.String(),
  label: Type.String(),
  description: Type.String(),
});

const PendingDecisionSchema = Type.Object({
  type: Type.Union([Type.Literal('menu'), Type.Literal('free_text')]),
  prompt: Type.String(),
  choices: Type.Optional(Type.Array(MenuChoiceSchema)),
});

// ==================== 5 种核心事件类型 ====================

const NarrativeEventSchema = Type.Object({
  type: Type.Literal('narrative'),
  text: Type.String(),
  speaker: Type.String(),
});

const StatChangesSchema = Type.Object({
  hp: Type.Optional(Type.Number()),
  maxHp: Type.Optional(Type.Number()),
  qi: Type.Optional(Type.Number()),
  maxQi: Type.Optional(Type.Number()),
  stamina: Type.Optional(Type.Number()),
  maxStamina: Type.Optional(Type.Number()),
  willpower: Type.Optional(Type.Number()),
});

const StatChangeEventSchema = Type.Object({
  type: Type.Literal('stat_change'),
  target: Type.Union([Type.Literal('player'), Type.Literal('pet')]),
  changes: StatChangesSchema,
  petId: Type.Optional(Type.String()),
});

const GameItemSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  type: Type.Union([
    Type.Literal('consumable'),
    Type.Literal('material'),
    Type.Literal('technique'),
    Type.Literal('misc'),
  ]),
  subtype: Type.String(),
  description: Type.String(),
  quantity: Type.Number(),
  effects: Type.Array(ItemEffectSchema),
  value: Type.Number(),
  stackable: Type.Boolean(),
  maxStack: Type.Number(),
});

const ItemAddEventSchema = Type.Object({
  type: Type.Literal('item_add'),
  item: GameItemSchema,
});

const SpiritStonesChangeEventSchema = Type.Object({
  type: Type.Literal('spirit_stones_change'),
  amount: Type.Number(),
  reason: Type.String(),
});

const DecisionRequiredEventSchema = Type.Object({
  type: Type.Literal('decision_required'),
  decision: PendingDecisionSchema,
});

// ==================== 事件联合类型 ====================

const GameEventSchema = Type.Union([
  NarrativeEventSchema,
  StatChangeEventSchema,
  ItemAddEventSchema,
  SpiritStonesChangeEventSchema,
  DecisionRequiredEventSchema,
]);

// ==================== emit_events 参数 ====================

const EmitEventsParamsSchema = Type.Object({
  events: Type.Array(GameEventSchema),
  pending_decision: Type.Optional(PendingDecisionSchema),
});

// ==================== 导出 ====================

export const EMIT_EVENTS_TOOL: {
  name: string;
  description: string;
  parameters: TSchema;
} = {
  name: 'emit_events',
  description:
    '发射游戏事件来更新游戏状态。每个事件描述游戏世界中发生的一件事。' +
    '你必须通过这个函数来表达所有状态变化，包括叙事文本、属性变化、物品增减、灵石变化和决策需求。' +
    '叙事文本(text)请使用古风白话文风格，介于文言文和现代汉语之间。',
  parameters: EmitEventsParamsSchema,
};
