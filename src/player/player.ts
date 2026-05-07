// ============================================================
// 角色创建系统 — 出身、天赋、初始属性
// ============================================================

import { createInitialState } from '../game/state';
import type { CoreStats, GameDifficulty, GameState, PendingDecision, Region } from '../game/types';

// ==================== 出身类型 ====================

export interface PlayerOrigin {
  id: string;
  name: string;
  description: string;
  statModifiers: Partial<CoreStats>;
  startingStones: number;
  startingTitle: string;
  startingFaction: string;
}

// ==================== 天赋类型 ====================

export interface PlayerTalent {
  id: string;
  name: string;
  description: string;
  cultivationSpeedBonus: number;
  flags: Record<string, boolean | number | string>;
}

// ==================== 角色创建选项 ====================

export interface CharacterCreationOptions {
  name: string;
  origin: PlayerOrigin;
  talent: PlayerTalent;
  difficulty: GameDifficulty;
  worldData?: Region[];
}

// ==================== 4 种出身 ====================

const ORIGINS: PlayerOrigin[] = [
  {
    id: 'rogue',
    name: '散修',
    description: '无门无派的自由修士，资质平平但心性坚韧，灵石虽少但胜在自由。',
    statModifiers: {},
    startingStones: 100,
    startingTitle: '散修',
    startingFaction: '',
  },
  {
    id: 'clan_scion',
    name: '世家子弟',
    description: '出身修仙世家，家底殷实，初始灵石较多，家族关系可作依靠。',
    statModifiers: { maxQi: 20, qi: 20 },
    startingStones: 300,
    startingTitle: '世家子弟',
    startingFaction: '世家',
  },
  {
    id: 'sect_outcast',
    name: '宗门弃徒',
    description: '曾为宗门弟子，因故被逐出。意志坚韧，随身携带一门残缺功法。',
    statModifiers: { willpower: 5 },
    startingStones: 50,
    startingTitle: '弃徒',
    startingFaction: '青云宗',
  },
  {
    id: 'wild_cultivator',
    name: '山林野修',
    description: '长于山野之间，体质强健，耐力超群，对野外环境适应力强。',
    statModifiers: { maxStamina: 30, stamina: 30 },
    startingStones: 80,
    startingTitle: '野修',
    startingFaction: '',
  },
];

// ==================== 4 种天赋 ====================

const TALENTS: PlayerTalent[] = [
  {
    id: 'natural_spirit_root',
    name: '灵根天成',
    description: '天生灵根纯净，修炼速度永久 +20%。',
    cultivationSpeedBonus: 0.2,
    flags: { natural_spirit_root: true },
  },
  {
    id: 'sword_heart',
    name: '剑心通明',
    description: '剑道天赋超群，战斗伤害 +10%，剑法领悟更快。',
    cultivationSpeedBonus: 0,
    flags: { sword_heart: true, combat_damage_bonus: 0.1 },
  },
  {
    id: 'alchemy_prodigy',
    name: '丹道奇才',
    description: '精通炼丹之术，使用丹药效果 +50%，炼丹成功率更高。',
    cultivationSpeedBonus: 0,
    flags: { alchemy_prodigy: true, item_effect_bonus: 0.5 },
  },
  {
    id: 'destiny_sense',
    name: '天机感应',
    description: '冥冥之中能感应天道规律，突破成功率 +10%，天劫存活率提升。',
    cultivationSpeedBonus: 0,
    flags: { destiny_sense: true },
  },
];

// ==================== 获取函数 ====================

export function getOrigins(): PlayerOrigin[] {
  return ORIGINS;
}

export function getTalents(): PlayerTalent[] {
  return TALENTS;
}

export function getOriginById(id: string): PlayerOrigin | undefined {
  return ORIGINS.find((o) => o.id === id);
}

export function getTalentById(id: string): PlayerTalent | undefined {
  return TALENTS.find((t) => t.id === id);
}

// ==================== 决策菜单构建 ====================

export function buildOriginDecision(): PendingDecision {
  return {
    type: 'menu',
    prompt: '选择你的出身背景：',
    choices: ORIGINS.map((o) => ({
      id: o.id,
      label: o.name,
      description: o.description,
    })),
  };
}

export function buildTalentDecision(): PendingDecision {
  return {
    type: 'menu',
    prompt: '选择你的天赋特性：',
    choices: TALENTS.map((t) => ({
      id: t.id,
      label: t.name,
      description: t.description,
    })),
  };
}

export function buildNameDecision(): PendingDecision {
  return {
    type: 'free_text',
    prompt: '请输入你的道号（角色名称）：',
  };
}

export function buildConfirmDecision(options: {
  name: string;
  originName: string;
  talentName: string;
  difficulty: string;
}): PendingDecision {
  return {
    type: 'menu',
    prompt: `确认角色信息：\n  道号：${options.name}\n  出身：${options.originName}\n  天赋：${options.talentName}\n  难度：${options.difficulty}\n\n是否确认创建？`,
    choices: [
      { id: 'confirm_yes', label: '确认创建，踏入仙途', description: '开始修仙之旅' },
      { id: 'confirm_no', label: '重新选择', description: '返回重新创建角色' },
    ],
  };
}

// ==================== 角色创建工厂 ====================

export function createCharacter(options: CharacterCreationOptions): GameState {
  const { name, origin, talent, difficulty, worldData } = options;

  // 从基础初始状态开始
  const state = createInitialState(name, difficulty, worldData);

  // 应用出身属性修改
  if (origin.statModifiers) {
    for (const [key, value] of Object.entries(origin.statModifiers)) {
      if (value !== undefined && typeof value === 'number') {
        const statsRecord = state.player.stats as unknown as Record<string, number>;
        const baseRecord = state.player.baseStats as unknown as Record<string, number>;
        if (key in statsRecord) {
          statsRecord[key] = (statsRecord[key] ?? 0) + value;
        }
        if (key in baseRecord) {
          baseRecord[key] = (baseRecord[key] ?? 0) + value;
        }
      }
    }
  }

  // 应用出身灵石
  state.player.spiritStones = origin.startingStones;

  // 应用出身称号
  state.player.title = origin.startingTitle;

  // 应用出身阵营
  state.player.faction = origin.startingFaction;

  // 应用天赋标记
  for (const [key, value] of Object.entries(talent.flags)) {
    state.player.flags[key] = value;
  }

  // 设置阶段为探索（角色创建完成）
  state.meta.phase = 'exploration';

  return state;
}
