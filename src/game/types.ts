// ============================================================
// 修仙 CLI 文字 RPG — 核心数据模型
// 单一真相来源，所有模块引用此文件
// ============================================================

// ==================== 境界系统 (Realm) ====================

export type RealmName =
  | '炼气'
  | '筑基'
  | '金丹'
  | '元婴'
  | '化神'
  | '炼虚'
  | '合体'
  | '大乘'
  | '渡劫';

export type SubStage = '前期' | '中期' | '后期' | '圆满';

export interface Realm {
  name: RealmName;
  subStage: SubStage;
  /** 0-35 (9 realms × 4 sub-stages) */
  progressIndex: number;
  /** 修炼进度 0-100，满后触发突破判定 */
  cultivation: number;
}

export interface RealmDefinition {
  name: RealmName;
  index: number;
  /** 属性倍率，每个大境界递增 */
  statMultiplier: number;
  /** 突破难度 0-1 */
  breakthroughDifficulty: number;
  /** 渡劫风险 0-1 */
  tribulationRisk: number;
  /** 突破最低修炼值 */
  minCultivation: number;
  /** 突破所需物品（可选） */
  requiredItems?: string[];
}

// ==================== 核心属性 (Core Stats) ====================

export interface CoreStats {
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  stamina: number;
  maxStamina: number;
  willpower: number;
}

// ==================== 装备系统 (Equipment) ====================

export type EquipmentSlot = 'weapon' | 'armor' | 'treasure' | 'accessory';
export type WeaponType = '飞剑' | '法杖' | '刀' | '扇' | '笛' | '符箓';
export type ArmorType = '灵甲' | '法袍' | '护符' | '宝衣';
export type TreasureType = '法宝' | '灵宝' | '先天灵宝';
export type ItemGrade = '凡品' | '灵品' | '宝品' | '仙品' | '神品';

export interface SpecialEffect {
  trigger: 'on_attack' | 'on_defend' | 'on_cultivate' | 'passive';
  effect: string;
  value: number;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'equipment';
  slot: EquipmentSlot;
  subtype: WeaponType | ArmorType | TreasureType;
  grade: ItemGrade;
  stats: Partial<CoreStats>;
  /** 装备所需最低 progressIndex */
  realmRequirement: number;
  durability: number;
  maxDurability: number;
  specialEffects: SpecialEffect[];
  description: string;
}

// ==================== 物品系统 (Items) ====================

export type ItemType = 'consumable' | 'material' | 'technique' | 'misc' | 'equipment';

export interface ItemEffect {
  attribute: string;
  operation: 'add' | 'multiply' | 'set';
  value: number;
  duration: 'instant' | 'combat' | 'permanent';
}

export interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  subtype: string;
  description: string;
  quantity: number;
  effects: ItemEffect[];
  /** 灵石价值 */
  value: number;
  stackable: boolean;
  maxStack: number;
  // ---- 装备相关字段（仅 type === 'equipment' 时有效） ----
  /** 装备槽位 */
  slot?: EquipmentSlot;
  /** 品质等级 */
  grade?: ItemGrade;
  /** 装备所需最低 progressIndex */
  realmRequirement?: number;
  /** 当前耐久 */
  durability?: number;
  /** 最大耐久 */
  maxDurability?: number;
  /** 装备提供的属性加成 */
  equipStats?: Partial<CoreStats>;
  /** 装备特殊效果 */
  specialEffects?: SpecialEffect[];
}

// ==================== 商店系统 (Shop) ====================

/** 商店交易价格配置 */
export interface ShopConfig {
  /** 买入溢价倍率（玩家买入价格 = 物品基础价格 × buyPremium） */
  buyPremium: number;
  /** 卖出折价倍率（玩家卖出价格 = 物品基础价格 × sellDiscount） */
  sellDiscount: number;
}

// ==================== 功法系统 (Techniques) ====================

export interface CombatSkill {
  name: string;
  qiCost: number;
  staminaCost: number;
  damageMultiplier: number;
  description: string;
  specialEffect?: SpecialEffect;
}

export interface Technique {
  id: string;
  name: string;
  type: 'technique';
  grade: ItemGrade;
  realmRequirement: number;
  skills: CombatSkill[];
  passiveEffects: SpecialEffect[];
  description: string;
  equipped: boolean;
}

// ==================== 灵宠系统 (Spirit Pet) ====================

export interface PetSkill {
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
}

export interface SpiritPet {
  id: string;
  name: string;
  species: string;
  level: number;
  loyalty: number;
  stats: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  skills: PetSkill[];
  evolutionStage: number;
  evolutionPath: 'normal' | 'divine' | 'demonic';
  description: string;
}

// ==================== 战斗系统 (Combat) ====================

export interface LootTable {
  guaranteed: { itemId: string; quantity: number }[];
  possible: { itemId: string; quantity: number; chance: number }[];
  experience: number;
}

export interface Enemy {
  id: string;
  name: string;
  type: 'minor' | 'boss';
  realm: Realm;
  stats: CoreStats;
  attack: number;
  defense: number;
  skills: CombatSkill[];
  loot: LootTable;
  description: string;
  behavior: string;
}

export type CombatAction =
  | { type: 'attack'; skillName?: string }
  | { type: 'defend' }
  | { type: 'item'; itemId: string }
  | { type: 'flee' }
  | { type: 'pet_assist' };

export interface CombatState {
  active: boolean;
  combatType: 'minor' | 'boss';
  enemy: Enemy;
  turn: number;
  playerAction: CombatAction | null;
  enemyAction: CombatAction | null;
  log: string[];
  result: 'ongoing' | 'victory' | 'defeat' | 'fled';
}

// ==================== 世界系统 (World) ====================

export type LocationType = 'wilderness' | 'city' | 'sect' | 'dungeon' | 'market' | 'secret_realm';

export interface Location {
  id: string;
  name: string;
  region: string;
  type: LocationType;
  /** 危险等级 1-10 */
  dangerLevel: number;
  /** 进入所需最低 progressIndex */
  realmSuitability: number;
  /** 连接的位置 ID */
  connections: string[];
  npcs: NPC[];
  description: string;
}

export type NPCAttitude = 'friendly' | 'neutral' | 'hostile';
export type NPCRole = 'merchant' | 'elder' | 'rival' | 'mentor' | 'quest_giver' | 'wanderer';

export interface NPC {
  id: string;
  name: string;
  realm: Realm;
  faction: string;
  attitude: NPCAttitude;
  role: NPCRole;
  personality: string;
  inventory: GameItem[];
  description: string;
}

export interface WorldMap {
  regions: Region[];
  currentLocationId: string;
}

export interface Region {
  name: string;
  description: string;
  locations: Location[];
  dominantFaction: string;
  realmRange: [number, number];
}

// ==================== 叙事系统 (Narrative) ====================

export interface NarrativeEntry {
  timestamp: number;
  speaker: string;
  content: string;
  events: GameEvent[];
}

export interface MenuChoice {
  id: string;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface PendingDecision {
  type: 'menu' | 'free_text';
  prompt: string;
  choices?: MenuChoice[];
}

export interface NarrativeState {
  history: NarrativeEntry[];
  currentScene: string;
  pendingDecision: PendingDecision | null;
  summary: string;
}

// ==================== 玩家状态 (Player) ====================

export interface PlayerState {
  name: string;
  title: string;
  realm: Realm;
  stats: CoreStats;
  baseStats: CoreStats;
  equipment: Record<EquipmentSlot, Equipment | null>;
  techniques: Technique[];
  faction: string;
  reputation: Record<string, number>;
  spiritStones: number;
  flags: Record<string, boolean | number | string>;
}

// ==================== 游戏元数据 (Meta) ====================

export type GamePhase =
  | 'character_creation'
  | 'exploration'
  | 'combat'
  | 'trading'
  | 'breakthrough'
  | 'tribulation'
  | 'dialogue'
  | 'game_over';

export type GameDifficulty = 'easy' | 'normal' | 'hard';

export interface GameMeta {
  phase: GamePhase;
  turn: number;
  sessionStartTime: number;
  playTime: number;
  difficulty: GameDifficulty;
  llmModel: string;
}

// ==================== 游戏状态 (Game State) ====================

export interface GameState {
  version: string;
  player: PlayerState;
  inventory: GameItem[];
  equippedTechnique: string | null;
  pets: SpiritPet[];
  activePetId: string | null;
  combat: CombatState | null;
  world: WorldMap;
  narrative: NarrativeState;
  meta: GameMeta;
  createdAt: number;
  updatedAt: number;
}

// ==================== 游戏事件 (Game Events) ====================
// 事件溯源核心：所有状态变更都通过事件表达

export type GameEvent =
  | { type: 'narrative'; text: string; speaker: string; timestamp: number }
  | { type: 'stat_change'; target: 'player' | 'pet'; petId?: string; changes: Partial<CoreStats> }
  | { type: 'cultivation_gain'; amount: number }
  | { type: 'realm_advance'; newSubStage: SubStage; newRealm: RealmName; newProgressIndex: number }
  | { type: 'item_add'; item: GameItem }
  | { type: 'item_remove'; itemId: string; quantity: number }
  | { type: 'item_use'; itemId: string; effects: ItemEffect[] }
  | { type: 'equipment_change'; slot: EquipmentSlot; item: Equipment | null }
  | { type: 'combat_start'; enemy: Enemy; combatType: 'minor' | 'boss' }
  | {
      type: 'combat_turn';
      turn: number;
      playerAction: CombatAction;
      enemyAction: CombatAction;
      narrative: string;
    }
  | { type: 'combat_end'; result: 'victory' | 'defeat' | 'fled'; loot: GameItem[] }
  | { type: 'location_change'; fromId: string; toId: string }
  | { type: 'pet_obtain'; pet: SpiritPet }
  | { type: 'pet_evolve'; petId: string; newStage: number; newPath: string }
  | { type: 'pet_release'; petId: string }
  | { type: 'technique_learn'; technique: Technique }
  | { type: 'technique_equip'; techniqueId: string }
  | { type: 'decision_required'; decision: PendingDecision }
  | { type: 'decision_resolved'; choiceId?: string; freeText?: string }
  | { type: 'flag_set'; key: string; value: boolean | number | string }
  | { type: 'trade'; bought: GameItem[]; sold: GameItem[]; spiritStonesChange: number }
  | { type: 'spirit_stones_change'; amount: number; reason: string }
  | { type: 'title_change'; newTitle: string }
  | { type: 'faction_change'; newFaction: string }
  | { type: 'game_over'; reason: string };

// ==================== LLM 相关 ====================

export interface LLMGameEventOutput {
  events: GameEvent[];
  pending_decision: PendingDecision | null;
}
