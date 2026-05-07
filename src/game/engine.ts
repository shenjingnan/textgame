// ============================================================
// 游戏循环编排器 — 纯逻辑，与 TUI 解耦
// ============================================================

import type { AssistantMessageEventStream, ToolCall } from '@mariozechner/pi-ai';
import { GameLLMClient } from '../llm/client';
import { ContextManager } from '../llm/context-manager';
import {
  buildExplorationMessage,
  buildLocationContext,
  buildStatusSummary,
  buildSystemPrompt,
} from '../llm/prompt-builder';
import { parseStreamResponse } from '../llm/response-parser';
import {
  CANGWU_MOUNTAINS,
  canMoveTo,
  getConnectedLocations,
  getLocationById,
  getLocationName,
} from '../world/world-data';
import * as Events from './events';
import { loadGame, saveGame } from './save-load';
import { applyEvents, createInitialState, getCurrentLocation } from './state';
import type { GameEvent, GameState, PendingDecision } from './types';

// ==================== 回调接口 ====================

export interface EngineCallbacks {
  /** 叙事文本更新（流式增量或完整替换） */
  onNarrativeUpdate: (text: string) => void;
  /** 状态已变更，TUI 应刷新状态栏等 */
  onStateUpdate: (state: GameState) => void;
  /** 引擎需要玩家做出菜单选择 */
  onDecisionRequired: (decision: PendingDecision) => void;
  /** 开始处理（显示加载指示器） */
  onProcessingStart: (message: string) => void;
  /** 处理结束（隐藏加载指示器） */
  onProcessingEnd: () => void;
  /** 非致命错误通知 */
  onError: (message: string) => void;
  /** 游戏结束 */
  onGameOver: (reason: string) => void;
}

// ==================== 命令结果 ====================

export interface CommandResult {
  type: 'narrative_append' | 'state_change' | 'error';
  message: string;
}

// ==================== 欢迎消息 ====================

const WELCOME_TEXT = `
# 修仙 CLI 文字 RPG

欢迎来到**苍梧山脉**，一个充满灵气与危险的修仙世界。

你的修仙之路从这里开始。探索广袤的山脉，修炼突破境界，收服灵宠，收集法宝，书写属于你的修仙传奇。

**你可以自由输入任何行动**，比如：
- "我在苍梧城中四处逛逛，看看有什么店铺"
- "前往城外密林采集灵草"
- "运功修炼，提升境界"
- "与路边的散修交谈"

特殊命令：**/status** 查看状态 | **/look** 观察周围 | **/inventory** 背包
**/move <地点>** 移动 | **/save** 存档 | **/load** 读档 | **/help** 帮助 | **/quit** 退出
`.trim();

// ==================== GameEngine ====================

export class GameEngine {
  private state: GameState;
  private llm: GameLLMClient;
  private contextManager: ContextManager;
  private callbacks: EngineCallbacks;

  private accumulatedText = '';
  private _isProcessing = false;

  constructor(callbacks: EngineCallbacks, apiKey?: string) {
    this.callbacks = callbacks;
    this.state = createInitialState('无名散修', 'normal', CANGWU_MOUNTAINS);
    this.llm = new GameLLMClient(apiKey);
    this.contextManager = new ContextManager();

    // 添加初始系统消息
    this.contextManager.addUserMessage(
      `[游戏开始] 玩家「${this.state.player.name}」进入苍梧山脉修仙世界。` +
        `境界：${this.state.player.realm.name}${this.state.player.realm.subStage}。` +
        `位置：苍梧城。作为DM，请向玩家描述当前场景并引导游戏。`
    );
  }

  // ==================== 公开 API ====================

  get isProcessing(): boolean {
    return this._isProcessing;
  }

  /** 获取只读状态 */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /** 获取欢迎文本 */
  getWelcomeText(): string {
    return WELCOME_TEXT;
  }

  /** 取消当前 LLM 请求 */
  abort(): void {
    this.llm.abort();
  }

  /** 处理玩家自由输入 */
  async processInput(text: string): Promise<void> {
    if (this._isProcessing) return;

    this._isProcessing = true;
    this.accumulatedText = '';

    this.callbacks.onProcessingStart('灵气凝聚中...');

    try {
      // 构建带位置上下文的探索消息
      const currentLocation = getCurrentLocation(this.state);
      const locationInfo = currentLocation ? buildLocationContext(currentLocation) : undefined;
      const explorationMsg = buildExplorationMessage(this.state, text, locationInfo);
      this.contextManager.addUserMessage(explorationMsg);

      await this.runLLMCycle();
    } catch (err) {
      this.callbacks.onProcessingEnd();
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      this.callbacks.onError(errorMsg);
      this.appendNarrative(`\n\n*（系统：${errorMsg}）*`);
      this.finishTurn();
    }
  }

  /** 处理决策选择 */
  async handleDecision(choiceId: string, choiceLabel: string): Promise<void> {
    this._isProcessing = true;
    this.accumulatedText = '';

    this.callbacks.onProcessingStart('天道推演中...');

    try {
      // 将选择加入上下文
      this.contextManager.addUserMessage(`[玩家选择] ${choiceLabel}`);

      // 清除待处理决策
      this.applyEvents([Events.decisionResolved(choiceId)]);

      await this.runLLMCycle();
    } catch (err) {
      this.callbacks.onProcessingEnd();
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      this.callbacks.onError(errorMsg);
      this.appendNarrative(`\n\n*（系统：${errorMsg}）*`);
      this.finishTurn();
    }
  }

  /** 执行特殊命令（不涉及 LLM） */
  executeCommand(command: string): CommandResult {
    const parts = command.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case '/status':
        return this.cmdStatus();

      case '/look':
        return this.cmdLook();

      case '/inventory':
        return this.cmdInventory();

      case '/move':
        return this.cmdMove(arg);

      case '/save':
        return this.cmdSave(arg);

      case '/load':
        return this.cmdLoad(arg);

      case '/help':
        return this.cmdHelp();

      default:
        return {
          type: 'error',
          message: `未知命令：${command}。输入 /help 查看可用命令。`,
        };
    }
  }

  /** 保存游戏 */
  saveGame(slot?: string): ReturnType<typeof saveGame> {
    return saveGame(this.state, slot);
  }

  /** 读取存档 */
  loadGame(slot?: string): ReturnType<typeof loadGame> {
    return loadGame(slot);
  }

  // ==================== 命令实现 ====================

  private cmdStatus(): CommandResult {
    return {
      type: 'narrative_append',
      message: `\n\n\`\`\`\n${buildStatusSummary(this.state)}\n\`\`\``,
    };
  }

  private cmdLook(): CommandResult {
    const location = getCurrentLocation(this.state);
    if (!location) {
      return { type: 'error', message: '当前位置信息丢失' };
    }

    const ctx = buildLocationContext(location);
    const connected = getConnectedLocations(this.state.world.currentLocationId);
    const exitNames = connected.map((l) => l.name).join('、');

    return {
      type: 'narrative_append',
      message: `\n\n## ${location.name}\n\n${location.description}\n\n${ctx}\n\n可移动至：${exitNames || '无'}`,
    };
  }

  private cmdInventory(): CommandResult {
    const { player, inventory } = this.state;
    const parts: string[] = ['\n\n## 背包'];

    // 灵石
    parts.push(`\n灵石：**${player.spiritStones}**`);

    // 装备栏
    parts.push('\n### 装备');
    const slotNames: Record<string, string> = {
      weapon: '武器',
      armor: '护甲',
      treasure: '法宝',
      accessory: '饰品',
    };
    for (const [slot, item] of Object.entries(player.equipment)) {
      const name = slotNames[slot] ?? slot;
      parts.push(`- ${name}：${item ? `${item.name}（${item.grade}）` : '无'}`);
    }

    // 功法
    if (player.techniques.length > 0) {
      parts.push('\n### 功法');
      for (const t of player.techniques) {
        const eq = t.equipped ? ' [已装备]' : '';
        parts.push(`- ${t.name}（${t.grade}）${eq}`);
      }
    }

    // 物品
    parts.push('\n### 物品');
    if (inventory.length === 0) {
      parts.push('（空）');
    } else {
      for (const item of inventory) {
        const qty = item.stackable ? ` x${item.quantity}` : '';
        parts.push(`- ${item.name}${qty} — ${item.description}`);
      }
    }

    // 灵宠
    if (this.state.pets.length > 0) {
      parts.push('\n### 灵宠');
      for (const pet of this.state.pets) {
        const active = pet.id === this.state.activePetId ? ' [出战]' : '';
        parts.push(
          `- ${pet.name}（${pet.species}，Lv.${pet.level}，进化${pet.evolutionStage}阶）${active}`
        );
      }
    }

    return { type: 'narrative_append', message: parts.join('\n') };
  }

  private cmdMove(target: string): CommandResult {
    if (!target) {
      const connected = getConnectedLocations(this.state.world.currentLocationId);
      const names = connected.map((l) => `- ${l.id}：${l.name}`).join('\n');
      return {
        type: 'narrative_append',
        message: `\n\n可前往的地点：\n${names}\n\n用法：/move <地点ID>`,
      };
    }

    // 尝试按 ID 查找
    let targetId = target;
    const byId = getLocationById(target);
    if (!byId) {
      // 尝试按名称模糊匹配
      const connected = getConnectedLocations(this.state.world.currentLocationId);
      const match = connected.find((l) => l.name.includes(target) || l.id.includes(target));
      if (match) {
        targetId = match.id;
      }
    }

    if (!canMoveTo(this.state.world.currentLocationId, targetId)) {
      const connected = getConnectedLocations(this.state.world.currentLocationId);
      const names = connected.map((l) => l.name).join('、');
      return {
        type: 'error',
        message: `无法前往 "${target}"。当前可前往：${names || '无'}`,
      };
    }

    const fromId = this.state.world.currentLocationId;
    this.applyEvents([Events.locationChange(fromId, targetId)]);

    const newLocation = getCurrentLocation(this.state);
    const locName = newLocation?.name ?? targetId;

    return {
      type: 'narrative_append',
      message: `\n\n*你前往了 **${locName}**。*`,
    };
  }

  private cmdSave(slotArg: string): CommandResult {
    const slot = slotArg || 'auto';
    const result = saveGame(this.state, slot);
    if (result.ok) {
      return {
        type: 'narrative_append',
        message: `\n\n*存档成功！（槽位：${slot}）*`,
      };
    }
    return { type: 'error', message: `存档失败：${result.error}` };
  }

  private cmdLoad(slotArg: string): CommandResult {
    const slot = slotArg || 'auto';
    const result = loadGame(slot);
    if (result.ok && result.state) {
      this.state = result.state;
      // 清空上下文，添加加载后的摘要
      this.contextManager.clear();
      this.contextManager.addUserMessage(
        `[游戏加载] 玩家「${this.state.player.name}」在${getLocationName(this.state.world.currentLocationId)}继续冒险。` +
          `当前状态：${buildStatusSummary(this.state)}`
      );
      // 重置累积文本
      this.accumulatedText = '';
      this.callbacks.onStateUpdate(this.state);
      return {
        type: 'narrative_append',
        message: `\n\n*读档成功！欢迎回来，${this.state.player.name}。*\n\n*当前位置：${getLocationName(this.state.world.currentLocationId)}*\n\n你可以输入 /look 查看周围环境。`,
      };
    }
    return { type: 'error', message: `读档失败：${result.error}` };
  }

  private cmdHelp(): CommandResult {
    return {
      type: 'narrative_append',
      message: `
## 命令列表

| 命令 | 说明 |
|------|------|
| /status | 查看完整角色状态 |
| /look | 观察当前位置 |
| /inventory | 查看背包和装备 |
| /move <地点> | 移动到相邻地点 |
| /save [槽位] | 保存游戏 |
| /load [槽位] | 读取存档 |
| /help | 显示此帮助 |
| /quit | 退出游戏 |

**自由输入示例**：
- 探索区域、采集灵草
- 与NPC交谈、交易物品
- 修炼功法、突破境界
- 进入战斗、使用物品
`,
    };
  }

  // ==================== LLM 循环 ====================

  private async runLLMCycle(): Promise<void> {
    const systemPrompt = buildSystemPrompt();
    const context = this.contextManager.buildContext(this.state, systemPrompt);
    const eventStream = this.llm.streamChat(context);
    await this.processStream(eventStream);

    // 检查是否有待处理决策
    if (this.state.narrative.pendingDecision) {
      this.callbacks.onProcessingEnd();
      this.callbacks.onDecisionRequired(this.state.narrative.pendingDecision);
    } else {
      this.finishTurn();
    }
  }

  private async processStream(eventStream: AssistantMessageEventStream): Promise<void> {
    for await (const event of eventStream) {
      switch (event.type) {
        case 'text_delta':
          this.accumulatedText += event.delta;
          this.callbacks.onNarrativeUpdate(this.accumulatedText);
          break;

        case 'toolcall_start':
          this.callbacks.onProcessingStart('天道响应中...');
          break;

        case 'toolcall_end': {
          const toolCall = event.toolCall as ToolCall;
          if (toolCall.name === 'emit_events') {
            try {
              const output = parseStreamResponse({
                role: 'assistant',
                content: [toolCall],
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
                stopReason: 'toolUse',
                timestamp: Date.now(),
              });

              if (output && output.events.length > 0) {
                this.applyEvents(output.events);
                // 用 narrative 事件的文本替换流式累积文本
                const narrativeText = output.events
                  .filter((e): e is GameEvent & { type: 'narrative' } => e.type === 'narrative')
                  .map((e) => e.text)
                  .join('\n\n');
                if (narrativeText) {
                  this.accumulatedText = narrativeText;
                  this.callbacks.onNarrativeUpdate(this.accumulatedText);
                }
              }
            } catch {
              // 解析失败时忽略，文本已在 text_delta 中显示
            }
          }
          break;
        }

        case 'done': {
          // 将助手回复摘要加入上下文
          if (this.accumulatedText) {
            this.contextManager.addUserMessage(
              `[系统] 上一轮叙事已展示。当前状态：${buildStatusSummary(this.state)}`
            );
          }
          return;
        }

        case 'error': {
          const errorMsg = event.error.errorMessage ?? 'LLM 调用失败';
          throw new Error(errorMsg);
        }

        default:
          // text_start, text_end, thinking_*, start 等事件不需要处理
          break;
      }
    }
  }

  // ==================== 内部辅助 ====================

  private applyEvents(events: GameEvent[]): void {
    this.state = applyEvents(this.state, events);
    this.callbacks.onStateUpdate(this.state);
  }

  private appendNarrative(text: string): void {
    this.accumulatedText += text;
    this.callbacks.onNarrativeUpdate(this.accumulatedText);
  }

  private finishTurn(): void {
    this._isProcessing = false;
    this.callbacks.onProcessingEnd();
  }
}
