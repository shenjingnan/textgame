#!/usr/bin/env node
import { createInitialState } from './game/state.js';

// Phase 2 将在此实现完整的 CLI 游戏循环（pi-tui 界面 + LLM 集成）
const state = createInitialState('测试修士');
console.log('=== 修仙 CLI 文字 RPG ===');
console.log(`角色：${state.player.name} | 境界：${state.player.realm.name}${state.player.realm.subStage}`);
console.log(`生命：${state.player.stats.hp}/${state.player.stats.maxHp} | 灵力：${state.player.stats.qi}/${state.player.stats.maxQi}`);
console.log('正在开发中，敬请期待...');
