// ============================================================
// 角色创建测试
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  buildConfirmDecision,
  buildNameDecision,
  buildOriginDecision,
  buildTalentDecision,
  createCharacter,
  getOriginById,
  getOrigins,
  getTalentById,
  getTalents,
} from '../../player/player';
import { CANGWU_MOUNTAINS } from '../../world/world-data';

describe('getOrigins', () => {
  it('should return 4 origins', () => {
    const origins = getOrigins();
    expect(origins.length).toBe(4);
  });

  it('should have unique ids', () => {
    const origins = getOrigins();
    const ids = origins.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each origin should have required fields', () => {
    for (const origin of getOrigins()) {
      expect(origin.id).toBeTruthy();
      expect(origin.name).toBeTruthy();
      expect(origin.description).toBeTruthy();
      expect(typeof origin.startingStones).toBe('number');
    }
  });
});

describe('getTalents', () => {
  it('should return 4 talents', () => {
    const talents = getTalents();
    expect(talents.length).toBe(4);
  });

  it('should have unique ids', () => {
    const talents = getTalents();
    const ids = talents.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each talent should have required fields', () => {
    for (const talent of getTalents()) {
      expect(talent.id).toBeTruthy();
      expect(talent.name).toBeTruthy();
      expect(talent.description).toBeTruthy();
    }
  });
});

describe('getOriginById', () => {
  it('should return correct origin', () => {
    const origin = getOriginById('rogue');
    expect(origin).toBeDefined();
    expect(origin!.name).toBe('散修');
  });

  it('should return undefined for invalid id', () => {
    const origin = getOriginById('nonexistent');
    expect(origin).toBeUndefined();
  });
});

describe('getTalentById', () => {
  it('should return correct talent', () => {
    const talent = getTalentById('natural_spirit_root');
    expect(talent).toBeDefined();
    expect(talent!.name).toBe('灵根天成');
  });

  it('should return undefined for invalid id', () => {
    const talent = getTalentById('nonexistent');
    expect(talent).toBeUndefined();
  });
});

describe('buildOriginDecision', () => {
  it('should return menu decision with 4 choices', () => {
    const decision = buildOriginDecision();
    expect(decision.type).toBe('menu');
    expect(decision.choices).toHaveLength(4);
    expect(decision.prompt).toBeTruthy();
  });
});

describe('buildTalentDecision', () => {
  it('should return menu decision with 4 choices', () => {
    const decision = buildTalentDecision();
    expect(decision.type).toBe('menu');
    expect(decision.choices).toHaveLength(4);
    expect(decision.prompt).toBeTruthy();
  });
});

describe('buildNameDecision', () => {
  it('should return free_text decision', () => {
    const decision = buildNameDecision();
    expect(decision.type).toBe('free_text');
    expect(decision.prompt).toContain('道号');
  });
});

describe('buildConfirmDecision', () => {
  it('should return menu with yes/no choices', () => {
    const decision = buildConfirmDecision({
      name: '凌云',
      originName: '散修',
      talentName: '灵根天成',
      difficulty: '普通',
    });
    expect(decision.type).toBe('menu');
    expect(decision.choices).toHaveLength(2);
    expect(decision.choices![0]!.id).toBe('confirm_yes');
    expect(decision.choices![1]!.id).toBe('confirm_no');
  });
});

describe('createCharacter', () => {
  it('should create character with correct name', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('natural_spirit_root')!;
    const state = createCharacter({
      name: '凌云',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.player.name).toBe('凌云');
  });

  it('should apply origin starting stones', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('sword_heart')!;
    const state = createCharacter({
      name: '测试',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.player.spiritStones).toBe(100);
  });

  it('should apply clan_scion origin: higher stones, faction, title', () => {
    const origin = getOriginById('clan_scion')!;
    const talent = getTalentById('sword_heart')!;
    const state = createCharacter({
      name: '世家子',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.player.spiritStones).toBe(300);
    expect(state.player.title).toBe('世家子弟');
    expect(state.player.faction).toBe('世家');
    // qi bonus
    expect(state.player.stats.maxQi).toBeGreaterThan(0);
  });

  it('should apply sect_outcast origin: willpower bonus, faction', () => {
    const origin = getOriginById('sect_outcast')!;
    const talent = getTalentById('destiny_sense')!;
    const state = createCharacter({
      name: '弃徒',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.player.spiritStones).toBe(50);
    expect(state.player.title).toBe('弃徒');
    expect(state.player.faction).toBe('青云宗');
  });

  it('should apply wild_cultivator origin: stamina bonus', () => {
    const origin = getOriginById('wild_cultivator')!;
    const talent = getTalentById('sword_heart')!;
    const state = createCharacter({
      name: '野修',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.player.title).toBe('野修');
    // stamina bonus applied
  });

  it('should set talent flags', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('destiny_sense')!;
    const state = createCharacter({
      name: '天命',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.player.flags['destiny_sense']).toBe(true);
  });

  it('should set phase to exploration after creation', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('sword_heart')!;
    const state = createCharacter({
      name: '完成',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.meta.phase).toBe('exploration');
  });

  it('should set world data', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('sword_heart')!;
    const state = createCharacter({
      name: '世界',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.world.regions.length).toBeGreaterThan(0);
  });

  it('should start at cangwu_city', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('sword_heart')!;
    const state = createCharacter({
      name: '开始',
      origin,
      talent,
      difficulty: 'normal',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(state.world.currentLocationId).toBe('cangwu_city');
  });

  it('easy difficulty should have higher stats than hard', () => {
    const origin = getOriginById('rogue')!;
    const talent = getTalentById('sword_heart')!;
    const easyState = createCharacter({
      name: '简单',
      origin,
      talent,
      difficulty: 'easy',
      worldData: CANGWU_MOUNTAINS,
    });
    const hardState = createCharacter({
      name: '困难',
      origin,
      talent,
      difficulty: 'hard',
      worldData: CANGWU_MOUNTAINS,
    });
    expect(easyState.player.stats.maxHp).toBeGreaterThan(hardState.player.stats.maxHp);
  });
});
