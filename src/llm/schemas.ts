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
    Type.Literal('equipment'),
  ]),
  subtype: Type.String(),
  description: Type.String(),
  quantity: Type.Number(),
  effects: Type.Array(ItemEffectSchema),
  value: Type.Number(),
  stackable: Type.Boolean(),
  maxStack: Type.Number(),
  // 装备字段（type === 'equipment' 时有效）
  slot: Type.Optional(
    Type.Union([
      Type.Literal('weapon'),
      Type.Literal('armor'),
      Type.Literal('treasure'),
      Type.Literal('accessory'),
    ])
  ),
  grade: Type.Optional(
    Type.Union([
      Type.Literal('凡品'),
      Type.Literal('灵品'),
      Type.Literal('宝品'),
      Type.Literal('仙品'),
      Type.Literal('神品'),
    ])
  ),
  equipStats: Type.Optional(StatChangesSchema),
  realmRequirement: Type.Optional(Type.Number()),
  durability: Type.Optional(Type.Number()),
  maxDurability: Type.Optional(Type.Number()),
  specialEffects: Type.Optional(
    Type.Array(
      Type.Object({
        trigger: Type.Union([
          Type.Literal('on_attack'),
          Type.Literal('on_defend'),
          Type.Literal('on_cultivate'),
          Type.Literal('passive'),
        ]),
        effect: Type.String(),
        value: Type.Number(),
      })
    )
  ),
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

const CultivationGainEventSchema = Type.Object({
  type: Type.Literal('cultivation_gain'),
  amount: Type.Number(),
});

const RealmAdvanceEventSchema = Type.Object({
  type: Type.Literal('realm_advance'),
  newSubStage: Type.String(),
  newRealm: Type.String(),
  newProgressIndex: Type.Number(),
});

// ---- Phase 6 新增事件 ----

const ItemUseEventSchema = Type.Object({
  type: Type.Literal('item_use'),
  itemId: Type.String(),
  effects: Type.Array(ItemEffectSchema),
});

const ItemRemoveEventSchema = Type.Object({
  type: Type.Literal('item_remove'),
  itemId: Type.String(),
  quantity: Type.Number(),
});

const EquipmentChangeEventSchema = Type.Object({
  type: Type.Literal('equipment_change'),
  slot: Type.Union([
    Type.Literal('weapon'),
    Type.Literal('armor'),
    Type.Literal('treasure'),
    Type.Literal('accessory'),
  ]),
  /** 装备 ID（从预定义装备库中查找）或 null 表示卸下 */
  itemId: Type.Optional(Type.String()),
});

const TradeEventSchema = Type.Object({
  type: Type.Literal('trade'),
  bought: Type.Array(GameItemSchema),
  sold: Type.Array(GameItemSchema),
  spiritStonesChange: Type.Number(),
});

// ---- Phase 7 灵宠事件 ----

const PetStatsSchema = Type.Object({
  hp: Type.Number(),
  maxHp: Type.Number(),
  attack: Type.Number(),
  defense: Type.Number(),
  speed: Type.Number(),
});

const PetSkillSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  cooldown: Type.Number(),
  currentCooldown: Type.Number(),
});

const SpiritPetSchema = Type.Object({
  id: Type.String(),
  templateId: Type.String(),
  name: Type.String(),
  species: Type.String(),
  level: Type.Number(),
  loyalty: Type.Number(),
  stats: PetStatsSchema,
  skills: Type.Array(PetSkillSchema),
  evolutionStage: Type.Number(),
  evolutionPath: Type.Union([
    Type.Literal('normal'),
    Type.Literal('divine'),
    Type.Literal('demonic'),
  ]),
  description: Type.String(),
});

const PetObtainEventSchema = Type.Object({
  type: Type.Literal('pet_obtain'),
  pet: SpiritPetSchema,
});

const PetEvolveEventSchema = Type.Object({
  type: Type.Literal('pet_evolve'),
  petId: Type.String(),
  newStage: Type.Number(),
  newPath: Type.String(),
});

const PetReleaseEventSchema = Type.Object({
  type: Type.Literal('pet_release'),
  petId: Type.String(),
});

const PetFeedEventSchema = Type.Object({
  type: Type.Literal('pet_feed'),
  petId: Type.String(),
  itemId: Type.String(),
  healAmount: Type.Number(),
  loyaltyChange: Type.Number(),
});

const PetInteractEventSchema = Type.Object({
  type: Type.Literal('pet_interact'),
  petId: Type.String(),
  loyaltyChange: Type.Number(),
});

// ==================== 事件联合类型 ====================

const GameEventSchema = Type.Union([
  NarrativeEventSchema,
  StatChangeEventSchema,
  ItemAddEventSchema,
  ItemUseEventSchema,
  ItemRemoveEventSchema,
  EquipmentChangeEventSchema,
  TradeEventSchema,
  SpiritStonesChangeEventSchema,
  DecisionRequiredEventSchema,
  CultivationGainEventSchema,
  RealmAdvanceEventSchema,
  PetObtainEventSchema,
  PetEvolveEventSchema,
  PetReleaseEventSchema,
  PetFeedEventSchema,
  PetInteractEventSchema,
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
