// ============================================================
// 上下文窗口管理器 — 消息历史 + 渐进式摘要
// ============================================================

import type { AssistantMessage, Context, Message } from '@mariozechner/pi-ai';
import type { GameState } from '../game/types';
import { EMIT_EVENTS_TOOL } from './schemas';

// ==================== Token 估算 ====================

/** 粗略估算中文字符数对应的 token 数（中文 1 字符 ≈ 0.5 token，英文 1 token ≈ 4 字符） */
function estimateTokens(text: string): number {
  let chineseChars = 0;
  let otherChars = 0;

  for (const char of text) {
    // CJK 统一表意文字范围
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) {
      chineseChars++;
    } else {
      otherChars++;
    }
  }

  return Math.ceil(chineseChars * 0.5 + otherChars * 0.25);
}

function estimateMessageTokens(message: Message): number {
  if (message.role === 'user') {
    if (typeof message.content === 'string') {
      return estimateTokens(message.content);
    }
    return message.content.reduce((sum, block) => {
      if (block.type === 'text') return sum + estimateTokens(block.text);
      return sum + 100; // image placeholder
    }, 0);
  }

  if (message.role === 'assistant') {
    return message.content.reduce((sum, block) => {
      if (block.type === 'text') return sum + estimateTokens(block.text);
      if (block.type === 'thinking') return sum + estimateTokens(block.thinking);
      if (block.type === 'toolCall') return sum + estimateTokens(JSON.stringify(block.arguments));
      return sum;
    }, 0);
  }

  // toolResult
  return message.content.reduce((sum, block) => {
    if (block.type === 'text') return sum + estimateTokens(block.text);
    return sum;
  }, 0);
}

// ==================== ContextManager ====================

/** 超过此 token 估计值触发消息淘汰 */
const SUMMARY_TRIGGER = 80000; // DeepSeek 128K 上下文，留 48K 余量

export class ContextManager {
  messages: Message[] = [];
  summary = '';

  /** 添加用户消息 */
  addUserMessage(text: string): void {
    this.messages.push({
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });
  }

  /** 添加助手消息 */
  addAssistantMessage(message: AssistantMessage): void {
    this.messages.push(message);
  }

  /** 添加工具调用结果 */
  addToolResult(toolCallId: string, toolName: string, result: string): void {
    this.messages.push({
      role: 'toolResult',
      toolCallId,
      toolName,
      content: [{ type: 'text', text: result }],
      isError: false,
      timestamp: Date.now(),
    });
  }

  /** 估算当前总 token 数 */
  estimateTotalTokens(): number {
    let total = estimateTokens(this.summary);
    for (const msg of this.messages) {
      total += estimateMessageTokens(msg);
    }
    return total;
  }

  /** 淘汰最早的消息，将内容加入摘要 */
  private compactMessages(): void {
    if (this.messages.length <= 2) return; // 至少保留最近的 2 条

    const removed = this.messages.splice(0, this.messages.length - 2);
    const compactText = summarizeMessages(removed);
    if (this.summary) {
      this.summary = `${this.summary}\n${compactText}`;
    } else {
      this.summary = compactText;
    }
  }

  /** 构建 pi-ai Context 对象 */
  buildContext(_state: GameState, systemPrompt: string): Context {
    // 检查是否需要压缩
    while (this.estimateTotalTokens() > SUMMARY_TRIGGER && this.messages.length > 2) {
      this.compactMessages();
    }

    // 如果有摘要，将其作为第一条用户消息插入
    const contextMessages: Message[] = [];
    if (this.summary) {
      contextMessages.push({
        role: 'user',
        content: `[前情提要]\n${this.summary}`,
        timestamp: Date.now(),
      });
    }

    contextMessages.push(...this.messages);

    return {
      systemPrompt,
      messages: contextMessages,
      tools: [EMIT_EVENTS_TOOL],
    };
  }

  /** 获取最近 N 条消息 */
  getRecentMessages(n: number): Message[] {
    return this.messages.slice(-n);
  }

  /** 清空所有消息和摘要 */
  clear(): void {
    this.messages = [];
    this.summary = '';
  }
}

/** 将淘汰的消息简化为摘要文本 */
function summarizeMessages(messages: Message[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      const text = typeof msg.content === 'string' ? msg.content : '[用户输入]';
      parts.push(`玩家：${text.slice(0, 100)}`);
    } else if (msg.role === 'assistant') {
      const textBlock = msg.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        parts.push(`叙事：${textBlock.text.slice(0, 200)}`);
      }
    }
  }
  return parts.join('\n');
}
