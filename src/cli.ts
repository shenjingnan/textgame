#!/usr/bin/env node

// ============================================================
// 修仙 CLI 文字 RPG — 游戏入口
// TUI 渲染层，纯 UI 逻辑，游戏逻辑委托给 GameEngine
// ============================================================

import {
  CancellableLoader,
  Editor,
  Markdown,
  ProcessTerminal,
  SelectList,
  Text,
  TUI,
} from '@mariozechner/pi-tui';
import type { EngineCallbacks } from './game/engine';
import { GameEngine } from './game/engine';
import type { CombatState, GameState, PendingDecision } from './game/types';
import { colors, editorTheme, markdownTheme, SGR, selectListTheme, style } from './ui/theme';

// ==================== 状态栏构建 ====================

function buildStatusLine(state: GameState): string {
  const { player } = state;
  const realm = `${player.realm.name}${player.realm.subStage}`;
  const hpBar = buildBar(player.stats.hp, player.stats.maxHp, 10);
  const qiBar = buildBar(player.stats.qi, player.stats.maxQi, 8);
  const cultBar = buildBar(player.realm.cultivation, 100, 8);
  return (
    style(' 修仙文字RPG ', colors.bold + colors.cyan + SGR(7)) +
    ` ${style(realm, colors.yellow)} | ` +
    `修炼 ${style(cultBar, colors.magenta)} ${player.realm.cultivation}% | ` +
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

function buildCombatPanel(combat: CombatState): string {
  const { enemy, turn, log } = combat;
  const enemyHpBar = buildBar(enemy.stats.hp, enemy.stats.maxHp, 20);
  const playerHpRatio = Math.round((enemy.stats.hp / enemy.stats.maxHp) * 100);
  const recentLog = log.slice(-3);

  return [
    style(` ═══ 第 ${turn} 回合 ═══`, colors.bold + colors.yellow),
    '',
    `${style('敌方', colors.red + colors.bold)} ${enemy.name} ${style(`${enemy.realm.name}${enemy.realm.subStage}`, colors.dim)}`,
    `HP ${enemyHpBar} ${enemy.stats.hp}/${enemy.stats.maxHp} (${playerHpRatio}%)`,
    '',
    ...recentLog.map((l) => style(` ${l}`, colors.dim)),
  ].join('\n');
}

// ==================== TuiGameRunner ====================

const MAX_NARRATIVE_CHARS = 10000;

class TuiGameRunner {
  private engine: GameEngine;
  private tui: TUI;

  // 组件引用
  private statusBar: Text;
  private narrativeView: Markdown;
  private combatPanel: Text;
  private editor: Editor;

  // 叙事文本追踪（用于命令追加，带滑动窗口截断）
  private narrativeText = '';

  // 加载器
  private loaderOverlay: ReturnType<TUI['showOverlay']> | null = null;

  constructor(apiKey?: string) {
    // 初始化 TUI
    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);

    // 状态栏
    this.statusBar = new Text('', 0, 0);

    // 叙事区
    this.narrativeView = new Markdown('', 1, 1, markdownTheme);

    // 战斗面板（默认空白）
    this.combatPanel = new Text('', 0, 0);

    // 输入区
    this.editor = new Editor(this.tui, editorTheme, { paddingX: 1 });
    this.editor.onSubmit = (text: string) => {
      void this.handleInput(text);
    };

    // 组装布局（使用分隔线替代空 Spacer）
    this.tui.addChild(this.statusBar);
    this.tui.addChild(new Text(style('─'.repeat(80), colors.dim), 0, 0));
    this.tui.addChild(this.narrativeView);
    this.tui.addChild(new Text(style('─'.repeat(80), colors.dim), 0, 0));
    this.tui.addChild(this.combatPanel);
    this.tui.addChild(new Text(style('─'.repeat(80), colors.dim), 0, 0));
    this.tui.addChild(this.editor);
    this.tui.setFocus(this.editor);

    // 创建引擎回调
    const callbacks: EngineCallbacks = {
      onNarrativeUpdate: (text: string) => {
        this.narrativeText = text;
        this.narrativeView.setText(text);
        this.tui.requestRender();
      },

      onStateUpdate: (state: GameState) => {
        this.statusBar.setText(buildStatusLine(state));
        // 战斗面板更新
        if (state.combat?.active) {
          this.combatPanel.setText(buildCombatPanel(state.combat));
        } else {
          this.combatPanel.setText('');
        }
        this.tui.requestRender();
      },

      onDecisionRequired: (decision: PendingDecision) => {
        this.showDecisionOverlay(decision);
      },

      onProcessingStart: (message: string) => {
        this.showLoader(message);
      },

      onProcessingEnd: () => {
        this.hideLoader();
        this.editor.disableSubmit = false;
        this.tui.setFocus(this.editor);
        this.tui.requestRender();
      },

      onError: (message: string) => {
        this.hideLoader();
        this.appendNarrative(`\n\n*（系统错误：${message}）*`);
        this.tui.requestRender();
      },

      onGameOver: (reason: string) => {
        this.hideLoader();
        this.tui.stop();
        console.log(`游戏结束：${reason}`);
        process.exit(0);
      },
    };

    this.engine = new GameEngine(callbacks, apiKey);

    // 显示欢迎文本
    this.narrativeText = this.engine.getWelcomeText();
    this.narrativeView.setText(this.narrativeText);
    this.statusBar.setText(buildStatusLine(this.engine.getState()));
    this.tui.requestRender();

    // 启动角色创建流程
    this.engine.startCharacterCreation();
  }

  /** 启动游戏 */
  start(): void {
    this.tui.start();
  }

  /** 追加叙事文本，带滑动窗口截断 */
  private appendNarrative(text: string): void {
    this.narrativeText += text;
    if (this.narrativeText.length > MAX_NARRATIVE_CHARS) {
      const cutoff = this.narrativeText.length - MAX_NARRATIVE_CHARS;
      // 找到 cutoff 之后的第一个换行，避免截断行内文字
      const nextLine = this.narrativeText.indexOf('\n', cutoff);
      const start = nextLine > cutoff ? nextLine + 1 : cutoff;
      this.narrativeText = '...（早期叙事已省略）\n\n' + this.narrativeText.slice(start);
    }
    this.narrativeView.setText(this.narrativeText);
  }

  /** 处理用户输入 */
  private async handleInput(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // /quit 在 TUI 层直接处理
    if (trimmed === '/quit') {
      this.tui.stop();
      process.exit(0);
      return;
    }

    // 特殊命令：本地执行，不经过 LLM
    if (trimmed.startsWith('/')) {
      this.editor.setText('');
      const result = this.engine.executeCommand(trimmed);

      if (result.type === 'narrative_append') {
        this.appendNarrative(result.message);
      } else if (result.type === 'state_change') {
        this.statusBar.setText(buildStatusLine(this.engine.getState()));
        this.narrativeText = result.message;
        this.narrativeView.setText(this.narrativeText);
      } else if (result.type === 'error') {
        this.appendNarrative(`\n\n*${result.message}*`);
      }
      this.tui.requestRender();
      return;
    }

    if (this.engine.isProcessing) return;

    this.editor.disableSubmit = true;
    this.editor.setText('');

    try {
      await this.engine.processInput(trimmed);
    } catch {
      // 错误已由 onError 回调处理
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

        // 将选择交给引擎处理
        void this.engine.handleDecision(item.value, item.label);
      };

      selectList.onCancel = () => {
        this.tui.hideOverlay();
        this.tui.requestRender();
        this.editor.disableSubmit = false;
        this.tui.setFocus(this.editor);
        this.tui.requestRender();
      };

      // 在叙事中追加提示文本
      this.appendNarrative(`\n\n*${decision.prompt}*`);

      this.tui.showOverlay(selectList, {
        width: '70%',
        minWidth: 30,
        anchor: 'center',
      });
      this.tui.requestRender();
    } else {
      // free_text 决策：直接完成回合
      this.editor.disableSubmit = false;
      this.tui.setFocus(this.editor);
      this.tui.requestRender();
    }
  }

  /** 显示加载动画 */
  private showLoader(message: string): void {
    const loader = new CancellableLoader(
      this.tui,
      (str) => style(str, colors.yellow),
      (str) => style(str, colors.dim),
      message
    );
    loader.onAbort = () => {
      this.engine.abort();
    };
    this.loaderOverlay = this.tui.showOverlay(loader);
    this.tui.requestRender();
  }

  /** 隐藏加载动画 */
  private hideLoader(): void {
    if (this.loaderOverlay) {
      this.loaderOverlay.hide();
      this.loaderOverlay = null;
    }
    this.tui.requestRender();
  }
}

// ==================== 入口 ====================

async function main(): Promise<void> {
  try {
    const runner = new TuiGameRunner();
    runner.start();
  } catch (err) {
    const message = err instanceof Error ? err.message : '启动失败';
    console.error(`启动失败：${message}`);
    console.error('请确保已设置 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
  }
}

void main();
