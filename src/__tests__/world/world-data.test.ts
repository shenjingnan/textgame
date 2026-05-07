import { describe, expect, it } from 'vitest';
import {
  CANGWU_MOUNTAINS,
  canMoveTo,
  getConnectedLocations,
  getLocationById,
  getLocationName,
  getNPCsAtLocation,
} from '../../world/world-data';

describe('CANGWU_MOUNTAINS', () => {
  it('should contain one region', () => {
    expect(CANGWU_MOUNTAINS).toHaveLength(1);
  });

  it('should have region named 苍梧山脉', () => {
    expect(CANGWU_MOUNTAINS[0]?.name).toBe('苍梧山脉');
  });

  it('should have 6 locations', () => {
    expect(CANGWU_MOUNTAINS[0]?.locations).toHaveLength(6);
  });

  it('should have cangwu_city as first location', () => {
    expect(CANGWU_MOUNTAINS[0]?.locations[0]?.id).toBe('cangwu_city');
  });

  it('should have all expected location IDs', () => {
    const ids = CANGWU_MOUNTAINS[0]?.locations.map((l) => l.id);
    expect(ids).toContain('cangwu_city');
    expect(ids).toContain('outside_forest');
    expect(ids).toContain('spirit_valley');
    expect(ids).toContain('qingyun_outer');
    expect(ids).toContain('abandoned_mine');
    expect(ids).toContain('ancient_cave');
  });
});

describe('getLocationById', () => {
  it('should return location for valid ID', () => {
    const loc = getLocationById('cangwu_city');
    expect(loc).toBeDefined();
    expect(loc?.name).toBe('苍梧城');
    expect(loc?.type).toBe('city');
  });

  it('should return undefined for unknown ID', () => {
    expect(getLocationById('nonexistent')).toBeUndefined();
  });

  it('should return correct danger levels', () => {
    expect(getLocationById('cangwu_city')?.dangerLevel).toBe(1);
    expect(getLocationById('outside_forest')?.dangerLevel).toBe(3);
    expect(getLocationById('ancient_cave')?.dangerLevel).toBe(9);
  });
});

describe('getConnectedLocations', () => {
  it('should return connected locations for cangwu_city', () => {
    const connected = getConnectedLocations('cangwu_city');
    expect(connected).toHaveLength(1);
    expect(connected[0]?.id).toBe('outside_forest');
  });

  it('should return multiple connections for outside_forest', () => {
    const connected = getConnectedLocations('outside_forest');
    expect(connected.length).toBeGreaterThanOrEqual(2);
    const ids = connected.map((l) => l.id);
    expect(ids).toContain('cangwu_city');
    expect(ids).toContain('spirit_valley');
    expect(ids).toContain('abandoned_mine');
  });

  it('should return empty array for unknown location', () => {
    expect(getConnectedLocations('nonexistent')).toEqual([]);
  });

  it('should return abandoned_mine for ancient_cave (connected via abandoned mine)', () => {
    const connected = getConnectedLocations('ancient_cave');
    expect(connected).toHaveLength(1);
    expect(connected[0]?.id).toBe('abandoned_mine');
  });
});

describe('getNPCsAtLocation', () => {
  it('should return NPCs for locations that have them', () => {
    const npcs = getNPCsAtLocation('cangwu_city');
    expect(npcs.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty array for location without NPCs', () => {
    // all locations have NPCs in current data, but test the function contract
    const npcs = getNPCsAtLocation('nonexistent');
    expect(npcs).toEqual([]);
  });
});

describe('getLocationName', () => {
  it('should return name for valid ID', () => {
    expect(getLocationName('cangwu_city')).toBe('苍梧城');
  });

  it('should return ID as fallback for unknown location', () => {
    expect(getLocationName('unknown')).toBe('unknown');
  });
});

describe('canMoveTo', () => {
  it('should return true for connected locations', () => {
    expect(canMoveTo('cangwu_city', 'outside_forest')).toBe(true);
  });

  it('should return false for unconnected locations', () => {
    expect(canMoveTo('cangwu_city', 'spirit_valley')).toBe(false);
  });

  it('should return false for unknown from location', () => {
    expect(canMoveTo('nonexistent', 'cangwu_city')).toBe(false);
  });
});
