import type { AssistantMessage, ToolCall } from '@mariozechner/pi-ai';
import { describe, expect, it } from 'vitest';
import {
  extractNarrativeText,
  parseEmitEvents,
  parseStreamResponse,
} from '../../llm/response-parser';

// ==================== 辅助函数 ====================

function createNarrativeToolCall(text: string, speaker = 'narrator'): ToolCall {
  return {
    type: 'toolCall',
    id: 'call_001',
    name: 'emit_events',
    arguments: {
      events: [{ type: 'narrative', text, speaker }],
      pending_decision: null,
    },
  };
}

function createCompoundToolCall(): ToolCall {
  return {
    type: 'toolCall',
    id: 'call_002',
    name: 'emit_events',
    arguments: {
      events: [
        {
          type: 'narrative',
          text: '你在密林中穿行，忽然发现一株散发微光的灵草。',
          speaker: 'narrator',
        },
        { type: 'spirit_stones_change', amount: 10, reason: '发现灵石' },
        {
          type: 'item_add',
          item: {
            id: 'spirit_herb',
            name: '灵光草',
            type: 'material',
            subtype: 'herb',
            description: '散发着微弱灵气的草药，可用于炼丹',
            quantity: 2,
            effects: [],
            value: 30,
            stackable: true,
            maxStack: 99,
          },
        },
      ],
      pending_decision: null,
    },
  };
}

function createDecisionToolCall(): ToolCall {
  return {
    type: 'toolCall',
    id: 'call_003',
    name: 'emit_events',
    arguments: {
      events: [
        {
          type: 'narrative',
          text: '一位白发老者拦住你的去路，上下打量着你。',
          speaker: 'narrator',
        },
      ],
      pending_decision: {
        type: 'menu',
        prompt: '老者开口问道："小友从何处来？"',
        choices: [
          { id: 'honest', label: '如实相告', description: '告诉老者你的来历' },
          { id: 'vague', label: '含糊带过', description: '不透露太多信息' },
          { id: 'ask', label: '反问', description: '询问老者是谁' },
        ],
      },
    },
  };
}

function createStatChangeToolCall(): ToolCall {
  return {
    type: 'toolCall',
    id: 'call_004',
    name: 'emit_events',
    arguments: {
      events: [
        {
          type: 'narrative',
          text: '一道剑气擦过你的肩膀，留下一道血痕。',
          speaker: 'narrator',
        },
        {
          type: 'stat_change',
          target: 'player',
          changes: { hp: -15, stamina: -5 },
        },
      ],
      pending_decision: null,
    },
  };
}

function makeAssistantMessage(content: ToolCall[]): AssistantMessage {
  return {
    role: 'assistant',
    content,
    api: 'openai-completions',
    provider: 'deepseek',
    model: 'deepseek-chat',
    usage: {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 150,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'toolUse',
    timestamp: Date.now(),
  };
}

function makeTextAssistantMessage(text: string): AssistantMessage {
  return {
    role: 'assistant',
    content: [{ type: 'text', text }],
    api: 'openai-completions',
    provider: 'deepseek',
    model: 'deepseek-chat',
    usage: {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 150,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'stop',
    timestamp: Date.now(),
  };
}

// ==================== parseEmitEvents 测试 ====================

describe('parseEmitEvents', () => {
  it('should parse a simple narrative event', () => {
    const toolCall = createNarrativeToolCall('一阵清风吹过竹林，竹叶沙沙作响。');

    const result = parseEmitEvents(toolCall);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('narrative');
    if (result.events[0]?.type === 'narrative') {
      expect(result.events[0].text).toBe('一阵清风吹过竹林，竹叶沙沙作响。');
      expect(result.events[0].speaker).toBe('narrator');
      expect(result.events[0].timestamp).toBeGreaterThan(0);
    }
    expect(result.pending_decision).toBeNull();
  });

  it('should parse compound events with multiple types', () => {
    const toolCall = createCompoundToolCall();

    const result = parseEmitEvents(toolCall);

    expect(result.events).toHaveLength(3);

    // Narrative
    expect(result.events[0]?.type).toBe('narrative');

    // Spirit stones change
    expect(result.events[1]?.type).toBe('spirit_stones_change');
    if (result.events[1]?.type === 'spirit_stones_change') {
      expect(result.events[1].amount).toBe(10);
      expect(result.events[1].reason).toBe('发现灵石');
    }

    // Item add
    expect(result.events[2]?.type).toBe('item_add');
    if (result.events[2]?.type === 'item_add') {
      expect(result.events[2].item.name).toBe('灵光草');
      expect(result.events[2].item.quantity).toBe(2);
    }
  });

  it('should parse decision_required with menu choices', () => {
    const toolCall = createDecisionToolCall();

    const result = parseEmitEvents(toolCall);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('narrative');
    expect(result.pending_decision).not.toBeNull();
    expect(result.pending_decision?.type).toBe('menu');
    expect(result.pending_decision?.choices).toHaveLength(3);
    expect(result.pending_decision?.choices?.[0]?.id).toBe('honest');
  });

  it('should parse stat_change events', () => {
    const toolCall = createStatChangeToolCall();

    const result = parseEmitEvents(toolCall);

    expect(result.events).toHaveLength(2);

    const statEvent = result.events[1];
    expect(statEvent?.type).toBe('stat_change');
    if (statEvent?.type === 'stat_change') {
      expect(statEvent.target).toBe('player');
      expect(statEvent.changes.hp).toBe(-15);
      expect(statEvent.changes.stamina).toBe(-5);
    }
  });

  it('should handle empty events array gracefully', () => {
    const toolCall: ToolCall = {
      type: 'toolCall',
      id: 'call_empty',
      name: 'emit_events',
      arguments: {
        events: [],
        pending_decision: null,
      },
    };

    const result = parseEmitEvents(toolCall);

    // Should create a fallback narrative event
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('narrative');
    if (result.events[0]?.type === 'narrative') {
      expect(result.events[0].speaker).toBe('system');
    }
  });

  it('should handle missing required fields by filtering invalid events', () => {
    const toolCall: ToolCall = {
      type: 'toolCall',
      id: 'call_invalid',
      name: 'emit_events',
      arguments: {
        events: [
          // Missing text field
          { type: 'narrative', speaker: 'narrator' },
          // Valid event mixed in
          { type: 'narrative', text: '有效事件', speaker: 'narrator' },
        ],
        pending_decision: null,
      },
    };

    const result = parseEmitEvents(toolCall);

    // Should skip the invalid event and keep the valid one
    // The invalid event is filtered out; at least the valid one remains
    const narratives = result.events.filter((e) => e.type === 'narrative');
    expect(narratives.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle completely malformed arguments', () => {
    const toolCall: ToolCall = {
      type: 'toolCall',
      id: 'call_malformed',
      name: 'emit_events',
      arguments: {
        // Missing events entirely
      },
    };

    const result = parseEmitEvents(toolCall);

    // Should create fallback
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0]?.type).toBe('narrative');
    if (result.events[0]?.type === 'narrative') {
      expect(result.events[0].speaker).toBe('system');
    }
  });

  it('should handle null arguments gracefully', () => {
    const toolCall: ToolCall = {
      type: 'toolCall',
      id: 'call_null',
      name: 'emit_events',
      arguments: null as unknown as Record<string, unknown>,
    };

    const result = parseEmitEvents(toolCall);

    // Should create fallback
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0]?.type).toBe('narrative');
  });
});

// ==================== parseStreamResponse 测试 ====================

describe('parseStreamResponse', () => {
  it('should extract events from emit_events tool call', () => {
    const toolCall = createNarrativeToolCall('你踏入苍梧城，城中热闹非凡。');
    const message = makeAssistantMessage([toolCall]);

    const result = parseStreamResponse(message);

    expect(result).not.toBeNull();
    expect(result?.events).toHaveLength(1);
    expect(result?.events[0]?.type).toBe('narrative');
  });

  it('should fall back to text content when no tool call', () => {
    const message = makeTextAssistantMessage('苍梧山脉绵延三千里，灵气充沛。');

    const result = parseStreamResponse(message);

    expect(result).not.toBeNull();
    expect(result?.events).toHaveLength(1);
    expect(result?.events[0]?.type).toBe('narrative');
    if (result?.events[0]?.type === 'narrative') {
      expect(result?.events[0].text).toBe('苍梧山脉绵延三千里，灵气充沛。');
    }
    expect(result?.pending_decision).toBeNull();
  });

  it('should return null for empty assistant message', () => {
    const message = makeTextAssistantMessage('');

    const result = parseStreamResponse(message);
    // Empty text produces null since there's nothing to show
    expect(result).toBeNull();
  });

  it('should find emit_events among multiple tool calls', () => {
    const emitCall = createNarrativeToolCall('正确的事件');
    const otherCall: ToolCall = {
      type: 'toolCall',
      id: 'call_other',
      name: 'some_other_function',
      arguments: { data: 'ignored' },
    };
    const message = makeAssistantMessage([otherCall, emitCall]);

    const result = parseStreamResponse(message);

    expect(result).not.toBeNull();
    expect(result?.events[0]?.type).toBe('narrative');
    if (result?.events[0]?.type === 'narrative') {
      expect(result?.events[0].text).toBe('正确的事件');
    }
  });
});

// ==================== extractNarrativeText 测试 ====================

describe('extractNarrativeText', () => {
  it('should extract text content from assistant message', () => {
    const message = makeTextAssistantMessage('第一段文本。\n第二段文本。');

    const text = extractNarrativeText(message);

    expect(text).toBe('第一段文本。\n第二段文本。');
  });

  it('should return empty string when no text content', () => {
    const message = makeAssistantMessage([
      {
        type: 'toolCall',
        id: 'call_only',
        name: 'emit_events',
        arguments: {},
      },
    ]);

    const text = extractNarrativeText(message);

    expect(text).toBe('');
  });

  it('should combine multiple text blocks', () => {
    const message: AssistantMessage = {
      role: 'assistant',
      content: [
        { type: 'text', text: '第一段。' },
        { type: 'text', text: '第二段。' },
      ],
      api: 'openai-completions',
      provider: 'deepseek',
      model: 'deepseek-chat',
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
      timestamp: Date.now(),
    };

    const text = extractNarrativeText(message);

    expect(text).toBe('第一段。\n第二段。');
  });
});
