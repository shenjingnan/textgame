import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteSave, listSaves, loadGame, saveGame } from '../../game/save-load';
import { createInitialState } from '../../game/state';
import type { GameState } from '../../game/types';

// 在临时目录中运行测试，避免污染项目目录
const originalCwd = process.cwd();
let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'textgame-save-test-'));
  process.chdir(tempDir);
});

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(tempDir, { recursive: true, force: true });
});

function createTestState(): GameState {
  return createInitialState('存档测试者', 'normal');
}

describe('saveGame', () => {
  it('should save game state successfully', () => {
    const state = createTestState();
    const result = saveGame(state, 'test_save');
    expect(result.ok).toBe(true);
    expect(result.path).toBeDefined();
  });

  it('should save to default slot', () => {
    const state = createTestState();
    const result = saveGame(state);
    expect(result.ok).toBe(true);
    expect(result.path).toContain('auto.json');
  });

  it('should write valid JSON to disk', () => {
    const state = createTestState();
    saveGame(state, 'json_test');

    const loadResult = loadGame('json_test');
    expect(loadResult.ok).toBe(true);
  });
});

describe('loadGame', () => {
  it('should load saved state with same player name', () => {
    const state = createTestState();
    state.player.name = '独特性名测试';
    saveGame(state, 'load_test');

    const result = loadGame('load_test');
    expect(result.ok).toBe(true);
    expect(result.state?.player.name).toBe('独特性名测试');
  });

  it('should preserve realm data after round-trip', () => {
    const state = createTestState();
    state.player.realm.cultivation = 50;
    saveGame(state, 'realm_test');

    const result = loadGame('realm_test');
    expect(result.ok).toBe(true);
    expect(result.state?.player.realm.cultivation).toBe(50);
    expect(result.state?.player.realm.name).toBe('炼气');
    expect(result.state?.player.realm.subStage).toBe('前期');
  });

  it('should return error for nonexistent slot', () => {
    const result = loadGame('nonexistent_slot_xyz');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('listSaves', () => {
  it('should list saved slots', () => {
    const state = createTestState();
    saveGame(state, 'list_test_1');
    saveGame(state, 'list_test_2');

    const saves = listSaves();
    const slots = saves.map((s) => s.slot);
    expect(slots).toContain('list_test_1');
    expect(slots).toContain('list_test_2');
  });

  it('should return meta data for saves', () => {
    const state = createTestState();
    saveGame(state, 'meta_test');

    const saves = listSaves();
    const metaSave = saves.find((s) => s.slot === 'meta_test');
    expect(metaSave).toBeDefined();
    expect(metaSave?.meta.playerName).toBe('存档测试者');
    expect(metaSave?.meta.turn).toBe(0);
  });
});

describe('deleteSave', () => {
  it('should delete saved game', () => {
    const state = createTestState();
    saveGame(state, 'delete_test');

    const result = deleteSave('delete_test');
    expect(result.ok).toBe(true);

    const loadResult = loadGame('delete_test');
    expect(loadResult.ok).toBe(false);
  });

  it('should return error for nonexistent save', () => {
    const result = deleteSave('i_dont_exist');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
