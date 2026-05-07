// ============================================================
// 存档系统 — JSON 文件存储
// ============================================================

import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getLocationName } from '../world/world-data';
import { validateState } from './state';
import type { GameState } from './types';

// ==================== 类型 ====================

export interface SaveSlotMeta {
  playerName: string;
  realm: string;
  turn: number;
  locationName: string;
  savedAt: number;
}

export interface SaveData {
  meta: SaveSlotMeta;
  state: GameState;
}

export interface SaveResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export interface LoadResult {
  ok: boolean;
  state?: GameState;
  error?: string;
}

// ==================== 路径 ====================

const SAVE_DIR = '.textgame/saves';

function getSaveDir(): string {
  return join(process.cwd(), SAVE_DIR);
}

function getSavePath(slot: string): string {
  return join(getSaveDir(), `${slot}.json`);
}

/** 确保存档目录存在 */
function ensureSaveDir(): void {
  mkdirSync(getSaveDir(), { recursive: true });
}

// ==================== 公开函数 ====================

/** 保存游戏 */
export function saveGame(state: GameState, slot: string = 'auto'): SaveResult {
  try {
    // 保存前校验状态
    validateState(state);

    ensureSaveDir();

    const meta: SaveSlotMeta = {
      playerName: state.player.name,
      realm: `${state.player.realm.name}${state.player.realm.subStage}`,
      turn: state.meta.turn,
      locationName: getLocationName(state.world.currentLocationId),
      savedAt: Date.now(),
    };

    const data: SaveData = { meta, state };
    const path = getSavePath(slot);
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');

    return { ok: true, path };
  } catch (err) {
    const message = err instanceof Error ? err.message : '保存失败';
    return { ok: false, error: message };
  }
}

/** 读取存档 */
export function loadGame(slot: string = 'auto'): LoadResult {
  try {
    const path = getSavePath(slot);
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as SaveData;

    if (!data.state || typeof data.state !== 'object') {
      return { ok: false, error: '存档数据无效：缺少游戏状态' };
    }

    // 校验并加载状态
    const state = validateState(data.state);
    return { ok: true, state };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: false, error: `存档 "${slot}" 不存在` };
    }
    const message = err instanceof Error ? err.message : '读取失败';
    return { ok: false, error: message };
  }
}

/** 列出所有存档 */
export function listSaves(): { slot: string; meta: SaveSlotMeta }[] {
  try {
    const dir = getSaveDir();
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const results: { slot: string; meta: SaveSlotMeta }[] = [];

    for (const file of files) {
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        const data = JSON.parse(raw) as SaveData;
        if (data.meta) {
          results.push({
            slot: file.replace('.json', ''),
            meta: data.meta,
          });
        }
      } catch {
        // 跳过损坏的存档文件
      }
    }

    results.sort((a, b) => b.meta.savedAt - a.meta.savedAt);
    return results;
  } catch {
    return [];
  }
}

/** 删除存档 */
export function deleteSave(slot: string): SaveResult {
  try {
    const path = getSavePath(slot);
    unlinkSync(path);
    return { ok: true, path };
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    return { ok: false, error: message };
  }
}
