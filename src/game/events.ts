import type {
  CombatAction,
  CoreStats,
  Enemy,
  Equipment,
  EquipmentSlot,
  GameEvent,
  GameItem,
  ItemEffect,
  MenuChoice,
  PendingDecision,
  RealmName,
  SpiritPet,
  SubStage,
  Technique,
} from './types';

// ==================== 叙事事件 ====================

export function narrative(speaker: string, text: string): GameEvent {
  return { type: 'narrative', text, speaker, timestamp: Date.now() };
}

// ==================== 属性变更 ====================

export function statChange(
  target: 'player' | 'pet' | 'enemy',
  changes: Partial<CoreStats>,
  petId?: string
): GameEvent {
  const event: GameEvent = { type: 'stat_change', target, changes };
  if (petId !== undefined) event.petId = petId;
  return event;
}

// ==================== 修炼相关 ====================

export function cultivationGain(amount: number): GameEvent {
  return { type: 'cultivation_gain', amount };
}

export function realmAdvance(
  newSubStage: SubStage,
  newRealm: RealmName,
  newProgressIndex: number
): GameEvent {
  return { type: 'realm_advance', newSubStage, newRealm, newProgressIndex };
}

// ==================== 物品相关 ====================

export function itemAdd(item: GameItem): GameEvent {
  return { type: 'item_add', item };
}

export function itemRemove(itemId: string, quantity: number): GameEvent {
  return { type: 'item_remove', itemId, quantity };
}

export function itemUse(itemId: string, effects: ItemEffect[]): GameEvent {
  return { type: 'item_use', itemId, effects };
}

// ==================== 装备相关 ====================

export function equipmentChange(slot: EquipmentSlot, item: Equipment | null): GameEvent {
  return { type: 'equipment_change', slot, item };
}

// ==================== 战斗相关 ====================

export function combatStart(enemy: Enemy, combatType: 'minor' | 'boss'): GameEvent {
  return { type: 'combat_start', enemy, combatType };
}

export function combatTurn(
  turn: number,
  playerAction: CombatAction,
  enemyAction: CombatAction,
  narrative: string
): GameEvent {
  return { type: 'combat_turn', turn, playerAction, enemyAction, narrative };
}

export function combatEnd(result: 'victory' | 'defeat' | 'fled', loot: GameItem[]): GameEvent {
  return { type: 'combat_end', result, loot };
}

// ==================== 位置相关 ====================

export function locationChange(fromId: string, toId: string): GameEvent {
  return { type: 'location_change', fromId, toId };
}

// ==================== 灵宠相关 ====================

export function petObtain(pet: SpiritPet): GameEvent {
  return { type: 'pet_obtain', pet };
}

export function petEvolve(petId: string, newStage: number, newPath: string): GameEvent {
  return { type: 'pet_evolve', petId, newStage, newPath };
}

export function petRelease(petId: string): GameEvent {
  return { type: 'pet_release', petId };
}

export function petFeed(
  petId: string,
  itemId: string,
  healAmount: number,
  loyaltyChange: number
): GameEvent {
  return { type: 'pet_feed', petId, itemId, healAmount, loyaltyChange };
}

export function petInteract(petId: string, loyaltyChange: number): GameEvent {
  return { type: 'pet_interact', petId, loyaltyChange };
}

export function petLevelUp(
  petId: string,
  newLevel: number,
  statIncreases: Partial<{
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
  }>
): GameEvent {
  return { type: 'pet_level_up', petId, newLevel, statIncreases };
}

export function petSkillCooldown(petId: string, skillName: string, cooldown: number): GameEvent {
  return { type: 'pet_skill_cooldown', petId, skillName, cooldown };
}

export function petSwitch(petId: string): GameEvent {
  return { type: 'pet_switch', petId };
}

export function petRename(petId: string, newName: string): GameEvent {
  return { type: 'pet_rename', petId, newName };
}

// ==================== 功法相关 ====================

export function techniqueLearn(technique: Technique): GameEvent {
  return { type: 'technique_learn', technique };
}

export function techniqueEquip(techniqueId: string): GameEvent {
  return { type: 'technique_equip', techniqueId };
}

// ==================== 决策相关 ====================

export function decisionRequired(decision: PendingDecision): GameEvent {
  return { type: 'decision_required', decision };
}

export function decisionResolved(choiceId?: string, freeText?: string): GameEvent {
  const event: GameEvent = { type: 'decision_resolved' };
  if (choiceId !== undefined) event.choiceId = choiceId;
  if (freeText !== undefined) event.freeText = freeText;
  return event;
}

export function createMenuDecision(prompt: string, choices: MenuChoice[]): PendingDecision {
  return { type: 'menu', prompt, choices };
}

export function createFreeTextDecision(prompt: string): PendingDecision {
  return { type: 'free_text', prompt };
}

// ==================== 标记/剧情 ====================

export function flagSet(key: string, value: boolean | number | string): GameEvent {
  return { type: 'flag_set', key, value };
}

// ==================== 交易相关 ====================

export function trade(bought: GameItem[], sold: GameItem[], spiritStonesChange: number): GameEvent {
  return { type: 'trade', bought, sold, spiritStonesChange };
}

// ==================== 灵石变更 ====================

export function spiritStonesChange(amount: number, reason: string): GameEvent {
  return { type: 'spirit_stones_change', amount, reason };
}

// ==================== 称号/阵营变更 ====================

export function titleChange(newTitle: string): GameEvent {
  return { type: 'title_change', newTitle };
}

export function factionChange(newFaction: string): GameEvent {
  return { type: 'faction_change', newFaction };
}

// ==================== 游戏结束 ====================

export function gameOver(reason: string): GameEvent {
  return { type: 'game_over', reason };
}

// ==================== 工具函数 ====================

/** 根据战斗状态创建菜单决策 */
export function createCombatMenu(): PendingDecision {
  return createMenuDecision('选择你的行动：', [
    { id: 'attack', label: '攻击', description: '使用武器或功法进行攻击' },
    { id: 'defend', label: '防御', description: '提升防御力，减少伤害' },
    { id: 'item', label: '使用物品', description: '使用丹药或法宝' },
    { id: 'pet_assist', label: '灵宠助战', description: '命令灵宠协助攻击' },
    { id: 'flee', label: '逃跑', description: '尝试逃离战斗' },
  ]);
}

/** 创建确认菜单 */
export function createConfirmMenu(prompt: string): PendingDecision {
  return createMenuDecision(prompt, [
    { id: 'yes', label: '是', description: '确认' },
    { id: 'no', label: '否', description: '取消' },
  ]);
}
