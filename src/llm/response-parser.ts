// ============================================================
// LLM 响应解析器 — Tool Call → GameEvent[]
// ============================================================

import type { AssistantMessage, ToolCall } from '@mariozechner/pi-ai';
import { z } from 'zod';
import type {
  CoreStats,
  GameEvent,
  GameItem,
  LLMGameEventOutput,
  PendingDecision,
} from '../game/types';

// ==================== Zod 校验 Schema ====================

const ItemEffectSchema = z.object({
  attribute: z.string(),
  operation: z.enum(['add', 'multiply', 'set']),
  value: z.number(),
  duration: z.enum(['instant', 'combat', 'permanent']),
});

const MenuChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

const PendingDecisionSchema: z.ZodType<PendingDecision> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('menu'),
    prompt: z.string(),
    choices: z.array(MenuChoiceSchema),
  }),
  z.object({
    type: z.literal('free_text'),
    prompt: z.string(),
  }),
]);

const RawNarrativeEventSchema = z.object({
  type: z.literal('narrative'),
  text: z.string(),
  speaker: z.string(),
});

const RawStatChangeEventSchema = z.object({
  type: z.literal('stat_change'),
  target: z.enum(['player', 'pet']),
  changes: z
    .object({
      hp: z.number().optional(),
      maxHp: z.number().optional(),
      qi: z.number().optional(),
      maxQi: z.number().optional(),
      stamina: z.number().optional(),
      maxStamina: z.number().optional(),
      willpower: z.number().optional(),
    })
    .passthrough(),
  petId: z.string().optional(),
});

const RawItemAddEventSchema = z.object({
  type: z.literal('item_add'),
  item: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['consumable', 'material', 'technique', 'misc', 'equipment']),
    subtype: z.string(),
    description: z.string(),
    quantity: z.number(),
    effects: z.array(ItemEffectSchema),
    value: z.number(),
    stackable: z.boolean(),
    maxStack: z.number(),
    slot: z.enum(['weapon', 'armor', 'treasure', 'accessory']).optional(),
    grade: z.enum(['凡品', '灵品', '宝品', '仙品', '神品']).optional(),
    equipStats: z
      .object({
        hp: z.number().optional(),
        maxHp: z.number().optional(),
        qi: z.number().optional(),
        maxQi: z.number().optional(),
        stamina: z.number().optional(),
        maxStamina: z.number().optional(),
        willpower: z.number().optional(),
      })
      .passthrough()
      .optional(),
    realmRequirement: z.number().optional(),
    durability: z.number().optional(),
    maxDurability: z.number().optional(),
    specialEffects: z
      .array(
        z.object({
          trigger: z.enum(['on_attack', 'on_defend', 'on_cultivate', 'passive']),
          effect: z.string(),
          value: z.number(),
        })
      )
      .optional(),
  }),
});

// Phase 6 新增事件 Schema

const RawItemUseEventSchema = z.object({
  type: z.literal('item_use'),
  itemId: z.string(),
  effects: z.array(ItemEffectSchema),
});

const RawItemRemoveEventSchema = z.object({
  type: z.literal('item_remove'),
  itemId: z.string(),
  quantity: z.number(),
});

const RawEquipmentChangeEventSchema = z.object({
  type: z.literal('equipment_change'),
  slot: z.enum(['weapon', 'armor', 'treasure', 'accessory']),
  itemId: z.string().optional(),
});

const RawTradeEventSchema = z.object({
  type: z.literal('trade'),
  bought: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['consumable', 'material', 'technique', 'misc', 'equipment']),
      subtype: z.string(),
      description: z.string(),
      quantity: z.number(),
      effects: z.array(ItemEffectSchema),
      value: z.number(),
      stackable: z.boolean(),
      maxStack: z.number(),
    })
  ),
  sold: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['consumable', 'material', 'technique', 'misc', 'equipment']),
      subtype: z.string(),
      description: z.string(),
      quantity: z.number(),
      effects: z.array(ItemEffectSchema),
      value: z.number(),
      stackable: z.boolean(),
      maxStack: z.number(),
    })
  ),
  spiritStonesChange: z.number(),
});

const RawSpiritStonesChangeEventSchema = z.object({
  type: z.literal('spirit_stones_change'),
  amount: z.number(),
  reason: z.string(),
});

const RawDecisionRequiredEventSchema = z.object({
  type: z.literal('decision_required'),
  decision: PendingDecisionSchema,
});

const RawCultivationGainEventSchema = z.object({
  type: z.literal('cultivation_gain'),
  amount: z.number(),
});

const RawRealmAdvanceEventSchema = z.object({
  type: z.literal('realm_advance'),
  newSubStage: z.string(),
  newRealm: z.string(),
  newProgressIndex: z.number(),
});

const RawGameEventSchema = z.discriminatedUnion('type', [
  RawNarrativeEventSchema,
  RawStatChangeEventSchema,
  RawItemAddEventSchema,
  RawItemUseEventSchema,
  RawItemRemoveEventSchema,
  RawEquipmentChangeEventSchema,
  RawTradeEventSchema,
  RawSpiritStonesChangeEventSchema,
  RawDecisionRequiredEventSchema,
  RawCultivationGainEventSchema,
  RawRealmAdvanceEventSchema,
]);

const EmitEventsParamsSchema = z.object({
  events: z.array(RawGameEventSchema),
  pending_decision: PendingDecisionSchema.optional().nullable(),
});

// ==================== 解析函数 ====================

/**
 * 从 tool call 参数中解析 GameEvent 数组
 */
export function parseEmitEvents(toolCall: ToolCall): LLMGameEventOutput {
  const parsed = EmitEventsParamsSchema.safeParse(toolCall.arguments);

  if (!parsed.success) {
    // 校验失败时，尝试宽松解析：忽略无法识别的事件
    const events: GameEvent[] = [];
    let pendingDecision: PendingDecision | null = null;

    const rawArgs = toolCall.arguments as Record<string, unknown>;
    if (rawArgs && typeof rawArgs === 'object') {
      // 尝试解析 events 数组
      const rawEvents = rawArgs.events;
      if (Array.isArray(rawEvents)) {
        for (const raw of rawEvents) {
          const result = RawGameEventSchema.safeParse(raw);
          if (result.success) {
            const event = rawToGameEvent(result.data);
            if (event) events.push(event);
          }
        }
      }

      // 尝试解析 pending_decision
      const rawDecision = rawArgs.pending_decision;
      if (rawDecision && typeof rawDecision === 'object') {
        const decisionResult = PendingDecisionSchema.safeParse(rawDecision);
        if (decisionResult.success) {
          pendingDecision = decisionResult.data;
        }
      }
    }

    // 如果没有解析出任何事件，创建一个空的 narrative 事件
    if (events.length === 0) {
      events.push({
        type: 'narrative',
        text: '（系统：未能解析 LLM 响应）',
        speaker: 'system',
        timestamp: Date.now(),
      });
    }

    return { events, pending_decision: pendingDecision };
  }

  return rawToOutput(parsed.data);
}

/**
 * 从 AssistantMessage 中解析响应
 */
export function parseStreamResponse(message: AssistantMessage): LLMGameEventOutput | null {
  // 查找 emit_events tool call
  const toolCalls = message.content.filter((block): block is ToolCall => block.type === 'toolCall');

  const emitCall = toolCalls.find((tc) => tc.name === 'emit_events');
  if (emitCall) {
    return parseEmitEvents(emitCall);
  }

  // 没有 tool call 时的降级处理：从文本内容创建 narrative 事件
  const narrativeText = extractNarrativeText(message);
  if (narrativeText) {
    return {
      events: [
        {
          type: 'narrative',
          text: narrativeText,
          speaker: 'narrator',
          timestamp: Date.now(),
        },
      ],
      pending_decision: null,
    };
  }

  return null;
}

/**
 * 从 AssistantMessage 中提取所有文本内容
 */
export function extractNarrativeText(message: AssistantMessage): string {
  return message.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/**
 * 从 AssistantMessage 中提取思考内容（如有）
 */
export function extractThinkingText(message: AssistantMessage): string {
  return message.content
    .filter(
      (block): block is { type: 'thinking'; thinking: string } =>
        block.type === 'thinking' && !block.redacted
    )
    .map((block) => block.thinking)
    .join('\n');
}

// ==================== 内部辅助 ====================

function rawToOutput(parsed: z.infer<typeof EmitEventsParamsSchema>): LLMGameEventOutput {
  const events: GameEvent[] = parsed.events
    .map(rawToGameEvent)
    .filter((e): e is GameEvent => e !== null);
  // 成功解析但 events 为空时，创建降级事件
  if (events.length === 0) {
    events.push({
      type: 'narrative',
      text: '（系统：未能解析 LLM 响应）',
      speaker: 'system',
      timestamp: Date.now(),
    });
  }
  return {
    events,
    pending_decision: parsed.pending_decision ?? null,
  };
}

function rawToGameEvent(raw: z.infer<typeof RawGameEventSchema>): GameEvent | null {
  switch (raw.type) {
    case 'narrative':
      return {
        type: 'narrative',
        text: raw.text,
        speaker: raw.speaker,
        timestamp: Date.now(),
      };

    case 'stat_change': {
      // 过滤掉 undefined 值以满足 exactOptionalPropertyTypes
      const changes: Partial<CoreStats> = {};
      const rawChanges = raw.changes as Record<string, number | undefined>;
      for (const key of [
        'hp',
        'maxHp',
        'qi',
        'maxQi',
        'stamina',
        'maxStamina',
        'willpower',
      ] as const) {
        const val = rawChanges[key];
        if (val !== undefined) {
          (changes as Record<string, number>)[key] = val;
        }
      }
      const event: GameEvent = {
        type: 'stat_change',
        target: raw.target,
        changes,
      };
      if (raw.petId !== undefined) {
        (event as Record<string, unknown>).petId = raw.petId;
      }
      return event;
    }

    case 'item_add':
      return {
        type: 'item_add',
        item: raw.item as GameItem,
      };

    case 'spirit_stones_change':
      return {
        type: 'spirit_stones_change',
        amount: raw.amount,
        reason: raw.reason,
      };

    case 'decision_required':
      return {
        type: 'decision_required',
        decision: raw.decision,
      };

    case 'cultivation_gain':
      return {
        type: 'cultivation_gain',
        amount: raw.amount,
      };

    case 'realm_advance':
      return {
        type: 'realm_advance',
        newSubStage: raw.newSubStage as GameEvent extends {
          type: 'realm_advance';
          newSubStage: infer S;
        }
          ? S
          : never,
        newRealm: raw.newRealm as GameEvent extends { type: 'realm_advance'; newRealm: infer R }
          ? R
          : never,
        newProgressIndex: raw.newProgressIndex,
      };

    case 'item_use':
      return {
        type: 'item_use',
        itemId: raw.itemId,
        effects: raw.effects,
      };

    case 'item_remove':
      return {
        type: 'item_remove',
        itemId: raw.itemId,
        quantity: raw.quantity,
      };

    case 'equipment_change':
      return {
        type: 'equipment_change',
        slot: raw.slot,
        item: raw.itemId
          ? {
              id: raw.itemId,
              name: raw.itemId,
              type: 'equipment' as const,
              slot: raw.slot,
              subtype: '飞剑' as const,
              grade: '凡品' as const,
              stats: {},
              realmRequirement: 0,
              durability: 100,
              maxDurability: 100,
              specialEffects: [],
              description: '',
            }
          : null,
      };

    case 'trade':
      return {
        type: 'trade',
        bought: raw.bought,
        sold: raw.sold,
        spiritStonesChange: raw.spiritStonesChange,
      };

    default:
      return null;
  }
}
