// ============================================================
// 存档码系统 — 序列化 + Deflate 压缩 + Base64 编码
// ============================================================

import { deflateSync, inflateSync } from 'node:zlib';
import { validateState } from '../game/state';
import type { GameState } from '../game/types';
import { getLocationName } from '../world/world-data';

// ==================== 常量 ====================

/** 存档码格式版本（不是游戏版本号） */
const ARCHIVE_FORMAT_VERSION = 1;

/** 存档码前缀：TG = Textgame, 数字 = 格式版本 */
const ARCHIVE_PREFIX = 'TG';

// ==================== 类型 ====================

/** 存档码展示元数据（导入前预览用） */
export interface ArchiveMeta {
  playerName: string;
  realm: string;
  turn: number;
  locationName: string;
  exportedAt: number;
}

/** 存档码内部结构（压缩前的 JSON envelope） */
interface ArchiveEnvelope {
  v: number;
  gameVersion: string;
  meta: ArchiveMeta;
  state: GameState;
}

/** 解码结果 */
export interface ArchiveDecodeResult {
  state: GameState;
  meta: ArchiveMeta;
}

// ==================== 错误类 ====================

/** 存档码相关错误基类 */
export class ArchiveCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveCodeError';
  }
}

/** 格式无效（前缀不匹配、非 base64 等） */
export class InvalidFormatError extends ArchiveCodeError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFormatError';
  }
}

/** 数据损坏（zlib 解压失败、JSON 解析失败） */
export class CorruptedDataError extends ArchiveCodeError {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptedDataError';
  }
}

/** 格式版本不兼容（未来的存档码版本） */
export class VersionMismatchError extends ArchiveCodeError {
  constructor(message: string) {
    super(message);
    this.name = 'VersionMismatchError';
  }
}

// ==================== 编码 ====================

/**
 * 将游戏状态编码为存档码字符串
 *
 * 流程：校验 → 构建 envelope → JSON.stringify → deflate → base64 → 添加前缀
 *
 * @param state 完整游戏状态
 * @returns 存档码字符串，格式为 `TG1` + base64
 */
export function encodeArchive(state: GameState): string {
  // 1. 校验状态
  validateState(state);

  // 2. 构建元数据
  const meta: ArchiveMeta = {
    playerName: state.player.name,
    realm: `${state.player.realm.name}${state.player.realm.subStage}`,
    turn: state.meta.turn,
    locationName: getLocationName(state.world.currentLocationId),
    exportedAt: Date.now(),
  };

  // 3. 构建 envelope
  const envelope: ArchiveEnvelope = {
    v: ARCHIVE_FORMAT_VERSION,
    gameVersion: state.version,
    meta,
    state,
  };

  // 4. 序列化 → 压缩 → base64
  const json = JSON.stringify(envelope);
  const compressed = deflateSync(Buffer.from(json, 'utf-8'), { level: 9 });
  const base64 = compressed.toString('base64');

  // 5. 添加前缀
  return `${ARCHIVE_PREFIX}${ARCHIVE_FORMAT_VERSION}${base64}`;
}

// ==================== 解码 ====================

/**
 * 从存档码字符串解码游戏状态
 *
 * 流程：验证前缀 → 提取版本 → base64 decode → inflate → JSON.parse → 校验
 *
 * @param code 存档码字符串
 * @returns 解码后的游戏状态和元数据
 * @throws {InvalidFormatError} 格式无效
 * @throws {VersionMismatchError} 版本不兼容
 * @throws {CorruptedDataError} 数据损坏
 */
export function decodeArchive(code: string): ArchiveDecodeResult {
  // 1. 基础校验
  if (!code || code.trim().length === 0) {
    throw new InvalidFormatError('存档码为空');
  }

  const trimmed = code.trim();

  // 2. 验证前缀
  if (!trimmed.startsWith(ARCHIVE_PREFIX)) {
    throw new InvalidFormatError(
      `存档码格式无效：缺少 "${ARCHIVE_PREFIX}" 前缀。请确认完整复制了存档码。`
    );
  }

  // 3. 提取格式版本号（前缀后的第一个数字）
  const versionMatch = trimmed.slice(ARCHIVE_PREFIX.length).match(/^(\d+)/);
  if (!versionMatch) {
    throw new InvalidFormatError('存档码格式无效：无法解析版本号');
  }

  const versionStr = versionMatch[1];
  if (!versionStr) {
    throw new InvalidFormatError('存档码格式无效：无法解析版本号');
  }
  const formatVersion = parseInt(versionStr, 10);

  // 4. 版本兼容检查
  if (formatVersion > ARCHIVE_FORMAT_VERSION) {
    throw new VersionMismatchError(
      `存档码版本（v${formatVersion}）高于当前支持的版本（v${ARCHIVE_FORMAT_VERSION}），请升级游戏。`
    );
  }

  // 5. 提取 base64 正文（版本号之后的所有内容）
  const base64Body = trimmed.slice(ARCHIVE_PREFIX.length + versionStr.length);

  if (base64Body.length === 0) {
    throw new InvalidFormatError('存档码格式无效：缺少数据正文');
  }

  // 6. base64 → 解压
  let compressed: Buffer;
  try {
    compressed = Buffer.from(base64Body, 'base64');
  } catch {
    throw new InvalidFormatError('存档码格式无效：无法解码 base64 数据');
  }

  let jsonString: string;
  try {
    jsonString = inflateSync(compressed).toString('utf-8');
  } catch {
    throw new CorruptedDataError('存档码数据损坏：解压失败，数据可能不完整或被篡改');
  }

  // 7. JSON 解析
  let envelope: unknown;
  try {
    envelope = JSON.parse(jsonString);
  } catch {
    throw new CorruptedDataError('存档码数据损坏：JSON 解析失败');
  }

  // 8. 结构校验
  if (!envelope || typeof envelope !== 'object') {
    throw new CorruptedDataError('存档码数据损坏：数据结构无效');
  }

  const env = envelope as Record<string, unknown>;

  if (typeof env.v !== 'number') {
    throw new CorruptedDataError('存档码数据损坏：缺少格式版本字段');
  }
  if (typeof env.gameVersion !== 'string') {
    throw new CorruptedDataError('存档码数据损坏：缺少游戏版本字段');
  }
  if (!env.meta || typeof env.meta !== 'object') {
    throw new CorruptedDataError('存档码数据损坏：缺少元数据');
  }
  if (!env.state || typeof env.state !== 'object') {
    throw new CorruptedDataError('存档码数据损坏：缺少游戏状态');
  }

  // 9. 游戏状态校验
  const state = validateState(env.state);
  const meta = env.meta as ArchiveMeta;

  return { state, meta };
}
