// ============================================================
// 游戏循环编排器 — 纯逻辑，与 TUI 解耦
// ============================================================

import type { AssistantMessageEventStream, ToolCall } from '@mariozechner/pi-ai';
import {
  canFlee,
  canPetAssist,
  getUsableCombatItems,
  processRound,
} from '../combat/combat-manager';
import { quickResolve } from '../combat/combat-resolver';
import { getEnemyById } from '../combat/enemy-data';
import * as EquipmentService from '../inventory/equipment-service';
import * as ItemService from '../inventory/item-service';
import * as ShopService from '../inventory/shop-service';
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
  attemptPetEvolution,
  feedPet,
  getActivePet,
  getAvailablePetSkills,
  getPetByQuery,
  interactWithPet,
} from '../pet/pet-service';
import type { PlayerOrigin, PlayerTalent } from '../player/player';
import {
  buildConfirmDecision,
  buildNameDecision,
  buildOriginDecision,
  buildTalentDecision,
  createCharacter,
  getOriginById,
  getTalentById,
} from '../player/player';
import {
  attemptBreakthrough,
  canAttemptBreakthrough,
  performCultivation,
  resolveTribulation,
} from '../player/realm';
import { decodeArchive, encodeArchive } from '../save/archive-code';
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
**/move <地点>** 移动 | **/equip <物品>** 装备 | **/use <物品>** 使用
**/pet** 灵宠 | **/shop** 商店 | **/buy <物品>** 购买 | **/sell <物品>** 出售
**/save** 存档 | **/load** 读档 | **/help** 帮助 | **/quit** 退出
`.trim();

// ==================== GameEngine ====================

type CreationStep = 'origin' | 'talent' | 'name' | 'confirm' | 'done';

export class GameEngine {
  private static COMMANDS: Array<{ cmd: string; args: string; desc: string }> = [
    { cmd: '/status', args: '', desc: '查看完整角色状态' },
    { cmd: '/look', args: '', desc: '观察当前位置' },
    { cmd: '/inventory', args: '', desc: '查看背包和装备' },
    { cmd: '/move', args: '<地点>', desc: '移动到相邻地点' },
    { cmd: '/cultivate', args: '[回合]', desc: '主动修炼（默认1周天，最多10）' },
    { cmd: '/equip', args: '<物品>', desc: '装备武器/护甲/法宝/饰品' },
    { cmd: '/unequip', args: '<槽位>', desc: '卸下装备（weapon/armor/treasure/accessory）' },
    { cmd: '/use', args: '<物品>', desc: '使用消耗品' },
    { cmd: '/shop', args: '', desc: '查看当前地点商人商品' },
    { cmd: '/buy', args: '<物品> [数量]', desc: '从商人处购买物品' },
    { cmd: '/sell', args: '<物品> [数量]', desc: '向商人出售物品' },
    { cmd: '/repair', args: '<槽位>', desc: '消耗灵石修理损坏的装备' },
    { cmd: '/techniques', args: '', desc: '查看已学功法' },
    { cmd: '/pet', args: '[list/feed/interact/evolve]', desc: '管理灵宠' },
    { cmd: '/save', args: '[槽位]', desc: '保存游戏' },
    { cmd: '/load', args: '[槽位]', desc: '读取存档' },
    { cmd: '/export-save', args: '', desc: '导出存档码（可复制分享）' },
    { cmd: '/import-save', args: '<存档码>', desc: '从存档码导入游戏' },
    { cmd: '/help', args: '', desc: '显示此帮助' },
    { cmd: '/quit', args: '', desc: '退出游戏' },
  ];

  private state: GameState;
  private llm: GameLLMClient;
  private contextManager: ContextManager;
  private callbacks: EngineCallbacks;

  private accumulatedText = '';
  private _isProcessing = false;

  // 角色创建追踪
  private creationState: {
    step: CreationStep;
    origin: PlayerOrigin | null;
    talent: PlayerTalent | null;
    name: string;
  } | null = null;

  constructor(callbacks: EngineCallbacks, apiKey?: string) {
    this.callbacks = callbacks;
    this.state = createInitialState('无名散修', 'normal', CANGWU_MOUNTAINS);
    this.llm = new GameLLMClient(apiKey);
    this.contextManager = new ContextManager();
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

  /** 开始角色创建流程 */
  startCharacterCreation(): void {
    this.creationState = { step: 'origin', origin: null, talent: null, name: '' };
    const decision = buildOriginDecision();
    this.callbacks.onDecisionRequired(decision);
  }

  /** 是否正在角色创建中 */
  isInCharacterCreation(): boolean {
    return this.creationState !== null && this.creationState.step !== 'done';
  }

  /** 处理玩家自由输入 */
  async processInput(text: string): Promise<void> {
    if (this._isProcessing) return;

    // 角色创建中的名称输入
    if (this.isInCharacterCreation() && this.creationState?.step === 'name') {
      this.processNameInput(text);
      return;
    }

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
    // 角色创建分支
    if (this.isInCharacterCreation()) {
      await this.handleCreationDecision(choiceId, choiceLabel);
      return;
    }

    // 突破判定分支
    if (this.state.meta.phase === 'breakthrough') {
      this.handleBreakthroughDecision(choiceId);
      return;
    }

    // 战斗分支
    if (this.state.meta.phase === 'combat') {
      this.handleCombatAction(choiceId);
      return;
    }

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

      case '/cultivate':
        return this.cmdCultivate(arg);

      case '/equip':
        return this.cmdEquip(arg);

      case '/unequip':
        return this.cmdUnequip(arg);

      case '/use':
        return this.cmdUse(arg);

      case '/shop':
        return this.cmdShop();

      case '/buy':
        return this.cmdBuy(arg);

      case '/sell':
        return this.cmdSell(arg);

      case '/repair':
        return this.cmdRepair(arg);

      case '/pet':
        return this.cmdPet(arg);

      case '/save':
        return this.cmdSave(arg);

      case '/load':
        return this.cmdLoad(arg);

      case '/export-save':
        return this.cmdExportSave();

      case '/import-save':
        return this.cmdImportSave(arg);

      case '/techniques':
        return this.cmdTechniques();

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
    const s = this.state.player;
    const realm = `${s.realm.name}${s.realm.subStage}`;
    const location = getLocationName(this.state.world.currentLocationId);
    const equipped =
      Object.entries(s.equipment)
        .filter(([, eq]) => eq)
        .map(([, eq]) => `${eq!.name}(${eq!.grade})`)
        .join('、') || '无';
    const petNames = this.state.pets.map((p) => `${p.name}(${p.species})`).join('、') || '无';

    return {
      type: 'narrative_append',
      message:
        `\n\n## 角色状态\n\n` +
        `| 属性 | 数值 |\n|------|------|\n` +
        `| 道号 | ${s.name} |\n` +
        `| 称号 | ${s.title} |\n` +
        `| 境界 | ${realm} |\n` +
        `| 位置 | ${location} |\n` +
        `| 生命 | ${s.stats.hp}/${s.stats.maxHp} |\n` +
        `| 灵力 | ${s.stats.qi}/${s.stats.maxQi} |\n` +
        `| 体力 | ${s.stats.stamina}/${s.stats.maxStamina} |\n` +
        `| 意志 | ${s.stats.willpower} |\n` +
        `| 灵石 | ${s.spiritStones} |\n` +
        `| 修炼进度 | ${s.realm.cultivation}% |\n` +
        `| 回合 | ${this.state.meta.turn} |\n` +
        `| 阵营 | ${s.faction || '无'} |\n` +
        `| 已装备 | ${equipped} |\n` +
        `| 灵宠 | ${petNames} |`,
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
      if (item) {
        const durText = ` 耐久: ${item.durability}/${item.maxDurability}`;
        const brokenTag = item.durability <= 0 ? ' **[已损坏]**' : '';
        const statsText = item.stats
          ? Object.entries(item.stats)
              .filter(([, v]) => v && v > 0)
              .map(([k, v]) => `${k}+${v}`)
              .join(' ')
          : '';
        parts.push(
          `- ${name}：${item.name}（${item.grade}）${durText}${brokenTag}\n  属性: ${statsText || '无'}`
        );
      } else {
        parts.push(`- ${name}：无`);
      }
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
        const equipTag = item.type === 'equipment' ? ' `[可装备]`' : '';
        const durInfo =
          item.type === 'equipment' && item.durability !== undefined
            ? ` [耐久:${item.durability}/${item.maxDurability}]`
            : '';
        parts.push(`- ${item.name}${qty}${equipTag}${durInfo} — ${item.description}`);
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

  private cmdCultivate(roundsArg: string): CommandResult {
    const rounds = parseInt(roundsArg, 10) || 1;
    const events = performCultivation(this.state, rounds);
    this.applyEvents(events);

    const narrativeText = events
      .filter((e) => e.type === 'narrative')
      .map((e) => (e as { text: string }).text)
      .join('\n');

    const cult = Math.round(this.state.player.realm.cultivation);
    return {
      type: 'narrative_append',
      message: `\n\n${narrativeText}\n\n\`\`\`\n修炼进度: ${cult}%\n\`\`\``,
    };
  }

  // ---- Phase 6: 装备/物品/交易命令 ----

  private cmdEquip(arg: string): CommandResult {
    if (!arg) {
      const equippable = EquipmentService.getEquippableItems(this.state);
      if (equippable.length === 0) {
        return { type: 'error', message: '背包中没有可装备的物品。' };
      }
      const list = equippable.map((e) => `- ${e.name} → ${slotNameCn(e.slot)}`).join('\n');
      return {
        type: 'narrative_append',
        message: `\n\n可装备的物品：\n${list}\n\n用法：/equip <物品名称>`,
      };
    }

    const result = EquipmentService.equipItem(this.state, arg);
    if (result.error) {
      return { type: 'error', message: result.error };
    }
    this.applyEvents(result.events);
    return { type: 'narrative_append', message: `\n\n*装备成功！*` };
  }

  private cmdUnequip(arg: string): CommandResult {
    if (!arg) {
      return {
        type: 'error',
        message:
          '请指定要卸下的槽位：weapon（武器）/ armor（护甲）/ treasure（法宝）/ accessory（饰品）',
      };
    }
    const result = EquipmentService.unequipItem(this.state, arg);
    if (result.error) {
      return { type: 'error', message: result.error };
    }
    this.applyEvents(result.events);
    return { type: 'narrative_append', message: `\n\n*已卸下装备。*` };
  }

  private cmdUse(arg: string): CommandResult {
    if (!arg) {
      return { type: 'error', message: '请指定要使用的物品名称。用法：/use <物品名称>' };
    }
    const result = ItemService.useItem(this.state, arg);
    if (result.error) {
      return { type: 'error', message: result.error };
    }
    this.applyEvents(result.events);
    const narrative = result.events
      .filter((e) => e.type === 'narrative')
      .map((e) => (e as { text: string }).text)
      .join('\n');
    return { type: 'narrative_append', message: `\n\n${narrative}` };
  }

  private cmdShop(): CommandResult {
    const merchants = ShopService.getMerchantNpcs(this.state);
    if (merchants.length === 0) {
      return { type: 'error', message: '当前位置没有商人。' };
    }

    const parts: string[] = ['\n\n## 商店'];
    for (const npc of merchants) {
      parts.push(`\n### ${npc.name}（${npc.attitude === 'friendly' ? '友好' : '中立'}）`);
      const items = ShopService.getShopItems(this.state, npc.id);
      if (items.length === 0) {
        parts.push('（暂无商品）');
      } else {
        for (const item of items) {
          const buyPrice = ShopService.calculateBuyPrice(item, npc.attitude);
          parts.push(`- ${item.name} — ${buyPrice} 灵石 — ${item.description}`);
        }
      }
      parts.push(`\n用法：/buy <物品名称> [数量] | /sell <物品名称> [数量]`);
    }

    return { type: 'narrative_append', message: parts.join('\n') };
  }

  private cmdBuy(arg: string): CommandResult {
    if (!arg) {
      return { type: 'error', message: '请指定要购买的物品。用法：/buy <物品名称> [数量]' };
    }

    const parts = arg.split(/\s+/);
    const qty = parts.length > 1 ? parseInt(parts[1]!, 10) || 1 : 1;
    const itemName = parts[0]!;

    const merchants = ShopService.getMerchantNpcs(this.state);
    if (merchants.length === 0) {
      return { type: 'error', message: '当前位置没有商人。' };
    }

    for (const npc of merchants) {
      const result = ShopService.buyItem(this.state, npc.id, itemName, qty);
      if (!result.error) {
        this.applyEvents(result.events);
        const narrative = result.events
          .filter((e) => e.type === 'narrative')
          .map((e) => (e as { text: string }).text)
          .join('\n');
        return { type: 'narrative_append', message: `\n\n${narrative}` };
      }
      if (result.error.includes('不是商人') || result.error.includes('找不到商人')) {
        continue;
      }
      return { type: 'error', message: result.error };
    }

    return { type: 'error', message: `当前位置的商人不出售 "${itemName}"。` };
  }

  private cmdSell(arg: string): CommandResult {
    if (!arg) {
      return { type: 'error', message: '请指定要出售的物品。用法：/sell <物品名称> [数量]' };
    }

    const parts = arg.split(/\s+/);
    const qty = parts.length > 1 ? parseInt(parts[1]!, 10) || 1 : 1;
    const itemName = parts[0]!;

    const merchants = ShopService.getMerchantNpcs(this.state);
    if (merchants.length === 0) {
      return { type: 'error', message: '当前位置没有商人。' };
    }

    for (const npc of merchants) {
      const result = ShopService.sellItem(this.state, npc.id, itemName, qty);
      if (!result.error) {
        this.applyEvents(result.events);
        const narrative = result.events
          .filter((e) => e.type === 'narrative')
          .map((e) => (e as { text: string }).text)
          .join('\n');
        return { type: 'narrative_append', message: `\n\n${narrative}` };
      }
      if (result.error.includes('不是商人') || result.error.includes('找不到商人')) {
        continue;
      }
      return { type: 'error', message: result.error };
    }

    return { type: 'error', message: '出售失败。请使用 /shop 查看商人。' };
  }

  private cmdRepair(arg: string): CommandResult {
    if (!arg) {
      return {
        type: 'error',
        message: '请指定要修理的装备槽位：weapon / armor / treasure / accessory',
      };
    }
    const result = EquipmentService.repairEquipment(this.state, arg);
    if (result.error) {
      return { type: 'error', message: result.error };
    }
    this.applyEvents(result.events);
    const narrative = result.events
      .filter((e) => e.type === 'narrative')
      .map((e) => (e as { text: string }).text)
      .join('\n');
    return { type: 'narrative_append', message: `\n\n${narrative}` };
  }

  // ---- 灵宠 ----

  private cmdPet(arg: string): CommandResult {
    const parts = arg.split(/\s+/);
    const subCmd = parts[0]?.toLowerCase();
    const subArg = parts.slice(1).join(' ');

    if (!subCmd) {
      return this.cmdPetDetail();
    }

    switch (subCmd) {
      case 'list':
        return this.cmdPetList();
      case 'feed':
        return this.cmdPetFeed(subArg);
      case 'interact':
        return this.cmdPetInteract();
      case 'activate':
        return this.cmdPetActivate(subArg);
      case 'release':
        return this.cmdPetRelease(subArg);
      case 'evolve':
        return this.cmdPetEvolve();
      default:
        // 尝试作为宠物名称/ID 查询
        return this.cmdPetDetail(subCmd);
    }
  }

  private cmdPetDetail(query?: string): CommandResult {
    const pet = query ? getPetByQuery(this.state, query) : getActivePet(this.state);
    if (!pet) {
      return {
        type: 'error',
        message: query
          ? `找不到名为 "${query}" 的灵宠。`
          : '你还没有出战灵宠。使用 /pet list 查看所有灵宠，/pet activate <名称> 切换出战。',
      };
    }

    const pathLabel =
      pet.evolutionPath === 'divine' ? '神圣' : pet.evolutionPath === 'demonic' ? '魔化' : '普通';
    const activeTag = pet.id === this.state.activePetId ? ' [出战]' : '';
    const availableSkills = getAvailablePetSkills(pet);

    const parts: string[] = [
      `\n\n## ${pet.name}（${pet.species}）${activeTag}`,
      '',
      `| 属性 | 数值 |`,
      `|------|------|`,
      `| 等级 | ${pet.level} |`,
      `| 生命 | ${pet.stats.hp}/${pet.stats.maxHp} |`,
      `| 攻击 | ${pet.stats.attack} |`,
      `| 防御 | ${pet.stats.defense} |`,
      `| 速度 | ${pet.stats.speed} |`,
      `| 忠诚 | ${pet.loyalty}/100 |`,
      `| 进化 | ${pet.evolutionStage}阶 · ${pathLabel}路线 |`,
      '',
      `**技能**：`,
    ];

    for (const skill of pet.skills) {
      const cdText =
        skill.currentCooldown > 0
          ? ` （冷却中：${skill.currentCooldown}/${skill.cooldown}）`
          : ' （可用）';
      parts.push(`- **${skill.name}**：${skill.description}${cdText}`);
    }

    if (availableSkills.length > 0) {
      parts.push('', `可使用的技能：${availableSkills.map((s) => s.name).join('、')}`);
    }

    parts.push('', `*${pet.description}*`);

    return { type: 'narrative_append', message: parts.join('\n') };
  }

  private cmdPetList(): CommandResult {
    if (this.state.pets.length === 0) {
      return { type: 'narrative_append', message: '\n\n你还没有任何灵宠。' };
    }

    const parts: string[] = ['\n\n## 灵宠列表', ''];

    for (const pet of this.state.pets) {
      const activeTag = pet.id === this.state.activePetId ? ' **[出战]**' : '';
      const hpRatio = Math.round((pet.stats.hp / pet.stats.maxHp) * 100);
      parts.push(
        `- **${pet.name}**（${pet.species}）Lv.${pet.level} 进化${pet.evolutionStage}阶${activeTag}`
      );
      parts.push(
        `  HP:${hpRatio}% | 攻:${pet.stats.attack} 防:${pet.stats.defense} 速:${pet.stats.speed} | 忠诚:${pet.loyalty}`
      );
    }

    parts.push(
      '',
      '使用 `/pet <名称>` 查看详情 | `/pet activate <名称>` 切换出战 | `/pet feed <物品>` 喂养 | `/pet interact` 互动'
    );

    return { type: 'narrative_append', message: parts.join('\n') };
  }

  private cmdPetFeed(itemArg: string): CommandResult {
    if (!itemArg) {
      return {
        type: 'error',
        message: '请指定要喂食的物品。用法：/pet feed <物品名称>',
      };
    }

    const activePet = getActivePet(this.state);
    if (!activePet) {
      return { type: 'error', message: '你没有出战灵宠。' };
    }

    const result = feedPet(this.state, activePet.id, itemArg);
    if (result.error) {
      return { type: 'error', message: result.error };
    }

    this.applyEvents(result.events);
    const narrative = result.events
      .filter((e) => e.type === 'narrative')
      .map((e) => (e as { text: string }).text)
      .join('\n');
    return { type: 'narrative_append', message: `\n\n${narrative}` };
  }

  private cmdPetInteract(): CommandResult {
    const activePet = getActivePet(this.state);
    if (!activePet) {
      return { type: 'error', message: '你没有出战灵宠。' };
    }

    const result = interactWithPet(this.state, activePet.id);
    if (result.error) {
      return { type: 'error', message: result.error };
    }

    this.applyEvents(result.events);
    const narrative = result.events
      .filter((e) => e.type === 'narrative')
      .map((e) => (e as { text: string }).text)
      .join('\n');
    return { type: 'narrative_append', message: `\n\n${narrative}` };
  }

  private cmdPetActivate(arg: string): CommandResult {
    if (!arg) {
      return {
        type: 'error',
        message: '请指定要出战的灵宠。用法：/pet activate <灵宠名称>',
      };
    }

    const pet = getPetByQuery(this.state, arg);
    if (!pet) {
      return { type: 'error', message: `找不到名为 "${arg}" 的灵宠。` };
    }

    if (pet.id === this.state.activePetId) {
      return {
        type: 'narrative_append',
        message: `\n\n${pet.name} 已经是出战灵宠了。`,
      };
    }

    const events: GameEvent[] = [
      Events.petSwitch(pet.id),
      Events.narrative('system', `${pet.name} 切换为出战灵宠。`),
    ];
    this.applyEvents(events);
    return {
      type: 'narrative_append',
      message: `\n\n${pet.name} 现在跟随你出战！`,
    };
  }

  private cmdPetRelease(arg: string): CommandResult {
    if (!arg) {
      return {
        type: 'error',
        message: '请指定要放生的灵宠。用法：/pet release <灵宠名称>',
      };
    }

    const pet = getPetByQuery(this.state, arg);
    if (!pet) {
      return { type: 'error', message: `找不到名为 "${arg}" 的灵宠。` };
    }

    const events: GameEvent[] = [
      Events.petRelease(pet.id),
      Events.narrative('system', `${pet.name} 回归了自然。你望着它远去的身影，心中感慨万千。`),
    ];
    this.applyEvents(events);

    // 降低其他宠物的忠诚度
    for (const otherPet of this.state.pets) {
      if (otherPet.id !== pet.id) {
        this.applyEvents([Events.petInteract(otherPet.id, -5)]);
      }
    }

    return {
      type: 'narrative_append',
      message:
        `\n\n${pet.name} 已放生。` + (this.state.pets.length > 0 ? ' 其他灵宠似乎有些不安。' : ''),
    };
  }

  private cmdPetEvolve(): CommandResult {
    const activePet = getActivePet(this.state);
    if (!activePet) {
      return { type: 'error', message: '你没有出战灵宠。' };
    }

    const result = attemptPetEvolution(this.state, activePet.id);
    if (result.error) {
      return { type: 'error', message: result.error };
    }

    this.applyEvents(result.events);
    const narrative = result.events
      .filter((e) => e.type === 'narrative')
      .map((e) => (e as { text: string }).text)
      .join('\n');
    return { type: 'narrative_append', message: `\n\n${narrative}` };
  }

  // ---- 存档 ----

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

  // ---- 存档码（Phase 8） ----

  private cmdExportSave(): CommandResult {
    try {
      const code = encodeArchive(this.state);
      return {
        type: 'narrative_append',
        message: `\n\n*存档码已生成：*\n\n\`\`\`\n${code}\n\`\`\`\n\n*复制上方代码即可分享存档或在其他设备导入。*`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      return { type: 'error', message: `导出存档码失败：${message}` };
    }
  }

  private cmdImportSave(code: string): CommandResult {
    if (!code || code.trim().length === 0) {
      return { type: 'error', message: '请提供存档码。用法：/import-save <存档码>' };
    }
    try {
      const { state, meta } = decodeArchive(code.trim());
      this.state = state;
      this.contextManager.clear();
      this.contextManager.addUserMessage(
        `[存档码导入] 玩家「${state.player.name}」在${getLocationName(state.world.currentLocationId)}继续冒险。` +
          `当前状态：${buildStatusSummary(state)}`
      );
      this.accumulatedText = '';
      this.callbacks.onStateUpdate(this.state);
      return {
        type: 'narrative_append',
        message:
          `\n\n*存档码导入成功！欢迎回来，${state.player.name}。*\n\n` +
          `*存档信息：${meta.realm} · 第${meta.turn}回合 · 导出时间：${new Date(meta.exportedAt).toLocaleString('zh-CN')}*\n\n` +
          `*当前位置：${getLocationName(state.world.currentLocationId)}*\n\n你可以输入 /look 查看周围环境。`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入失败';
      return { type: 'error', message: `导入存档码失败：${message}` };
    }
  }

  private cmdTechniques(): CommandResult {
    const techniques = this.state.player.techniques;

    if (techniques.length === 0) {
      return {
        type: 'narrative_append',
        message: '\n\n你尚未学习任何功法。可在青云宗外门寻找功法，或从敌人身上获取功法残卷。',
      };
    }

    const lines = techniques.map((t) => {
      const status = t.equipped ? '**[已装备]**' : '';
      const skills = t.skills.map((s) => s.name).join('、');
      return (
        `### ${t.name} ${status}\n` +
        `- 品质：${t.grade} | 技能：${skills}\n` +
        `- ${t.description}`
      );
    });

    return {
      type: 'narrative_append',
      message: `\n\n## 已学功法\n\n${lines.join('\n\n')}`,
    };
  }

  private cmdHelp(): CommandResult {
    const lines = GameEngine.COMMANDS.map((c) => `| ${c.cmd} ${c.args} | ${c.desc} |`).join('\n');

    return {
      type: 'narrative_append',
      message: `\n## 命令列表\n\n| 命令 | 说明 |\n|------|------|\n${lines}\n\n**自由输入示例**：\n- 探索区域、采集灵草\n- 与NPC交谈、交易物品\n- 修炼功法、突破境界\n- 进入战斗、使用物品\n`,
    };
  }

  // ==================== 角色创建处理 ====================

  private async handleCreationDecision(choiceId: string, _choiceLabel: string): Promise<void> {
    if (!this.creationState) return;

    switch (this.creationState.step) {
      case 'origin': {
        const origin = getOriginById(choiceId);
        if (origin) {
          this.creationState.origin = origin;
          this.creationState.step = 'talent';
          this.callbacks.onDecisionRequired(buildTalentDecision());
        }
        break;
      }

      case 'talent': {
        const talent = getTalentById(choiceId);
        if (talent) {
          this.creationState.talent = talent;
          this.creationState.step = 'name';
          this.callbacks.onDecisionRequired(buildNameDecision());
        }
        break;
      }

      case 'confirm': {
        if (choiceId === 'confirm_yes') {
          this.finalizeCreation();
        } else {
          // 重新开始
          this.creationState = { step: 'origin', origin: null, talent: null, name: '' };
          this.callbacks.onDecisionRequired(buildOriginDecision());
        }
        break;
      }

      default:
        break;
    }
  }

  // 处理 free_text 类型的名称输入
  processNameInput(name: string): void {
    if (!this.creationState || this.creationState.step !== 'name') return;

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      this.callbacks.onDecisionRequired(buildNameDecision());
      return;
    }

    this.creationState.name = trimmed;
    this.creationState.step = 'confirm';

    const origin = this.creationState.origin!;
    const talent = this.creationState.talent!;
    const difficultyNames: Record<string, string> = {
      easy: '简单',
      normal: '普通',
      hard: '困难',
    };

    this.callbacks.onDecisionRequired(
      buildConfirmDecision({
        name: trimmed,
        originName: origin.name,
        talentName: talent.name,
        difficulty: difficultyNames[this.state.meta.difficulty] ?? '普通',
      })
    );
  }

  private finalizeCreation(): void {
    if (!this.creationState?.origin || !this.creationState?.talent) return;

    const oldDifficulty = this.state.meta.difficulty;
    this.state = createCharacter({
      name: this.creationState.name || '无名散修',
      origin: this.creationState.origin,
      talent: this.creationState.talent,
      difficulty: oldDifficulty,
      worldData: CANGWU_MOUNTAINS,
    });

    this.creationState.step = 'done';
    this.contextManager.clear();
    this.contextManager.addUserMessage(
      `[游戏开始] 玩家「${this.state.player.name}」进入苍梧山脉修仙世界。` +
        `出身：${this.creationState.origin.name}，天赋：${this.creationState.talent.name}。` +
        `境界：${this.state.player.realm.name}${this.state.player.realm.subStage}。` +
        `位置：苍梧城。作为DM，请向玩家描述当前场景并引导游戏。`
    );

    this.callbacks.onStateUpdate(this.state);

    // 自动开始首轮探索
    this._isProcessing = true;
    this.accumulatedText = '';
    this.callbacks.onProcessingStart('灵气凝聚中...');
    this.runLLMCycle().catch((err) => {
      this.callbacks.onProcessingEnd();
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      this.callbacks.onError(errorMsg);
      this.appendNarrative(`\n\n*（系统：${errorMsg}）*`);
      this.finishTurn();
    });
  }

  // ==================== 突破处理 ====================

  private handleBreakthroughDecision(choiceId: string): void {
    if (choiceId === 'yes') {
      const result = attemptBreakthrough(this.state);
      this.applyEvents(result.events);

      if (result.triggersTribulation) {
        // 天劫结算
        const tribResult = resolveTribulation(this.state);
        this.applyEvents(tribResult.events);
      }

      this.state.meta.phase = 'exploration';
      this.state.narrative.pendingDecision = null;

      this.callbacks.onStateUpdate(this.state);
      this.finishTurn();
    } else {
      // 选择不突破，回到探索
      this.state.meta.phase = 'exploration';
      this.state.narrative.pendingDecision = null;
      this.appendNarrative('\n\n*你决定暂缓突破，继续稳固根基。*');
      this.finishTurn();
    }
  }

  private checkBreakthrough(): void {
    if (this.state.player.realm.cultivation >= 100 && this.state.meta.phase === 'exploration') {
      const check = canAttemptBreakthrough(this.state);
      if (check.canAttempt) {
        this.state.meta.phase = 'breakthrough';
        const prompt =
          `你的修炼已至**${check.currentRealm}**圆满！\n\n` +
          `突破难度：${Math.round(check.breakthroughDifficulty * 100)}% | ` +
          `天劫风险：${Math.round(check.tribulationRisk * 100)}%\n\n` +
          `是否尝试突破？突破失败会损失部分修炼进度和生命值。`;
        this.state.narrative.pendingDecision = {
          type: 'menu',
          prompt,
          choices: [
            { id: 'yes', label: '突破境界', description: '冒险一搏，冲击更高境界' },
            { id: 'no', label: '暂不突破', description: '继续修炼，稳固根基' },
          ],
        };
        this.callbacks.onDecisionRequired(this.state.narrative.pendingDecision);
      }
    }
  }

  // ==================== LLM 循环 ====================

  private async runLLMCycle(): Promise<void> {
    const systemPrompt = buildSystemPrompt();
    const context = this.contextManager.buildContext(this.state, systemPrompt);
    const eventStream = this.llm.streamChat(context);
    await this.processStream(eventStream);

    // 检查是否需要突破
    this.checkBreakthrough();

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
          // 检查是否有 pending encounter
          this.checkPendingEncounter();
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

  // ==================== 战斗处理 ====================

  /** 检查并触发 pending encounter */
  private checkPendingEncounter(): void {
    const enemyId = this.state.player.flags.pending_encounter;
    if (!enemyId || typeof enemyId !== 'string') return;

    // 清除 flag
    this.state.player.flags.pending_encounter = undefined as unknown as string;
    this.startCombat(enemyId);
  }

  /** 开始战斗 */
  private startCombat(enemyId: string): void {
    const enemy = getEnemyById(enemyId);
    if (!enemy) {
      this.appendNarrative(`\n\n*（系统：未知敌人 "${enemyId}"）*`);
      return;
    }

    // 触发 combat_start 事件
    this.applyEvents([Events.combatStart(enemy, enemy.type)]);

    // 战前叙事
    const encounterTexts: Record<string, string> = {
      aggressive: `\n\n${enemy.description}\n\n*${enemy.name}向你发起攻击！*`,
      defensive: `\n\n${enemy.description}\n\n*${enemy.name}警惕地盯着你，摆出防御姿态。*`,
      berserk: `\n\n${enemy.description}\n\n*${enemy.name}发出震耳欲聋的咆哮，疯狂地朝你冲来！*`,
      cunning: `\n\n${enemy.description}\n\n*${enemy.name}阴冷地注视着你，似乎在谋划着什么。*`,
    };
    const encounterText =
      encounterTexts[enemy.behavior] ?? `\n\n${enemy.description}\n\n*你遇到了${enemy.name}！*`;
    this.appendNarrative(encounterText);

    if (enemy.type === 'minor') {
      // 小怪速杀
      const result = quickResolve(this.state, enemy);
      const hpChangeEvent = Events.statChange('player', { hp: -result.hpLoss });
      const narrativeEvent = Events.narrative('system', result.narrative);
      this.applyEvents([hpChangeEvent, narrativeEvent]);

      if (result.result === 'victory') {
        const loot: import('./types').GameItem[] = result.loot ?? [];
        this.applyEvents([Events.combatEnd('victory', loot)]);
        if (loot.length > 0) {
          this.appendNarrative(
            `\n\n获得战利品：${loot.map((l) => `${l.name}x${l.quantity}`).join('、')}`
          );
        }
        this.appendNarrative('\n\n*战斗结束，你继续前行。*');
        this.callbacks.onStateUpdate(this.state);
      } else {
        this.applyEvents([Events.combatEnd('defeat', [])]);
        this.appendNarrative('\n\n*你狼狈撤退，伤势不轻。*');
        this.callbacks.onStateUpdate(this.state);

        // 检查玩家是否死亡
        if (this.state.player.stats.hp <= 0) {
          this.appendNarrative('\n\n# 你被击败了！\n\n*你的修仙之路暂时中断...*');
          this.callbacks.onGameOver('战斗失败');
          return;
        }
      }
      this.finishTurn();
    } else {
      // Boss 进入回合制
      this.finishTurn();
    }
  }

  /** 处理战斗菜单选择 */
  private handleCombatAction(choiceId: string): void {
    if (!this.state.combat?.active) return;

    const combat = this.state.combat;

    // 宠物技能子菜单选择
    if (choiceId.startsWith('pet_skill_')) {
      const skillName = choiceId.replace('pet_skill_', '');
      if (skillName === 'basic') {
        this.executeCombatRound({ type: 'pet_assist' });
      } else if (skillName === 'cancel') {
        this.finishTurn();
      } else {
        this.executeCombatRound({ type: 'pet_assist', petSkillName: skillName });
      }
      return;
    }

    // 验证选择的合法性
    if (choiceId === 'flee' && !canFlee(combat)) {
      this.appendNarrative('\n\n*Boss 战中无法逃跑！你必须战斗到底！*');
      this.finishTurn();
      return;
    }

    if (choiceId === 'item') {
      const items = getUsableCombatItems(this.state);
      if (items.length === 0) {
        this.appendNarrative('\n\n*你没有可用的战斗物品！*');
        this.finishTurn();
        return;
      }
      const firstItem = items[0];
      if (!firstItem) {
        this.appendNarrative('\n\n*你没有可用的战斗物品！*');
        this.finishTurn();
        return;
      }
      const playerAction = { type: 'item' as const, itemId: firstItem.id };
      this.executeCombatRound(playerAction);
      return;
    }

    if (choiceId === 'pet_assist') {
      if (!canPetAssist(this.state)) {
        this.appendNarrative('\n\n*你的灵宠无法助战！*');
        this.finishTurn();
        return;
      }
      // 检查宠物是否有可用的技能，有则显示子菜单
      const activePet = this.state.pets.find((p) => p.id === this.state.activePetId);
      if (activePet) {
        const availableSkills = getAvailablePetSkills(activePet);
        if (availableSkills.length > 0) {
          const choices: import('./types').MenuChoice[] = [];
          for (const skill of availableSkills) {
            choices.push({
              id: `pet_skill_${skill.name}`,
              label: skill.name,
              description: `${skill.description}（冷却：${skill.cooldown}回合）`,
            });
          }
          choices.push({
            id: 'pet_skill_basic',
            label: '普通攻击',
            description: '灵宠基础攻击，无需冷却',
          });
          choices.push({
            id: 'pet_skill_cancel',
            label: '返回',
            description: '取消灵宠行动，返回战斗菜单',
          });
          this.callbacks.onDecisionRequired({
            type: 'menu',
            prompt: `选择 ${activePet.name} 的行动：`,
            choices,
          });
          return;
        }
      }
    }

    let playerAction: import('./types').CombatAction;
    switch (choiceId) {
      case 'attack':
        playerAction = { type: 'attack' };
        break;
      case 'defend':
        playerAction = { type: 'defend' };
        break;
      case 'flee':
        playerAction = { type: 'flee' };
        break;
      case 'pet_assist':
        playerAction = { type: 'pet_assist' };
        break;
      default:
        playerAction = { type: 'attack' };
    }

    this.executeCombatRound(playerAction);
  }

  /** 执行一回合战斗结算 */
  private executeCombatRound(playerAction: import('./types').CombatAction): void {
    const result = processRound(this.state, playerAction);
    this.applyEvents(result.events);

    if (result.combatEnded) {
      this.endCombat(result.endResult ?? 'defeat', result.loot);
    } else {
      this.finishTurn();
    }
  }

  /** 结束战斗 */
  private endCombat(
    result: 'victory' | 'defeat' | 'fled',
    loot?: import('./types').GameItem[]
  ): void {
    const endEvents: GameEvent[] = [Events.combatEnd(result, loot ?? [])];
    this.applyEvents(endEvents);

    switch (result) {
      case 'victory': {
        const lootText =
          loot && loot.length > 0
            ? `\n获得战利品：${loot.map((l) => `${l.name}x${l.quantity}`).join('、')}`
            : '';
        this.appendNarrative(`\n\n# 战斗胜利！${lootText}`);
        break;
      }
      case 'defeat':
        this.appendNarrative('\n\n# 你被击败了！');
        if (this.state.player.stats.hp <= 0) {
          this.appendNarrative('\n\n*你的修仙之路暂时中断...*');
          this.callbacks.onGameOver('战斗失败');
          return;
        }
        break;
      case 'fled':
        this.appendNarrative('\n\n*你成功逃离了战斗。*');
        break;
    }

    this.finishTurn();
  }

  // ==================== 内部辅助 ====================

  private applyEvents(events: GameEvent[]): void {
    this.state = applyEvents(this.state, events);

    // combat_end 后自动消耗装备耐久
    const hasCombatEnd = events.some((e) => e.type === 'combat_end');
    if (hasCombatEnd) {
      for (const slot of ['weapon', 'armor', 'treasure', 'accessory'] as const) {
        const eq = this.state.player.equipment[slot];
        if (eq && eq.durability > 0) {
          const degradeAmount = Math.floor(Math.random() * 5) + 1;
          const degraded = EquipmentService.degradeEquipment(eq, degradeAmount);
          this.state.player.equipment[slot] = degraded;
          if (degraded.durability <= 0) {
            this.appendNarrative(
              `\n\n*（${eq.name} 耐久归零，已损坏。请使用 /repair ${slot} 修理。）*`
            );
          }
        }
      }
    }

    this.callbacks.onStateUpdate(this.state);
  }

  private appendNarrative(text: string): void {
    this.accumulatedText += text;
    this.callbacks.onNarrativeUpdate(this.accumulatedText);
  }

  private finishTurn(): void {
    this._isProcessing = false;
    // 如果在战斗中，显示战斗菜单而非恢复自由输入
    if (this.state.meta.phase === 'combat' && this.state.combat?.active) {
      const menu = Events.createCombatMenu();
      // 直接设置 pendingDecision（不通过事件，避免触发额外逻辑）
      this.state.narrative.pendingDecision = menu;
      this.callbacks.onDecisionRequired(menu);
    }
    this.callbacks.onProcessingEnd();
  }
}

// ==================== 辅助函数 ====================

function slotNameCn(slot: string): string {
  const map: Record<string, string> = {
    weapon: '武器',
    armor: '护甲',
    treasure: '法宝',
    accessory: '饰品',
  };
  return map[slot] ?? slot;
}
