import { describe, expect, it } from 'vitest';
import {
  combatEnd,
  combatStart,
  createMenuDecision,
  cultivationGain,
  decisionRequired,
  decisionResolved,
  equipmentChange,
  factionChange,
  flagSet,
  gameOver,
  itemAdd,
  itemRemove,
  locationChange,
  narrative,
  petEvolve,
  petObtain,
  realmAdvance,
  spiritStonesChange,
  statChange,
  techniqueEquip,
  techniqueLearn,
  titleChange,
  trade,
} from '../../game/events';
import {
  applyEvents,
  calculateBaseStats,
  calculateEffectiveStats,
  createInitialState,
  gameReducer,
  getCurrentLocation,
  getRealmFromProgress,
  getRealmProgressIndex,
  REALM_DEFINITIONS,
} from '../../game/state';
import type {
  CoreStats,
  Equipment,
  EquipmentSlot,
  GameState,
  Region,
  SpiritPet,
} from '../../game/types';

// ==================== 辅助函数 ====================

function createTestState(overrides?: Partial<GameState>): GameState {
  const state = createInitialState('测试修士', 'normal');
  return { ...state, ...overrides };
}

function createTestEquipment(slot: EquipmentSlot, stats: Partial<CoreStats>): Equipment {
  return {
    id: `test_${slot}`,
    name: `测试${slot}`,
    type: 'equipment',
    slot,
    subtype: '飞剑',
    grade: '灵品',
    stats,
    realmRequirement: 0,
    durability: 100,
    maxDurability: 100,
    specialEffects: [],
    description: '测试装备',
  };
}

function createTestItem(id: string, quantity = 1): Parameters<typeof itemAdd>[0] {
  return {
    id,
    name: `测试物品${id}`,
    type: 'consumable',
    subtype: 'pill',
    description: '测试物品',
    quantity,
    effects: [],
    value: 10,
    stackable: true,
    maxStack: 99,
  };
}

// ==================== 初始状态测试 ====================

describe('createInitialState', () => {
  it('should create a valid initial game state', () => {
    const state = createInitialState('张三', 'normal');

    expect(state.version).toBe('1.0.0');
    expect(state.player.name).toBe('张三');
    expect(state.player.title).toBe('散修');
    expect(state.player.realm.name).toBe('炼气');
    expect(state.player.realm.subStage).toBe('前期');
    expect(state.player.realm.progressIndex).toBe(0);
    expect(state.player.realm.cultivation).toBe(0);
    expect(state.player.spiritStones).toBe(100);
    expect(state.player.equipment.weapon).toBeNull();
    expect(state.player.equipment.armor).toBeNull();
    expect(state.inventory).toEqual([]);
    expect(state.pets).toEqual([]);
    expect(state.combat).toBeNull();
    expect(state.meta.phase).toBe('character_creation');
    expect(state.meta.turn).toBe(0);
  });

  it('should create state with different difficulties', () => {
    const easyState = createInitialState('测试', 'easy');
    const normalState = createInitialState('测试', 'normal');
    const hardState = createInitialState('测试', 'hard');

    // Easy should have higher stats
    expect(easyState.player.stats.maxHp).toBeGreaterThan(hardState.player.stats.maxHp);
    // Normal should be between
    expect(normalState.player.stats.maxHp).toBeGreaterThan(hardState.player.stats.maxHp);
    expect(normalState.player.stats.maxHp).toBeLessThan(easyState.player.stats.maxHp);
  });

  it('should accept worldData parameter and populate regions', () => {
    const mockRegion: Region = {
      name: 'Test Region',
      description: 'Test',
      locations: [
        {
          id: 'test_location',
          name: 'Test Location',
          region: 'Test Region',
          type: 'city',
          dangerLevel: 1,
          realmSuitability: 0,
          connections: [],
          npcs: [],
          description: 'Test location description',
        },
      ],
      dominantFaction: '',
      realmRange: [0, 8],
    };

    const state = createInitialState('测试', 'normal', [mockRegion]);
    expect(state.world.regions).toHaveLength(1);
    expect(state.world.regions[0]?.locations[0]?.id).toBe('test_location');
  });

  it('should have empty regions when worldData not provided (backwards compat)', () => {
    const state = createInitialState('测试', 'normal');
    expect(state.world.regions).toEqual([]);
  });
});

describe('getCurrentLocation', () => {
  it('should return location matching currentLocationId', () => {
    const mockRegion: Region = {
      name: 'Test',
      description: '',
      locations: [
        {
          id: 'current_loc',
          name: 'Current',
          region: 'Test',
          type: 'city',
          dangerLevel: 1,
          realmSuitability: 0,
          connections: [],
          npcs: [],
          description: 'Current location',
        },
      ],
      dominantFaction: '',
      realmRange: [0, 0],
    };

    const state = createInitialState('测试', 'normal', [mockRegion]);
    state.world.currentLocationId = 'current_loc';

    const loc = getCurrentLocation(state);
    expect(loc).toBeDefined();
    expect(loc?.id).toBe('current_loc');
  });

  it('should return undefined when location not found', () => {
    const state = createInitialState('测试', 'normal');
    state.world.currentLocationId = 'nonexistent';
    expect(getCurrentLocation(state)).toBeUndefined();
  });
});

// ==================== 境界系统测试 ====================

describe('Realm System', () => {
  it('getRealmProgressIndex should calculate correct index', () => {
    expect(getRealmProgressIndex('炼气', '前期')).toBe(0);
    expect(getRealmProgressIndex('炼气', '圆满')).toBe(3);
    expect(getRealmProgressIndex('筑基', '前期')).toBe(4);
    expect(getRealmProgressIndex('金丹', '中期')).toBe(9);
    expect(getRealmProgressIndex('渡劫', '圆满')).toBe(35);
  });

  it('getRealmFromProgress should return correct realm', () => {
    expect(getRealmFromProgress(0)).toMatchObject({ name: '炼气', subStage: '前期' });
    expect(getRealmFromProgress(4)).toMatchObject({ name: '筑基', subStage: '前期' });
    expect(getRealmFromProgress(8)).toMatchObject({ name: '金丹', subStage: '前期' });
    expect(getRealmFromProgress(35)).toMatchObject({ name: '渡劫', subStage: '圆满' });
  });

  it('getRealmFromProgress should clamp to valid range', () => {
    expect(getRealmFromProgress(-1).progressIndex).toBe(0);
    expect(getRealmFromProgress(100).progressIndex).toBe(35);
  });

  it('should have all 9 realm definitions', () => {
    const names = Object.keys(REALM_DEFINITIONS);
    expect(names).toHaveLength(9);
    expect(names[0]).toBe('炼气');
    expect(names[8]).toBe('渡劫');
  });

  it('calculateBaseStats should scale with realm progress', () => {
    const lowStats = calculateBaseStats(0, 'normal');
    const midStats = calculateBaseStats(16, 'normal'); // ~元婴
    const highStats = calculateBaseStats(32, 'normal'); // ~大乘

    expect(midStats.maxHp).toBeGreaterThan(lowStats.maxHp);
    expect(highStats.maxHp).toBeGreaterThan(midStats.maxHp);
    expect(midStats.willpower).toBeGreaterThan(lowStats.willpower);
  });
});

// ==================== Reducer 测试 ====================

describe('gameReducer', () => {
  describe('narrative event', () => {
    it('should update currentScene and add to history', () => {
      const state = createTestState({
        meta: { ...createInitialState('测试').meta, phase: 'exploration' },
      });
      const event = narrative('narrator', '一阵清风吹过竹林');

      const next = gameReducer(state, event);

      expect(next.narrative.currentScene).toBe('一阵清风吹过竹林');
      expect(next.narrative.history).toHaveLength(1);
      expect(next.narrative.history[0]?.speaker).toBe('narrator');
      expect(next.meta.turn).toBe(state.meta.turn + 1);
    });
  });

  describe('stat_change event', () => {
    it('should modify player stats', () => {
      const state = createTestState();
      const initialHp = state.player.stats.hp;
      const event = statChange('player', { hp: -10 });

      const next = gameReducer(state, event);

      expect(next.player.stats.hp).toBe(initialHp - 10);
    });

    it('should clamp HP to valid range', () => {
      const state = createTestState();
      // Try to add more HP than max
      const event = statChange('player', { hp: 99999 });
      const next = gameReducer(state, event);
      expect(next.player.stats.hp).toBe(next.player.stats.maxHp);

      // Try to go negative
      const event2 = statChange('player', { hp: -99999 });
      const next2 = gameReducer(state, event2);
      expect(next2.player.stats.hp).toBe(0);
    });

    it('should clamp Qi and Stamina to valid ranges', () => {
      const state = createTestState();

      const overEvent = statChange('player', { qi: 99999, stamina: 99999 });
      const overNext = gameReducer(state, overEvent);
      expect(overNext.player.stats.qi).toBe(overNext.player.stats.maxQi);
      expect(overNext.player.stats.stamina).toBe(overNext.player.stats.maxStamina);

      const underEvent = statChange('player', { qi: -99999, stamina: -99999 });
      const underNext = gameReducer(state, underEvent);
      expect(underNext.player.stats.qi).toBe(0);
      expect(underNext.player.stats.stamina).toBe(0);
    });
  });

  describe('cultivation_gain event', () => {
    it('should increase cultivation value', () => {
      const state = createTestState();
      const event = cultivationGain(30);

      const next = gameReducer(state, event);

      expect(next.player.realm.cultivation).toBe(30);
    });

    it('should cap cultivation at 100', () => {
      const state = createTestState();
      // Apply cultivation to max
      let next = gameReducer(state, cultivationGain(50));
      next = gameReducer(next, cultivationGain(60));

      expect(next.player.realm.cultivation).toBe(100);
    });
  });

  describe('realm_advance event', () => {
    it('should advance realm and recalculate stats', () => {
      const state = createTestState();
      const event = realmAdvance('中期', '炼气', 1);

      const next = gameReducer(state, event);

      expect(next.player.realm.name).toBe('炼气');
      expect(next.player.realm.subStage).toBe('中期');
      expect(next.player.realm.progressIndex).toBe(1);
      expect(next.player.realm.cultivation).toBe(0);
    });
  });

  describe('item_add event', () => {
    it('should add new item to inventory', () => {
      const state = createTestState();
      const item = createTestItem('pill_01');
      const event = itemAdd(item);

      const next = gameReducer(state, event);

      expect(next.inventory).toHaveLength(1);
      expect(next.inventory[0]?.id).toBe('pill_01');
    });

    it('should stack stackable items', () => {
      const state = createTestState();
      const item1 = createTestItem('pill_01', 3);
      const item2 = createTestItem('pill_01', 2);

      let next = gameReducer(state, itemAdd(item1));
      next = gameReducer(next, itemAdd(item2));

      expect(next.inventory).toHaveLength(1);
      expect(next.inventory[0]?.quantity).toBe(5);
    });
  });

  describe('item_remove event', () => {
    it('should remove item quantity', () => {
      const state = createTestState();
      const item = createTestItem('pill_01', 5);
      let next = gameReducer(state, itemAdd(item));

      next = gameReducer(next, itemRemove('pill_01', 2));

      expect(next.inventory[0]?.quantity).toBe(3);
    });

    it('should remove item when quantity reaches 0', () => {
      const state = createTestState();
      const item = createTestItem('pill_01', 3);
      let next = gameReducer(state, itemAdd(item));

      next = gameReducer(next, itemRemove('pill_01', 3));

      expect(next.inventory).toHaveLength(0);
    });
  });

  describe('equipment_change event', () => {
    it('should equip item to correct slot', () => {
      const state = createTestState();
      const weapon = createTestEquipment('weapon', { maxHp: 50 });

      const next = gameReducer(state, equipmentChange('weapon', weapon));

      expect(next.player.equipment.weapon).not.toBeNull();
      expect(next.player.equipment.weapon?.id).toBe('test_weapon');
    });

    it('should unequip and return old equipment to inventory', () => {
      const state = createTestState();
      const weapon1 = createTestEquipment('weapon', { maxHp: 50 });
      const weapon2 = { ...createTestEquipment('weapon', { maxHp: 80 }), id: 'better_weapon' };

      let next = gameReducer(state, equipmentChange('weapon', weapon1));
      next = gameReducer(next, equipmentChange('weapon', weapon2));

      expect(next.player.equipment.weapon?.id).toBe('better_weapon');
      // Old weapon should be in inventory
      const oldWeapon = next.inventory.find((i) => i.id === 'test_weapon');
      expect(oldWeapon).toBeDefined();
    });
  });

  describe('combat events', () => {
    it('should start combat', () => {
      const state = createTestState();
      const event = combatStart(
        {
          id: 'stone_golem',
          name: '石魔',
          type: 'minor',
          realm: getRealmFromProgress(2),
          stats: { hp: 50, maxHp: 50, qi: 0, maxQi: 0, stamina: 10, maxStamina: 10, willpower: 5 },
          attack: 10,
          defense: 5,
          skills: [],
          loot: { guaranteed: [], possible: [], experience: 20 },
          description: '一块石头变成的魔物',
          behavior: 'aggressive',
        },
        'minor'
      );

      const next = gameReducer(state, event);

      expect(next.combat).not.toBeNull();
      expect(next.combat?.active).toBe(true);
      expect(next.combat?.enemy.name).toBe('石魔');
      expect(next.meta.phase).toBe('combat');
    });

    it('should end combat and add loot', () => {
      const state = createTestState();
      const startEvent = combatStart(
        {
          id: 'stone_golem',
          name: '石魔',
          type: 'minor',
          realm: getRealmFromProgress(2),
          stats: { hp: 0, maxHp: 50, qi: 0, maxQi: 0, stamina: 0, maxStamina: 10, willpower: 0 },
          attack: 10,
          defense: 5,
          skills: [],
          loot: { guaranteed: [], possible: [], experience: 20 },
          description: '',
          behavior: '',
        },
        'minor'
      );

      let next = gameReducer(state, startEvent);
      const lootItem = createTestItem('stone_core', 3);
      next = gameReducer(next, combatEnd('victory', [lootItem]));

      expect(next.combat?.active).toBe(false);
      expect(next.combat?.result).toBe('victory');
      expect(next.meta.phase).toBe('exploration');
      expect(next.inventory.find((i) => i.id === 'stone_core')?.quantity).toBe(3);
    });
  });

  describe('location_change event', () => {
    it('should change current location', () => {
      const state = createTestState();
      const event = locationChange('cangwu_city', 'spirit_valley');

      const next = gameReducer(state, event);

      expect(next.world.currentLocationId).toBe('spirit_valley');
    });
  });

  describe('pet events', () => {
    it('should obtain pet', () => {
      const state = createTestState();
      const pet: SpiritPet = {
        id: 'spirit_fox',
        templateId: 'spirit_fox',
        name: '灵狐',
        species: '九尾灵狐',
        level: 1,
        loyalty: 50,
        stats: { hp: 30, maxHp: 30, attack: 5, defense: 3, speed: 10 },
        skills: [],
        evolutionStage: 0,
        evolutionPath: 'normal',
        description: '一只通体雪白的灵狐',
      };

      const next = gameReducer(state, petObtain(pet));

      expect(next.pets).toHaveLength(1);
      expect(next.activePetId).toBe('spirit_fox');
    });

    it('should evolve pet', () => {
      const state = createTestState();
      const pet: SpiritPet = {
        id: 'spirit_fox',
        templateId: 'spirit_fox',
        name: '灵狐',
        species: '九尾灵狐',
        level: 1,
        loyalty: 50,
        stats: { hp: 30, maxHp: 30, attack: 5, defense: 3, speed: 10 },
        skills: [],
        evolutionStage: 0,
        evolutionPath: 'normal',
        description: '',
      };

      let next = gameReducer(state, petObtain(pet));
      const obtainedPet = next.pets[0];
      expect(obtainedPet).toBeDefined();
      const oldHp = obtainedPet?.stats.hp ?? 0;
      // divine chain for spirit_fox starts at stage 2
      next = gameReducer(next, petEvolve('spirit_fox', 2, 'divine'));

      const evolvedPet = next.pets[0];
      expect(evolvedPet).toBeDefined();
      expect(evolvedPet?.evolutionStage).toBe(2);
      expect(evolvedPet?.evolutionPath).toBe('divine');
      expect(evolvedPet?.stats.hp).toBeGreaterThan(oldHp);
      // species name should have changed
      expect(evolvedPet?.species).toBe('三尾灵狐');
    });
  });

  describe('technique events', () => {
    it('should learn technique', () => {
      const state = createTestState();
      const event = techniqueLearn({
        id: 'sword_art_1',
        name: '清风剑诀',
        type: 'technique',
        grade: '灵品',
        realmRequirement: 0,
        skills: [],
        passiveEffects: [],
        description: '基础剑法',
        equipped: false,
      });

      const next = gameReducer(state, event);

      expect(next.player.techniques).toHaveLength(1);
      expect(next.player.techniques[0]?.name).toBe('清风剑诀');
    });

    it('should equip technique', () => {
      const state = createTestState();
      let next = gameReducer(
        state,
        techniqueLearn({
          id: 'sword_art_1',
          name: '清风剑诀',
          type: 'technique',
          grade: '灵品',
          realmRequirement: 0,
          skills: [],
          passiveEffects: [],
          description: '',
          equipped: false,
        })
      );

      next = gameReducer(next, techniqueEquip('sword_art_1'));

      expect(next.equippedTechnique).toBe('sword_art_1');
      expect(next.player.techniques[0]?.equipped).toBe(true);
    });
  });

  describe('decision events', () => {
    it('should set pending decision', () => {
      const state = createTestState();
      const decision = createMenuDecision('你要怎么做？', [
        { id: 'go', label: '前进', description: '继续向前' },
      ]);

      const next = gameReducer(state, decisionRequired(decision));

      expect(next.narrative.pendingDecision).not.toBeNull();
      expect(next.narrative.pendingDecision?.prompt).toBe('你要怎么做？');
    });

    it('should clear pending decision', () => {
      const state = createTestState();
      const decision = createMenuDecision('你要怎么做？', []);
      let next = gameReducer(state, decisionRequired(decision));
      next = gameReducer(next, decisionResolved('go'));

      expect(next.narrative.pendingDecision).toBeNull();
    });
  });

  describe('flag_set event', () => {
    it('should set player flags', () => {
      const state = createTestState();
      const next = gameReducer(state, flagSet('met_elder', true));

      expect(next.player.flags.met_elder).toBe(true);
    });
  });

  describe('trade event', () => {
    it('should process trade correctly', () => {
      const state = createTestState();
      const bought = [createTestItem('sword', 1)];
      const sold = [createTestItem('herb', 5)];

      let next = gameReducer(state, itemAdd(createTestItem('herb', 10)));
      next = gameReducer(next, trade(bought, sold, -50));

      // Herb should be reduced
      const herb = next.inventory.find((i) => i.id === 'herb');
      expect(herb?.quantity).toBe(5);
      // Sword should be added
      const sword = next.inventory.find((i) => i.id === 'sword');
      expect(sword).toBeDefined();
      // Spirit stones should decrease
      expect(next.player.spiritStones).toBe(50);
    });
  });

  describe('spirit_stones_change event', () => {
    it('should modify spirit stones and not go below 0', () => {
      const state = createTestState();

      const next = gameReducer(state, spiritStonesChange(200, '奖励'));
      expect(next.player.spiritStones).toBe(300);

      const next2 = gameReducer(next, spiritStonesChange(-500, '被偷'));
      expect(next2.player.spiritStones).toBe(0);
    });
  });

  describe('title and faction events', () => {
    it('should change player title', () => {
      const state = createTestState();
      const next = gameReducer(state, titleChange('青云弟子'));
      expect(next.player.title).toBe('青云弟子');
    });

    it('should change player faction', () => {
      const state = createTestState();
      const next = gameReducer(state, factionChange('青云宗'));
      expect(next.player.faction).toBe('青云宗');
    });
  });

  describe('game_over event', () => {
    it('should set phase to game_over', () => {
      const state = createTestState();
      const next = gameReducer(state, gameOver('力竭而亡'));
      expect(next.meta.phase).toBe('game_over');
    });
  });
});

// ==================== applyEvents 测试 ====================

describe('applyEvents', () => {
  it('should apply multiple events in sequence', () => {
    const state = createInitialState('测试修士');
    const events = [
      narrative('narrator', '欢迎来到苍梧山脉'),
      cultivationGain(30),
      cultivationGain(40),
      spiritStonesChange(50, '发现灵石'),
    ];

    const next = applyEvents(state, events);

    expect(next.player.realm.cultivation).toBe(70);
    expect(next.player.spiritStones).toBe(150);
    expect(next.meta.turn).toBe(4);
    expect(next.narrative.history).toHaveLength(1);
  });
});

// ==================== 属性计算测试 ====================

describe('calculateEffectiveStats', () => {
  it('should add equipment stats to base stats', () => {
    const base: CoreStats = {
      hp: 100,
      maxHp: 100,
      qi: 50,
      maxQi: 50,
      stamina: 30,
      maxStamina: 30,
      willpower: 10,
    };
    const equipment = {
      weapon: { stats: { maxHp: 20, hp: 20 } },
      armor: null,
      treasure: null,
      accessory: null,
    };

    const result = calculateEffectiveStats(base, equipment);

    expect(result.maxHp).toBe(120);
    expect(result.hp).toBe(120);
  });

  it('should clamp current values to max', () => {
    const base: CoreStats = {
      hp: 150,
      maxHp: 100,
      qi: 100,
      maxQi: 80,
      stamina: 50,
      maxStamina: 40,
      willpower: 10,
    };
    const equipment = {
      weapon: null,
      armor: null,
      treasure: null,
      accessory: null,
    };

    const result = calculateEffectiveStats(base, equipment);

    expect(result.hp).toBe(100);
    expect(result.qi).toBe(80);
    expect(result.stamina).toBe(40);
  });
});
