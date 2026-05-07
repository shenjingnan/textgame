import type {
  CoreStats,
  Equipment,
  EquipmentSlot,
  GameDifficulty,
  GameEvent,
  GameItem,
  GameState,
  Location,
  Realm,
  RealmDefinition,
  RealmName,
  Region,
} from './types';

// ==================== 境界定义表 ====================

export const REALM_DEFINITIONS: Record<RealmName, RealmDefinition> = {
  炼气: {
    name: '炼气',
    index: 0,
    statMultiplier: 1.0,
    breakthroughDifficulty: 0.1,
    tribulationRisk: 0,
    minCultivation: 100,
  },
  筑基: {
    name: '筑基',
    index: 1,
    statMultiplier: 1.5,
    breakthroughDifficulty: 0.3,
    tribulationRisk: 0.1,
    minCultivation: 100,
  },
  金丹: {
    name: '金丹',
    index: 2,
    statMultiplier: 2.5,
    breakthroughDifficulty: 0.5,
    tribulationRisk: 0.3,
    minCultivation: 100,
  },
  元婴: {
    name: '元婴',
    index: 3,
    statMultiplier: 4.0,
    breakthroughDifficulty: 0.6,
    tribulationRisk: 0.4,
    minCultivation: 100,
  },
  化神: {
    name: '化神',
    index: 4,
    statMultiplier: 6.0,
    breakthroughDifficulty: 0.7,
    tribulationRisk: 0.5,
    minCultivation: 100,
  },
  炼虚: {
    name: '炼虚',
    index: 5,
    statMultiplier: 9.0,
    breakthroughDifficulty: 0.75,
    tribulationRisk: 0.55,
    minCultivation: 100,
  },
  合体: {
    name: '合体',
    index: 6,
    statMultiplier: 13.0,
    breakthroughDifficulty: 0.8,
    tribulationRisk: 0.6,
    minCultivation: 100,
  },
  大乘: {
    name: '大乘',
    index: 7,
    statMultiplier: 18.0,
    breakthroughDifficulty: 0.85,
    tribulationRisk: 0.65,
    minCultivation: 100,
  },
  渡劫: {
    name: '渡劫',
    index: 8,
    statMultiplier: 25.0,
    breakthroughDifficulty: 0.9,
    tribulationRisk: 0.8,
    minCultivation: 100,
  },
};

const REALM_NAMES: RealmName[] = [
  '炼气',
  '筑基',
  '金丹',
  '元婴',
  '化神',
  '炼虚',
  '合体',
  '大乘',
  '渡劫',
];
const SUB_STAGES = ['前期', '中期', '后期', '圆满'] as const;

// ==================== 境界计算辅助 ====================

export function getRealmProgressIndex(realm: RealmName, subStage: string): number {
  const realmIndex = REALM_NAMES.indexOf(realm);
  const subIndex = SUB_STAGES.indexOf(subStage as (typeof SUB_STAGES)[number]);
  return realmIndex * 4 + subIndex;
}

export function getRealmFromProgress(progressIndex: number): Realm {
  const clampedIndex = Math.max(0, Math.min(35, progressIndex));
  const realmIndex = Math.floor(clampedIndex / 4);
  const subIndex = clampedIndex % 4;
  return {
    name: REALM_NAMES[realmIndex]!,
    subStage: SUB_STAGES[subIndex] as Realm['subStage'],
    progressIndex: clampedIndex,
    cultivation: 0,
  };
}

export function calculateBaseStats(realmIndex: number, difficulty: GameDifficulty): CoreStats {
  const realm = REALM_DEFINITIONS[REALM_NAMES[Math.floor(realmIndex / 4)]!]!;
  const difficultyMultiplier = { easy: 1.2, normal: 1.0, hard: 0.8 }[difficulty];

  const base = 50 + realmIndex * 30;
  return {
    hp: Math.round(base * realm.statMultiplier * difficultyMultiplier),
    maxHp: Math.round(base * realm.statMultiplier * difficultyMultiplier),
    qi: Math.round(base * 1.5 * realm.statMultiplier * difficultyMultiplier),
    maxQi: Math.round(base * 1.5 * realm.statMultiplier * difficultyMultiplier),
    stamina: Math.round(base * 0.8 * difficultyMultiplier),
    maxStamina: Math.round(base * 0.8 * difficultyMultiplier),
    willpower: 10 + realmIndex * 5,
  };
}

// ==================== 初始状态工厂 ====================

export function createInitialState(
  playerName: string,
  difficulty: GameDifficulty = 'normal',
  worldData?: Region[]
): GameState {
  const now = Date.now();
  const initialRealm: Realm = {
    name: '炼气',
    subStage: '前期',
    progressIndex: 0,
    cultivation: 0,
  };

  const stats = calculateBaseStats(0, difficulty);

  return {
    version: '1.0.0',
    player: {
      name: playerName,
      title: '散修',
      realm: initialRealm,
      stats: { ...stats },
      baseStats: { ...stats },
      equipment: { weapon: null, armor: null, treasure: null, accessory: null },
      techniques: [],
      faction: '',
      reputation: {},
      spiritStones: 100,
      flags: {},
    },
    inventory: [],
    equippedTechnique: null,
    pets: [],
    activePetId: null,
    combat: null,
    world: {
      regions: worldData ?? [],
      currentLocationId: 'cangwu_city',
    },
    narrative: {
      history: [],
      currentScene: '',
      pendingDecision: null,
      summary: '',
    },
    meta: {
      phase: 'character_creation',
      turn: 0,
      sessionStartTime: now,
      playTime: 0,
      difficulty,
      llmModel: 'deepseek-chat',
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ==================== 纯函数 Reducer ====================

/**
 * 将事件应用到游戏状态，返回新状态（不修改原状态）
 */
export function gameReducer(state: GameState, event: GameEvent): GameState {
  const next = structuredClone(state);
  next.updatedAt = Date.now();

  switch (event.type) {
    case 'narrative': {
      next.narrative.currentScene = event.text;
      next.narrative.history.push({
        timestamp: event.timestamp,
        speaker: event.speaker,
        content: event.text,
        events: [event],
      });
      break;
    }

    case 'stat_change': {
      let targetStats: Record<string, number> | undefined;
      if (event.target === 'player') {
        targetStats = next.player.stats as unknown as Record<string, number>;
      } else if (event.target === 'pet') {
        targetStats = next.pets.find((p) => p.id === event.petId)?.stats as
          | unknown as
          | Record<string, number>
          | undefined;
      } else if (event.target === 'enemy' && next.combat) {
        targetStats = next.combat.enemy.stats as unknown as Record<string, number>;
      }

      if (targetStats) {
        for (const [key, value] of Object.entries(event.changes)) {
          if (value !== undefined && key in targetStats) {
            const current = targetStats[key] ?? 0;
            targetStats[key] = current + value;
          }
        }
        // Clamp to valid ranges (only for properties that exist)
        if ('maxHp' in targetStats && 'hp' in targetStats) {
          targetStats.hp = Math.max(0, Math.min(targetStats.maxHp, targetStats.hp));
        }
        if ('maxQi' in targetStats && 'qi' in targetStats) {
          targetStats.qi = Math.max(0, Math.min(targetStats.maxQi, targetStats.qi));
        }
        if ('maxStamina' in targetStats && 'stamina' in targetStats) {
          targetStats.stamina = Math.max(0, Math.min(targetStats.maxStamina, targetStats.stamina));
        }
      }
      break;
    }

    case 'cultivation_gain': {
      next.player.realm.cultivation = Math.min(100, next.player.realm.cultivation + event.amount);
      break;
    }

    case 'realm_advance': {
      next.player.realm = {
        name: event.newRealm,
        subStage: event.newSubStage,
        progressIndex: event.newProgressIndex,
        cultivation: 0,
      };
      // Recalculate stats
      const newStats = calculateBaseStats(event.newProgressIndex, next.meta.difficulty);
      next.player.baseStats = { ...newStats };
      // Reapply equipment bonuses
      next.player.stats = calculateEffectiveStats(next.player.baseStats, next.player.equipment);
      break;
    }

    case 'item_add': {
      const existing = next.inventory.find(
        (i) => i.id === event.item.id && i.stackable && i.quantity < i.maxStack
      );
      if (existing) {
        existing.quantity = Math.min(existing.maxStack, existing.quantity + event.item.quantity);
      } else {
        next.inventory.push({ ...event.item });
      }
      break;
    }

    case 'item_remove': {
      const idx = next.inventory.findIndex((i) => i.id === event.itemId);
      if (idx >= 0) {
        const item = next.inventory[idx]!;
        item.quantity -= event.quantity;
        if (item.quantity <= 0) {
          next.inventory.splice(idx, 1);
        }
      }
      break;
    }

    case 'item_use': {
      // Item usage effects are handled by the caller (stat_change, etc.)
      // This event is for logging purposes and quantity reduction
      const usedItem = next.inventory.find((i) => i.id === event.itemId);
      if (usedItem) {
        usedItem.quantity -= 1;
        if (usedItem.quantity <= 0) {
          next.inventory = next.inventory.filter((i) => i.id !== event.itemId);
        }
      }
      break;
    }

    case 'equipment_change': {
      const oldItem = next.player.equipment[event.slot];
      next.player.equipment[event.slot] = event.item;
      // If old item exists, return to inventory
      if (oldItem) {
        next.inventory.push(equipmentToGameItem(oldItem));
      }
      // Remove new item from inventory if it was there
      if (event.item) {
        const invIdx = next.inventory.findIndex((i) => i.id === event.item?.id);
        if (invIdx >= 0) {
          next.inventory.splice(invIdx, 1);
        }
      }
      next.player.stats = calculateEffectiveStats(next.player.baseStats, next.player.equipment);
      break;
    }

    case 'combat_start': {
      next.combat = {
        active: true,
        combatType: event.combatType,
        enemy: { ...event.enemy },
        turn: 0,
        playerAction: null,
        enemyAction: null,
        log: [],
        result: 'ongoing',
      };
      next.meta.phase = 'combat';
      break;
    }

    case 'combat_turn': {
      if (next.combat) {
        next.combat.turn = event.turn;
        next.combat.playerAction = event.playerAction;
        next.combat.enemyAction = event.enemyAction;
        next.combat.log.push(event.narrative);
      }
      break;
    }

    case 'combat_end': {
      if (next.combat) {
        next.combat.active = false;
        next.combat.result = event.result;
        // Add loot
        for (const lootItem of event.loot) {
          const existing = next.inventory.find((i) => i.id === lootItem.id && i.stackable);
          if (existing) {
            existing.quantity += lootItem.quantity;
          } else {
            next.inventory.push({ ...lootItem });
          }
        }
      }
      next.meta.phase = 'exploration';
      break;
    }

    case 'location_change': {
      next.world.currentLocationId = event.toId;
      break;
    }

    case 'pet_obtain': {
      next.pets.push({ ...event.pet });
      if (!next.activePetId) {
        next.activePetId = event.pet.id;
      }
      break;
    }

    case 'pet_evolve': {
      const pet = next.pets.find((p) => p.id === event.petId);
      if (pet) {
        pet.evolutionStage = event.newStage;
        pet.evolutionPath = event.newPath as 'normal' | 'divine' | 'demonic';
        pet.stats.hp += 50;
        pet.stats.maxHp += 50;
        pet.stats.attack += 20;
        pet.stats.defense += 15;
        pet.stats.speed += 10;
      }
      break;
    }

    case 'pet_release': {
      next.pets = next.pets.filter((p) => p.id !== event.petId);
      if (next.activePetId === event.petId) {
        next.activePetId = next.pets[0]?.id ?? null;
      }
      break;
    }

    case 'technique_learn': {
      next.player.techniques.push({ ...event.technique });
      break;
    }

    case 'technique_equip': {
      next.equippedTechnique = event.techniqueId;
      // Update equipped flags on all techniques
      for (const tech of next.player.techniques) {
        tech.equipped = tech.id === event.techniqueId;
      }
      break;
    }

    case 'decision_required': {
      next.narrative.pendingDecision = { ...event.decision };
      break;
    }

    case 'decision_resolved': {
      next.narrative.pendingDecision = null;
      break;
    }

    case 'flag_set': {
      next.player.flags[event.key] = event.value;
      break;
    }

    case 'trade': {
      for (const bought of event.bought) {
        const existing = next.inventory.find((i) => i.id === bought.id && i.stackable);
        if (existing) {
          existing.quantity += bought.quantity;
        } else {
          next.inventory.push({ ...bought });
        }
      }
      for (const sold of event.sold) {
        const idx = next.inventory.findIndex((i) => i.id === sold.id);
        if (idx >= 0) {
          const item = next.inventory[idx]!;
          item.quantity -= sold.quantity;
          if (item.quantity <= 0) {
            next.inventory.splice(idx, 1);
          }
        }
      }
      next.player.spiritStones += event.spiritStonesChange;
      break;
    }

    case 'spirit_stones_change': {
      next.player.spiritStones = Math.max(0, next.player.spiritStones + event.amount);
      break;
    }

    case 'title_change': {
      next.player.title = event.newTitle;
      break;
    }

    case 'faction_change': {
      next.player.faction = event.newFaction;
      break;
    }

    case 'game_over': {
      next.meta.phase = 'game_over';
      break;
    }
  }

  next.meta.turn += 1;
  return next;
}

/**
 * 批量应用事件，返回最终状态
 */
export function applyEvents(state: GameState, events: GameEvent[]): GameState {
  return events.reduce((s, e) => gameReducer(s, e), state);
}

// ==================== 装备辅助函数 ====================

/** 将 Equipment 转换为可存入背包的 GameItem */
export function equipmentToGameItem(equipment: Equipment): GameItem {
  return {
    id: equipment.id,
    name: equipment.name,
    type: 'equipment',
    subtype: equipment.subtype,
    description: equipment.description,
    quantity: 1,
    effects: [],
    value: Math.round(
      equipment.realmRequirement * 5 +
        (['凡品', '灵品', '宝品', '仙品', '神品'].indexOf(equipment.grade) + 1) * 20 +
        equipment.specialEffects.length * 15
    ),
    stackable: false,
    maxStack: 1,
    slot: equipment.slot,
    grade: equipment.grade,
    realmRequirement: equipment.realmRequirement,
    durability: equipment.durability,
    maxDurability: equipment.maxDurability,
    equipStats: { ...equipment.stats },
    specialEffects: [...equipment.specialEffects],
  };
}

/** 计算装备被动效果加成（修炼速度等） */
export function calculatePassiveEffects(equipment: Record<EquipmentSlot, Equipment | null>): {
  cultivationBonus: number;
  combatBonus: number;
  defenseBonus: number;
} {
  let cultivationBonus = 0;
  let combatBonus = 0;
  let defenseBonus = 0;

  for (const eq of Object.values(equipment)) {
    if (!eq || eq.durability <= 0) continue;
    for (const effect of eq.specialEffects) {
      switch (effect.trigger) {
        case 'on_cultivate':
          cultivationBonus += effect.value;
          break;
        case 'passive':
          // passive 效果根据 effect 描述判断类型
          if (
            effect.effect.includes('修炼') ||
            effect.effect.includes('悟道') ||
            effect.effect.includes('共鸣')
          ) {
            cultivationBonus += effect.value;
          } else if (
            effect.effect.includes('防御') ||
            effect.effect.includes('护体') ||
            effect.effect.includes('护盾')
          ) {
            defenseBonus += effect.value;
          } else {
            combatBonus += effect.value;
          }
          break;
        default:
          break;
      }
    }
  }

  return { cultivationBonus, combatBonus, defenseBonus };
}

// ==================== 装备属性计算 ====================

export function calculateEffectiveStats(
  baseStats: CoreStats,
  equipment: Record<EquipmentSlot, { stats: Partial<CoreStats> } | null>
): CoreStats {
  const result = { ...baseStats };
  for (const eq of Object.values(equipment)) {
    if (!eq) continue;
    for (const [key, value] of Object.entries(eq.stats)) {
      if (value !== undefined && typeof value === 'number' && key in result) {
        const current = (result as Record<string, number>)[key] ?? 0;
        (result as Record<string, number>)[key] = current + value;
      }
    }
  }
  // Ensure current values don't exceed max
  result.hp = Math.min(result.hp, result.maxHp);
  result.qi = Math.min(result.qi, result.maxQi);
  result.stamina = Math.min(result.stamina, result.maxStamina);
  return result;
}

// ==================== 状态校验 ====================

export function validateState(state: unknown): GameState {
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid game state: not an object');
  }
  const s = state as Record<string, unknown>;
  if (!s.version || typeof s.version !== 'string') {
    throw new Error('Invalid game state: missing version');
  }
  if (!s.player || typeof s.player !== 'object') {
    throw new Error('Invalid game state: missing player');
  }
  return state as GameState;
}

// ==================== 位置辅助 ====================

/** 获取当前所在地点 */
export function getCurrentLocation(state: GameState): Location | undefined {
  return state.world.regions
    .flatMap((r) => r.locations)
    .find((l) => l.id === state.world.currentLocationId);
}
