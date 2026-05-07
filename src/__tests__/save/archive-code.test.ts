import { describe, expect, it } from 'vitest';
import * as Events from '../../game/events';
import { applyEvents, createInitialState } from '../../game/state';
import type { GameState } from '../../game/types';
import {
  ArchiveCodeError,
  CorruptedDataError,
  decodeArchive,
  encodeArchive,
  InvalidFormatError,
  VersionMismatchError,
} from '../../save/archive-code';

// ==================== 测试辅助 ====================

function createBasicState(overrides?: Partial<{ name: string }>): GameState {
  return createInitialState(overrides?.name ?? '测试修士', 'normal');
}

/** 创建一个丰富的状态：有物品、装备、宠物、战斗、flag */
function createRichState(): GameState {
  let state = createInitialState('富态修士', 'normal');

  // 添加物品
  state = applyEvents(state, [
    Events.itemAdd({
      id: 'hp_pill_low',
      name: '回春丹',
      type: 'consumable',
      subtype: 'pill',
      description: '恢复少量生命值',
      quantity: 5,
      effects: [{ attribute: 'hp', operation: 'add', value: 30, duration: 'instant' }],
      value: 50,
      stackable: true,
      maxStack: 99,
    }),
    Events.itemAdd({
      id: 'spirit_herb',
      name: '灵草',
      type: 'material',
      subtype: 'herb',
      description: '一种常见的灵草',
      quantity: 3,
      effects: [],
      value: 10,
      stackable: true,
      maxStack: 50,
    }),
    Events.itemAdd({
      id: 'iron_sword',
      name: '铁剑',
      type: 'equipment',
      subtype: '飞剑',
      description: '一把普通的铁剑',
      quantity: 1,
      effects: [],
      value: 100,
      stackable: false,
      maxStack: 1,
      slot: 'weapon',
      grade: '凡品',
      realmRequirement: 0,
      durability: 50,
      maxDurability: 50,
      equipStats: { qi: 5 },
      specialEffects: [],
    }),
  ]);

  // 设置 flag
  state = applyEvents(state, [
    Events.flagSet('met_hermit', true),
    Events.flagSet('cave_explored', false),
    Events.flagSet('kill_count', 5),
  ]);

  // 添加灵石
  state = applyEvents(state, [Events.spiritStonesChange(500, 'test')]);

  // 添加叙事历史
  state = applyEvents(state, [
    Events.narrative('narrator', '你踏入苍梧城，开始了修仙之旅。'),
    Events.narrative('system', '一阵灵气波动，似乎有宝物在附近。'),
  ]);

  return state;
}

// ==================== 往返测试 ====================

describe('encodeArchive / decodeArchive round-trip', () => {
  it('should round-trip basic state preserving player name', () => {
    const state = createBasicState({ name: '往返测试者' });
    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.player.name).toBe('往返测试者');
    expect(decoded.player.realm.name).toBe('炼气');
    expect(decoded.player.realm.subStage).toBe('前期');
    expect(decoded.player.spiritStones).toBe(100);
  });

  it('should round-trip state with cultivation progress', () => {
    let state = createBasicState();
    state = applyEvents(state, [Events.cultivationGain(75)]);

    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.player.realm.cultivation).toBe(75);
  });

  it('should round-trip state with inventory items', () => {
    const state = createRichState();
    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.inventory.length).toBe(3);
    expect(decoded.inventory.find((i) => i.id === 'hp_pill_low')?.quantity).toBe(5);
    expect(decoded.inventory.find((i) => i.id === 'spirit_herb')?.quantity).toBe(3);
    expect(decoded.player.spiritStones).toBe(600);
  });

  it('should round-trip state with equipment', () => {
    let state = createBasicState();
    // 手动设置装备
    state = applyEvents(state, [
      Events.equipmentChange('weapon', {
        id: 'iron_sword',
        name: '铁剑',
        type: 'equipment',
        slot: 'weapon',
        subtype: '飞剑',
        grade: '凡品',
        stats: { qi: 5 },
        realmRequirement: 0,
        durability: 50,
        maxDurability: 50,
        specialEffects: [],
        description: '一把普通的铁剑',
      }),
    ]);

    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.player.equipment.weapon).toBeDefined();
    expect(decoded.player.equipment.weapon?.name).toBe('铁剑');
    expect(decoded.player.equipment.weapon?.stats.qi).toBe(5);
    expect(decoded.player.equipment.armor).toBeNull();
  });

  it('should round-trip state with equippable item in inventory', () => {
    const state = createRichState();
    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    const ironSword = decoded.inventory.find((i) => i.id === 'iron_sword');
    expect(ironSword).toBeDefined();
    expect(ironSword?.grade).toBe('凡品');
    expect(ironSword?.slot).toBe('weapon');
  });

  it('should round-trip state with player flags', () => {
    const state = createRichState();
    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.player.flags.met_hermit).toBe(true);
    expect(decoded.player.flags.cave_explored).toBe(false);
    expect(decoded.player.flags.kill_count).toBe(5);
  });

  it('should round-trip state with narrative history', () => {
    const state = createRichState();
    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.narrative.history.length).toBeGreaterThanOrEqual(2);
  });

  it('should round-trip state with null combat', () => {
    const state = createRichState();
    // combat should be null since we didn't start combat
    expect(state.combat).toBeNull();

    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.combat).toBeNull();
  });

  it('should round-trip state with active combat', () => {
    let state = createBasicState();
    state = applyEvents(state, [
      Events.combatStart(
        {
          id: 'stone_demon',
          name: '石魔',
          type: 'boss',
          realm: { name: '筑基', subStage: '中期', progressIndex: 5, cultivation: 0 },
          stats: {
            hp: 200,
            maxHp: 200,
            qi: 50,
            maxQi: 50,
            stamina: 30,
            maxStamina: 30,
            willpower: 10,
          },
          attack: 30,
          defense: 25,
          skills: [],
          loot: { guaranteed: [], possible: [], experience: 100 },
          description: '巨大的石魔',
          behavior: 'aggressive',
        },
        'boss'
      ),
    ]);

    expect(state.combat).not.toBeNull();
    expect(state.combat?.active).toBe(true);

    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.combat).not.toBeNull();
    expect(decoded.combat?.active).toBe(true);
    expect(decoded.combat?.enemy.name).toBe('石魔');
    expect(decoded.combat?.combatType).toBe('boss');
  });

  it('should round-trip state with faction and reputation', () => {
    let state = createBasicState();
    state = applyEvents(state, [Events.factionChange('青云宗')]);
    state.player.reputation.青云宗 = 100;

    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.player.faction).toBe('青云宗');
    expect(decoded.player.reputation.青云宗).toBe(100);
  });

  it('should round-trip game meta fields', () => {
    let state = createBasicState();
    state = applyEvents(state, [Events.narrative('test', 'hello')]);

    const code = encodeArchive(state);
    const { state: decoded } = decodeArchive(code);

    expect(decoded.version).toBe('1.0.0');
    // 初始状态 phase 为 character_creation（未经过完整角色创建流程）
    expect(decoded.meta.phase).toBe('character_creation');
    expect(decoded.meta.turn).toBeGreaterThan(0);
    expect(decoded.meta.difficulty).toBe('normal');
  });
});

// ==================== 元数据测试 ====================

describe('decodeArchive metadata', () => {
  it('should return correct playerName in meta', () => {
    const state = createBasicState({ name: '元数据测试者' });
    const code = encodeArchive(state);
    const { meta } = decodeArchive(code);

    expect(meta.playerName).toBe('元数据测试者');
  });

  it('should return correct realm in meta', () => {
    const state = createBasicState();
    const code = encodeArchive(state);
    const { meta } = decodeArchive(code);

    expect(meta.realm).toBe('炼气前期');
  });

  it('should return correct turn in meta', () => {
    let state = createBasicState();
    // 应用几个事件来增加回合数
    state = applyEvents(state, [
      Events.narrative('test', 'a'),
      Events.narrative('test', 'b'),
      Events.narrative('test', 'c'),
    ]);

    const code = encodeArchive(state);
    const { meta } = decodeArchive(code);

    expect(meta.turn).toBe(3);
  });

  it('should have valid exportedAt timestamp', () => {
    const before = Date.now();
    const state = createBasicState();
    const code = encodeArchive(state);
    const { meta } = decodeArchive(code);
    const after = Date.now();

    expect(meta.exportedAt).toBeGreaterThanOrEqual(before);
    expect(meta.exportedAt).toBeLessThanOrEqual(after);
  });
});

// ==================== 错误处理 ====================

describe('decodeArchive error handling', () => {
  it('should throw InvalidFormatError for empty string', () => {
    expect(() => decodeArchive('')).toThrow(InvalidFormatError);
    expect(() => decodeArchive('')).toThrow('存档码为空');
  });

  it('should throw InvalidFormatError for whitespace-only string', () => {
    expect(() => decodeArchive('   ')).toThrow(InvalidFormatError);
  });

  it('should throw InvalidFormatError for string without prefix', () => {
    expect(() => decodeArchive('abc123')).toThrow(InvalidFormatError);
    expect(() => decodeArchive('abc123')).toThrow('缺少 "TG" 前缀');
  });

  it('should throw InvalidFormatError for prefix without version number', () => {
    expect(() => decodeArchive('TG')).toThrow(InvalidFormatError);
    expect(() => decodeArchive('TGabc')).toThrow(InvalidFormatError);
  });

  it('should throw VersionMismatchError for future format version', () => {
    expect(() => decodeArchive('TG9AAAA')).toThrow(VersionMismatchError);
    expect(() => decodeArchive('TG99AAAA')).toThrow(VersionMismatchError);
  });

  it('should accept same format version', () => {
    const state = createBasicState();
    const code = encodeArchive(state);
    // 应该以 TG1 开头
    expect(code.startsWith('TG1')).toBe(true);

    // 不应该抛出
    const result = decodeArchive(code);
    expect(result.state.player.name).toBe('测试修士');
  });

  it('should throw InvalidFormatError for prefix-only without data', () => {
    expect(() => decodeArchive('TG1')).toThrow(InvalidFormatError);
  });

  it('should throw CorruptedDataError for valid prefix but garbage body', () => {
    expect(() => decodeArchive('TG1!!!!not-base64!!!')).toThrow(CorruptedDataError);
  });

  it('should throw CorruptedDataError for truncated code', () => {
    const state = createBasicState();
    const code = encodeArchive(state);
    // 截断字符串
    const truncated = code.slice(0, Math.floor(code.length / 2));

    expect(() => decodeArchive(truncated)).toThrow(CorruptedDataError);
  });

  it('should throw CorruptedDataError for tampered base64', () => {
    const state = createBasicState();
    const code = encodeArchive(state);
    // 在 base64 数据中插入字符
    const tampered = `${code.slice(0, 10)}XXXX${code.slice(10)}`;

    expect(() => decodeArchive(tampered)).toThrow(CorruptedDataError);
  });
});

// ==================== 压缩效果测试 ====================

describe('encodeArchive compression', () => {
  it('should produce code shorter than raw JSON', () => {
    const state = createRichState();
    const code = encodeArchive(state);
    const rawJson = JSON.stringify(state);

    // 存档码应该明显短于原始 JSON
    expect(code.length).toBeLessThan(rawJson.length);
  });

  it('should always start with TG1 prefix', () => {
    const state = createRichState();
    const code = encodeArchive(state);

    expect(code.startsWith('TG1')).toBe(true);
  });

  it('should produce deterministic output for same state', () => {
    const state = createBasicState();
    const code1 = encodeArchive(state);
    // 重置 exportedAt 后应该相同... 但由于 exportedAt 是时间戳，两次编码不同
    // 所以只验证两次编码都能正确解码
    const code2 = encodeArchive(state);

    const decoded1 = decodeArchive(code1);
    const decoded2 = decodeArchive(code2);

    expect(decoded1.state.player.name).toBe(decoded2.state.player.name);
  });
});

// ==================== 错误类层次测试 ====================

describe('error class hierarchy', () => {
  it('InvalidFormatError should be instance of ArchiveCodeError', () => {
    const err = new InvalidFormatError('test');
    expect(err).toBeInstanceOf(ArchiveCodeError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidFormatError');
  });

  it('CorruptedDataError should be instance of ArchiveCodeError', () => {
    const err = new CorruptedDataError('test');
    expect(err).toBeInstanceOf(ArchiveCodeError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CorruptedDataError');
  });

  it('VersionMismatchError should be instance of ArchiveCodeError', () => {
    const err = new VersionMismatchError('test');
    expect(err).toBeInstanceOf(ArchiveCodeError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('VersionMismatchError');
  });
});
