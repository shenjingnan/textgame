// ============================================================
// 灵宠数据 单元测试
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  createPetFromTemplate,
  getAllPetIds,
  getPetsByLocation,
  getPetsByRealmRange,
  getPetTemplateById,
  getPetTemplateBySpecies,
} from '../../pet/pet-data';

// ==================== getPetTemplateById ====================

describe('getPetTemplateById', () => {
  it('should return template for valid ID', () => {
    const template = getPetTemplateById('spirit_fox');
    expect(template).toBeDefined();
    expect(template!.id).toBe('spirit_fox');
    expect(template!.name).toBe('灵狐');
  });

  it('should return undefined for invalid ID', () => {
    expect(getPetTemplateById('nonexistent')).toBeUndefined();
  });

  it('should return deep clone (no mutation of original)', () => {
    const t1 = getPetTemplateById('spirit_fox');
    const t2 = getPetTemplateById('spirit_fox');
    expect(t1).not.toBe(t2);
    t1!.baseStats.attack = 999;
    expect(t2!.baseStats.attack).not.toBe(999);
  });
});

// ==================== getPetTemplateBySpecies ====================

describe('getPetTemplateBySpecies', () => {
  it('should find template by exact species name', () => {
    const template = getPetTemplateBySpecies('灵狐');
    expect(template).toBeDefined();
    expect(template!.id).toBe('spirit_fox');
  });

  it('should find template by evolved species name (strip suffix)', () => {
    const template = getPetTemplateBySpecies('三尾灵狐');
    expect(template).toBeDefined();
    expect(template!.id).toBe('spirit_fox');
  });

  it('should return undefined for unknown species', () => {
    expect(getPetTemplateBySpecies('不存在的生物')).toBeUndefined();
  });
});

// ==================== getPetsByLocation ====================

describe('getPetsByLocation', () => {
  it('should return pets for outside_forest', () => {
    const pets = getPetsByLocation('outside_forest');
    const ids = pets.map((p) => p.id);
    expect(ids).toContain('spirit_fox');
    expect(ids).toContain('herb_rabbit');
  });

  it('should return pets for ancient_cave', () => {
    const pets = getPetsByLocation('ancient_cave');
    const ids = pets.map((p) => p.id);
    expect(ids).toContain('ancient_dragon');
    expect(ids).toContain('ice_phoenix');
  });

  it('should return empty for unknown location', () => {
    expect(getPetsByLocation('nowhere')).toEqual([]);
  });
});

// ==================== getPetsByRealmRange ====================

describe('getPetsByRealmRange', () => {
  it('should return starter pets for early realm', () => {
    const pets = getPetsByRealmRange(0, 4);
    const ids = pets.map((p) => p.id);
    expect(ids).toContain('spirit_fox');
    expect(ids).toContain('herb_rabbit');
  });

  it('should return elite pets for late realm', () => {
    const pets = getPetsByRealmRange(12, 19);
    const ids = pets.map((p) => p.id);
    expect(ids).toContain('ancient_dragon');
  });

  it('should return empty for misaligned range', () => {
    const pets = getPetsByRealmRange(20, 25);
    expect(pets).toEqual([]);
  });
});

// ==================== getAllPetIds ====================

describe('getAllPetIds', () => {
  it('should return 8 pet IDs', () => {
    const ids = getAllPetIds();
    expect(ids).toHaveLength(8);
  });
});

// ==================== createPetFromTemplate ====================

describe('createPetFromTemplate', () => {
  it('should create a SpiritPet with basic properties', () => {
    const pet = createPetFromTemplate('spirit_fox', 1);
    expect(pet).toBeDefined();
    expect(pet!.templateId).toBe('spirit_fox');
    expect(pet!.species).toBe('灵狐');
    expect(pet!.level).toBe(1);
    expect(pet!.loyalty).toBe(50);
    expect(pet!.evolutionStage).toBe(1);
    expect(pet!.evolutionPath).toBe('normal');
  });

  it('should use custom name when provided', () => {
    const pet = createPetFromTemplate('spirit_fox', 1, '小九');
    expect(pet!.name).toBe('小九');
  });

  it('should use default name when no custom name', () => {
    const pet = createPetFromTemplate('spirit_fox', 1);
    expect(pet!.name).toBe('灵狐');
  });

  it('should scale stats with level', () => {
    const pet1 = createPetFromTemplate('spirit_fox', 1)!;
    const pet5 = createPetFromTemplate('spirit_fox', 5)!;
    expect(pet5.stats.attack).toBeGreaterThan(pet1.stats.attack);
    expect(pet5.stats.hp).toBeGreaterThan(pet1.stats.hp);
  });

  it('should assign stage 1 skills', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    expect(pet.skills.length).toBeGreaterThan(0);
    for (const skill of pet.skills) {
      expect(skill.currentCooldown).toBe(0);
    }
  });

  it('should return undefined for invalid template', () => {
    expect(createPetFromTemplate('nonexistent', 1)).toBeUndefined();
  });

  it('should generate unique ID for each pet', () => {
    const pet1 = createPetFromTemplate('spirit_fox', 1)!;
    const pet2 = createPetFromTemplate('spirit_fox', 1)!;
    expect(pet1.id).not.toBe(pet2.id);
  });

  it('should set hp equal to maxHp', () => {
    const pet = createPetFromTemplate('spirit_fox', 1)!;
    expect(pet.stats.hp).toBe(pet.stats.maxHp);
  });
});

// ==================== Template completeness ====================

describe('Pet template validation', () => {
  const allIds = getAllPetIds();

  for (const id of allIds) {
    it(`template ${id} should have valid evolution chains`, () => {
      const t = getPetTemplateById(id)!;
      // Normal path
      for (const stage of t.evolutionChain.normal) {
        expect(stage.stage).toBeGreaterThan(1);
        expect(stage.speciesName).toBeTruthy();
        expect(stage.statGrowth).toBeDefined();
      }
      // Divine path
      for (const stage of t.evolutionChain.divine) {
        expect(stage.stage).toBeGreaterThan(1);
        expect(stage.speciesName).toBeTruthy();
      }
      // Demonic path
      for (const stage of t.evolutionChain.demonic) {
        expect(stage.stage).toBeGreaterThan(1);
        expect(stage.speciesName).toBeTruthy();
      }
    });

    it(`template ${id} should have stage skills`, () => {
      const t = getPetTemplateById(id)!;
      const stageKeys = Object.keys(t.stageSkills);
      expect(stageKeys.length).toBeGreaterThan(0);
      // Stage 1 should exist
      expect(t.stageSkills[1]).toBeDefined();
      expect(t.stageSkills[1]!.length).toBeGreaterThan(0);
    });

    it(`template ${id} should have valid base stats`, () => {
      const t = getPetTemplateById(id)!;
      expect(t.baseStats.hp).toBeGreaterThan(0);
      expect(t.baseStats.maxHp).toBeGreaterThan(0);
      expect(t.baseStats.attack).toBeGreaterThan(0);
      expect(t.baseStats.defense).toBeGreaterThan(0);
      expect(t.baseStats.speed).toBeGreaterThan(0);
    });

    it(`template ${id} should have locationIds`, () => {
      const t = getPetTemplateById(id)!;
      expect(t.locationIds.length).toBeGreaterThan(0);
    });
  }
});
