// ============================================================
// 灵宠服务 单元测试
// ============================================================

import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../game/state';
import type { GameState, SpiritPet } from '../../game/types';
import { createPetFromTemplate, getPetTemplateById } from '../../pet/pet-data';
import {
  attemptPetEvolution,
  calcPetLevelUpStats,
  calculatePetBasicDamage,
  calculatePetSkillDamage,
  checkLoyaltyCombatEffect,
  feedPet,
  getActivePet,
  getAvailablePetSkills,
  getPetByQuery,
  interactWithPet,
} from '../../pet/pet-service';

// ==================== 辅助 ====================

function makeTestState(): GameState {
  const state = createInitialState('测试修士', 'normal', []);
  state.player.realm = { name: '筑基', subStage: '前期', progressIndex: 4, cultivation: 0 };
  state.player.stats = {
    hp: 200,
    maxHp: 200,
    qi: 100,
    maxQi: 100,
    stamina: 80,
    maxStamina: 80,
    willpower: 25,
  };
  return state;
}

function addTestPet(state: GameState): SpiritPet {
  const pet = createPetFromTemplate('spirit_fox', 1, '小灵')!;
  state.pets.push(pet);
  state.activePetId = pet.id;
  return pet;
}

function addConsumableToInventory(state: GameState): void {
  state.inventory.push({
    id: 'heal_pill',
    name: '回血丹',
    type: 'consumable',
    subtype: '丹药',
    description: '回复生命的丹药',
    quantity: 3,
    effects: [{ attribute: 'hp', operation: 'add', value: 50, duration: 'instant' }],
    value: 10,
    stackable: true,
    maxStack: 99,
  });
}

// ==================== getPetByQuery ====================

describe('getPetByQuery', () => {
  it('should find pet by ID', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    const found = getPetByQuery(state, pet.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('小灵');
  });

  it('should find pet by name', () => {
    const state = makeTestState();
    addTestPet(state);
    const found = getPetByQuery(state, '小灵');
    expect(found).toBeDefined();
  });

  it('should find pet by partial name (fuzzy)', () => {
    const state = makeTestState();
    addTestPet(state);
    const found = getPetByQuery(state, '灵');
    expect(found).toBeDefined();
  });

  it('should return undefined when no match', () => {
    const state = makeTestState();
    expect(getPetByQuery(state, '不存在')).toBeUndefined();
  });
});

// ==================== getActivePet ====================

describe('getActivePet', () => {
  it('should return active pet', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    const active = getActivePet(state);
    expect(active).toBeDefined();
    expect(active!.id).toBe(pet.id);
  });

  it('should return undefined when no active pet', () => {
    const state = makeTestState();
    expect(getActivePet(state)).toBeUndefined();
  });
});

// ==================== getAvailablePetSkills ====================

describe('getAvailablePetSkills', () => {
  it('should return skills with currentCooldown 0', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    const skills = getAvailablePetSkills(pet);
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      expect(skill.currentCooldown).toBe(0);
    }
  });

  it('should exclude skills on cooldown', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    pet.skills[0]!.currentCooldown = 2;
    const skills = getAvailablePetSkills(pet);
    expect(skills.every((s) => s.name !== pet.skills[0]!.name)).toBe(true);
  });
});

// ==================== feedPet ====================

describe('feedPet', () => {
  it('should heal pet HP and increase loyalty', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    addConsumableToInventory(state);
    pet.stats.hp = 20; // damage the pet

    const result = feedPet(state, pet.id, 'heal_pill');
    expect(result.error).toBeUndefined();
    const feedEvent = result.events.find((e) => e.type === 'pet_feed');
    expect(feedEvent).toBeDefined();
  });

  it('should return error for non-existent pet', () => {
    const state = makeTestState();
    const result = feedPet(state, 'nonexistent', 'heal_pill');
    expect(result.error).toBeDefined();
  });

  it('should return error when item not in inventory', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    const result = feedPet(state, pet.id, 'nonexistent');
    expect(result.error).toBeDefined();
  });

  it('should return error for non-consumable item', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    state.inventory.push({
      id: 'sword',
      name: '铁剑',
      type: 'equipment',
      subtype: '武器',
      description: '一把剑',
      quantity: 1,
      effects: [],
      value: 50,
      stackable: false,
      maxStack: 1,
    });
    const result = feedPet(state, pet.id, 'sword');
    expect(result.error).toBeDefined();
  });
});

// ==================== interactWithPet ====================

describe('interactWithPet', () => {
  it('should increase loyalty', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    const result = interactWithPet(state, pet.id);
    expect(result.error).toBeUndefined();
    const interactEvent = result.events.find((e) => e.type === 'pet_interact');
    expect(interactEvent).toBeDefined();
    if (interactEvent && interactEvent.type === 'pet_interact') {
      expect(interactEvent.loyaltyChange).toBeGreaterThan(0);
    }
  });

  it('should return error for non-existent pet', () => {
    const state = makeTestState();
    const result = interactWithPet(state, 'nonexistent');
    expect(result.error).toBeDefined();
  });
});

// ==================== attemptPetEvolution ====================

describe('attemptPetEvolution', () => {
  it('should evolve pet when conditions met', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    pet.loyalty = 60;
    pet.level = 5;

    const result = attemptPetEvolution(state, pet.id);
    expect(result.error).toBeUndefined();
    const evolveEvent = result.events.find((e) => e.type === 'pet_evolve');
    expect(evolveEvent).toBeDefined();
  });

  it('should reject when loyalty too low for normal path', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    pet.loyalty = 30;

    const result = attemptPetEvolution(state, pet.id);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('忠诚度');
  });

  it('should reject when loyalty too low for divine path', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    pet.loyalty = 60;
    pet.evolutionPath = 'divine';

    const result = attemptPetEvolution(state, pet.id);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('70');
  });

  it('should return error when at max evolution stage', () => {
    const state = makeTestState();
    const pet = addTestPet(state);
    pet.loyalty = 100;
    pet.evolutionStage = 4; // Max for fox divine
    pet.evolutionPath = 'divine';

    const result = attemptPetEvolution(state, pet.id);
    expect(result.error).toBeDefined();
  });

  it('should return error for non-existent pet', () => {
    const state = makeTestState();
    const result = attemptPetEvolution(state, 'nonexistent');
    expect(result.error).toBeDefined();
  });
});

// ==================== calculatePetSkillDamage ====================

describe('calculatePetSkillDamage', () => {
  it('should deal positive damage', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    const result = calculatePetSkillDamage(pet, '狐火', 10, () => 0.5);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.narrative).toBeTruthy();
  });

  it('should deal at least 1 damage', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    pet.stats.attack = 1;
    const result = calculatePetSkillDamage(pet, '狐火', 100, () => 0.0);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it('should detect crits at high roll', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    pet.stats.attack = 100;
    const result = calculatePetSkillDamage(pet, '狐火', 0, () => 0.07);
    expect(result.isCrit).toBe(true);
    expect(result.narrative).toContain('暴击');
  });
});

// ==================== calculatePetBasicDamage ====================

describe('calculatePetBasicDamage', () => {
  it('should deal positive damage', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    const damage = calculatePetBasicDamage(pet, 10, () => 0.5);
    expect(damage).toBeGreaterThan(0);
  });

  it('should deal at least 1 damage', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    pet.stats.attack = 1;
    const damage = calculatePetBasicDamage(pet, 100, () => 0.0);
    expect(damage).toBeGreaterThanOrEqual(1);
  });
});

// ==================== checkLoyaltyCombatEffect ====================

describe('checkLoyaltyCombatEffect', () => {
  it('should give damage bonus for high loyalty', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    pet.loyalty = 90;
    const effect = checkLoyaltyCombatEffect(pet);
    expect(effect.damageMultiplier).toBe(1.15);
    expect(effect.willRefuse).toBe(false);
  });

  it('should possibly refuse at low loyalty', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    pet.loyalty = 15;
    // With roll=0.0, it will refuse since 0.0 < 0.5
    const effect = checkLoyaltyCombatEffect(pet, () => 0.0);
    expect(effect.willRefuse).toBe(true);
  });

  it('should not refuse at medium loyalty', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    pet.loyalty = 50;
    const effect = checkLoyaltyCombatEffect(pet);
    expect(effect.willRefuse).toBe(false);
    expect(effect.damageMultiplier).toBe(1.0);
  });
});

// ==================== calcPetLevelUpStats ====================

describe('calcPetLevelUpStats', () => {
  it('should return stat increases for level up', () => {
    const template = getPetTemplateById('spirit_fox')!;
    const result = calcPetLevelUpStats(template, 1, 3);
    expect(result.attack).toBeGreaterThan(0);
    expect(result.maxHp).toBeGreaterThan(0);
    expect(result.hp).toBeGreaterThan(0);
  });

  it('should return empty for no level difference', () => {
    const template = getPetTemplateById('spirit_fox')!;
    const result = calcPetLevelUpStats(template, 3, 3);
    expect(result).toEqual({});
  });

  it('should return empty for negative level diff', () => {
    const template = getPetTemplateById('spirit_fox')!;
    const result = calcPetLevelUpStats(template, 5, 3);
    expect(result).toEqual({});
  });
});
