#!/usr/bin/env node

// ============================================================
// 修仙 CLI 文字 RPG — 游戏入口
// pi-tui 终端界面 + LLM 集成
// ============================================================

import type { AssistantMessageEventStream, ToolCall } from '@mariozechner/pi-ai';
import {
  CancellableLoader,
  Editor,
  Markdown,
  ProcessTerminal,
  SelectList,
  Spacer,
  Text,
  TUI,
} from '@mariozechner/pi-tui';
import { applyEvents, createInitialState } from './game/state';
import type { GameEvent, GameState, PendingDecision } from './game/types';
import { GameLLMClient } from './llm/client';
import { ContextManager } from './llm/context-manager';
import {
  buildExplorationMessage,
  buildStatusSummary,
  buildSystemPrompt,
} from './llm/prompt-builder';
import { parseStreamResponse } from './llm/response-parser';

// ==================== ANSI 颜色工具 ====================

const CSI = '\x1b[';
const SGR = (n: number) => `${CSI}${n}m`;

const colors = {
  reset: SGR(0),
  bold: SGR(1),
  dim: SGR(2),
  cyan: SGR(36),
  green: SGR(32),
  yellow: SGR(33),
  red: SGR(31),
  magenta: SGR(35),
  blue: SGR(34),
  white: SGR(37),
  gray: SGR(90),
};

function style(text: string, code: string): string {
  return `${code}${text}${colors.reset}`;
}

// ==================== 主题定义 ====================

const markdownTheme = {
  heading: (text: string) => style(text, colors.bold + colors.yellow),
  link: (text: string) => style(text, colors.cyan),
  linkUrl: (text: string) => style(text, colors.dim),
  code: (text: string) => style(text, colors.green),
  codeBlock: (text: string) => text,
  codeBlockBorder: (text: string) => style(text, colors.dim),
  quote: (text: string) => style(text, colors.dim),
  quoteBorder: (text: string) => style(text, colors.dim),
  hr: (text: string) => style(text, colors.dim),
  listBullet: (text: string) => style(text, colors.cyan),
  bold: (text: string) => style(text, colors.bold),
  italic: (text: string) => style(text, colors.dim),
  strikethrough: (text: string) => style(text, colors.dim),
  underline: (text: string) => style(text, colors.bold),
};

const editorTheme = {
  borderColor: (str: string) => style(str, colors.cyan),
  selectList: {
    selectedPrefix: (text: string) => style(text, colors.cyan + colors.bold),
    selectedText: (text: string) => style(text, colors.bold),
    description: (text: string) => style(text, colors.dim),
    scrollInfo: (text: string) => style(text, colors.dim),
    noMatch: (text: string) => style(text, colors.red),
  },
};

const selectListTheme = {
  selectedPrefix: (text: string) => style(text, colors.yellow + colors.bold),
  selectedText: (text: string) => style(text, colors.bold + colors.white),
  description: (text: string) => style(text, colors.dim),
  scrollInfo: (text: string) => style(text, colors.dim),
  noMatch: (text: string) => style(text, colors.red),
};

// ==================== 状态栏构建 ====================

function buildStatusLine(state: GameState): string {
  const { player } = state;
  const realm = `${player.realm.name}${player.realm.subStage}`;
  const hpBar = buildBar(player.stats.hp, player.stats.maxHp, 10);
  const qiBar = buildBar(player.stats.qi, player.stats.maxQi, 8);
  return (
    style(' 修仙文字RPG ', colors.bold + colors.cyan + SGR(7)) +
    ` ${style(realm, colors.yellow)} | ` +
    `HP ${style(hpBar, colors.green)} ${player.stats.hp}/${player.stats.maxHp} | ` +
    `灵力 ${style(qiBar, colors.blue)} ${player.stats.qi}/${player.stats.maxQi} | ` +
    `灵石 ${style(String(player.spiritStones), colors.yellow)} | ` +
    `回合 ${state.meta.turn}`
  );
}

function buildBar(current: number, max: number, segments: number): string {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * segments);
  const empty = segments - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
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

特殊命令：**/status** 查看状态 | **/help** 帮助 | **/quit** 退出
`.trim();

// ==================== GameEngine ====================

class GameEngine {
  private state: GameState;
  private llm: GameLLMClient;
  private contextManager: ContextManager;
  private tui: TUI;

  // 组件引用
  private statusBar: Text;
  private narrativeView: Markdown;
  private editor: Editor;

  // 状态
  private accumulatedText = '';
  private isProcessing = false;

  constructor(apiKey?: string) {
    this.state = createInitialState('无名散修', 'normal');
    this.llm = new GameLLMClient(apiKey);
    this.contextManager = new ContextManager();

    // 初始化 TUI
    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);

    // 状态栏（使用 Text 组件，支持 setText 更新）
    this.statusBar = new Text(buildStatusLine(this.state), 0, 0);

    // 叙事区
    this.narrativeView = new Markdown(WELCOME_TEXT, 1, 1, markdownTheme);

    // 输入区
    this.editor = new Editor(this.tui, editorTheme, { paddingX: 1 });
    this.editor.onSubmit = (text: string) => {
      void this.handleUserInput(text);
    };

    // 组装布局
    this.tui.addChild(this.statusBar);
    this.tui.addChild(new Spacer());
    this.tui.addChild(this.narrativeView);
    this.tui.addChild(new Spacer());
    this.tui.addChild(this.editor);
    this.tui.setFocus(this.editor);

    // 添加初始系统消息
    this.contextManager.addUserMessage(
      `[游戏开始] 玩家「${this.state.player.name}」进入苍梧山脉修仙世界。` +
        `境界：${this.state.player.realm.name}${this.state.player.realm.subStage}。` +
        `位置：苍梧城。作为DM，请向玩家描述当前场景并引导游戏。`
    );
  }

  /** 启动游戏 */
  start(): void {
    this.tui.start();
  }

  /** 停止游戏 */
  stop(): void {
    this.tui.stop();
    process.exit(0);
  }

  /** 处理用户输入 */
  private async handleUserInput(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 特殊命令处理
    if (trimmed.startsWith('/')) {
      this.handleCommand(trimmed);
      this.editor.setText('');
      return;
    }

    if (this.isProcessing) return;

    // 开始处理
    this.isProcessing = true;
    this.editor.disableSubmit = true;
    this.accumulatedText = '';
    this.editor.setText('');

    // 显示加载动画
    const loader = new CancellableLoader(
      this.tui,
      (str) => style(str, colors.yellow),
      (str) => style(str, colors.dim),
      '灵气凝聚中...'
    );
    loader.onAbort = () => {
      this.llm.abort();
    };
    const overlayHandle = this.tui.showOverlay(loader);
    this.tui.requestRender();

    try {
      // 将用户输入加入上下文
      const explorationMsg = buildExplorationMessage(this.state, trimmed);
      this.contextManager.addUserMessage(explorationMsg);

      // 构建 Context
      const systemPrompt = buildSystemPrompt();
      const context = this.contextManager.buildContext(this.state, systemPrompt);

      // 流式调用 LLM
      const eventStream = this.llm.streamChat(context);
      await this.processStream(eventStream, loader);

      // 隐藏加载器
      overlayHandle.hide();
      this.tui.requestRender();

      // 检查是否有待处理决策
      if (this.state.narrative.pendingDecision) {
        this.showDecisionOverlay(this.state.narrative.pendingDecision);
      } else {
        this.finishTurn();
      }
    } catch (err) {
      overlayHandle.hide();
      this.tui.requestRender();

      const errorMsg = err instanceof Error ? err.message : '未知错误';
      this.appendNarrative(`\n\n*（系统：${errorMsg}）*`);
      this.finishTurn();
    }
  }

  /** 处理 LLM 事件流（for await...of 异步迭代） */
  private async processStream(
    eventStream: AssistantMessageEventStream,
    loader: CancellableLoader
  ): Promise<void> {
    for await (const event of eventStream) {
      switch (event.type) {
        case 'text_delta':
          this.accumulatedText += event.delta;
          this.narrativeView.setText(this.accumulatedText);
          this.tui.requestRender();
          break;

        case 'toolcall_start':
          loader.setMessage('天道响应中...');
          this.tui.requestRender();
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
                this.state = applyEvents(this.state, output.events);
                // 更新叙事显示为 narrative 事件的文本
                const narrativeText = output.events
                  .filter((e): e is GameEvent & { type: 'narrative' } => e.type === 'narrative')
                  .map((e) => e.text)
                  .join('\n\n');
                if (narrativeText) {
                  this.accumulatedText = narrativeText;
                  this.narrativeView.setText(this.accumulatedText);
                  this.tui.requestRender();
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

  /** 显示决策覆盖层 */
  private showDecisionOverlay(decision: PendingDecision): void {
    if (decision.type === 'menu' && decision.choices && decision.choices.length > 0) {
      const items = decision.choices.map((c) => ({
        value: c.id,
        label: c.label,
        description: c.description,
      }));

      const selectList = new SelectList(items, Math.min(items.length, 8), selectListTheme);

      selectList.onSelect = (item) => {
        this.tui.hideOverlay();
        this.tui.requestRender();

        // 将选择作为用户输入继续循环
        this.contextManager.addUserMessage(`[玩家选择] ${item.label}`);
        this.state = applyEvents(this.state, [
          {
            type: 'decision_resolved',
            choiceId: item.value,
          },
        ]);

        // 继续 LLM 循环
        void this.continueAfterDecision();
      };

      selectList.onCancel = () => {
        this.tui.hideOverlay();
        this.tui.requestRender();
        this.finishTurn();
      };

      // 在覆盖层中显示提示
      const promptText = decision.prompt;
      this.appendNarrative(`\n\n*${promptText}*`);
      this.tui.showOverlay(selectList, {
        width: '70%',
        minWidth: 30,
        anchor: 'center',
      });
      this.tui.requestRender();
    } else {
      // free_text 决策：直接完成回合
      this.finishTurn();
    }
  }

  /** 决策后继续 LLM 循环 */
  private async continueAfterDecision(): Promise<void> {
    this.isProcessing = true;
    this.editor.disableSubmit = true;
    this.accumulatedText = '';

    const loader = new CancellableLoader(
      this.tui,
      (str) => style(str, colors.yellow),
      (str) => style(str, colors.dim),
      '天道推演中...'
    );
    loader.onAbort = () => this.llm.abort();
    this.tui.showOverlay(loader);
    this.tui.requestRender();

    try {
      const systemPrompt = buildSystemPrompt();
      const context = this.contextManager.buildContext(this.state, systemPrompt);
      const eventStream = this.llm.streamChat(context);
      await this.processStream(eventStream, loader);

      this.tui.hideOverlay();
      this.tui.requestRender();

      if (this.state.narrative.pendingDecision) {
        this.showDecisionOverlay(this.state.narrative.pendingDecision);
      } else {
        this.finishTurn();
      }
    } catch (err) {
      this.tui.hideOverlay();
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      this.appendNarrative(`\n\n*（系统：${errorMsg}）*`);
      this.finishTurn();
    }
  }

  /** 完成一个回合 */
  private finishTurn(): void {
    this.isProcessing = false;
    this.editor.disableSubmit = false;
    this.statusBar.setText(buildStatusLine(this.state));
    this.tui.setFocus(this.editor);
    this.tui.requestRender();
  }

  /** 追加叙事文本 */
  private appendNarrative(text: string): void {
    this.accumulatedText += text;
    this.narrativeView.setText(this.accumulatedText);
  }

  /** 处理特殊命令 */
  private handleCommand(command: string): void {
    switch (command) {
      case '/status':
        this.accumulatedText += `\n\n\`\`\`\n${buildStatusSummary(this.state)}\n\`\`\``;
        this.narrativeView.setText(this.accumulatedText);
        this.tui.requestRender();
        break;

      case '/help':
        this.accumulatedText += `
## 命令列表

| 命令 | 说明 |
|------|------|
| /status | 查看完整角色状态 |
| /help | 显示此帮助 |
| /quit | 退出游戏 |

**自由输入示例**：
- 探索区域、采集灵草
- 与NPC交谈、交易物品
- 修炼功法、突破境界
- 进入战斗、使用物品
`;
        this.narrativeView.setText(this.accumulatedText);
        this.tui.requestRender();
        break;

      case '/quit':
        this.stop();
        break;

      default:
        this.accumulatedText += `\n\n*未知命令：${command}。输入 /help 查看可用命令。*`;
        this.narrativeView.setText(this.accumulatedText);
        this.tui.requestRender();
    }
  }
}

// ==================== 入口 ====================

async function main(): Promise<void> {
  try {
    const engine = new GameEngine();
    engine.start();
  } catch (err) {
    const message = err instanceof Error ? err.message : '启动失败';
    console.error(`启动失败：${message}`);
    console.error('请确保已设置 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
  }
}

void main();
