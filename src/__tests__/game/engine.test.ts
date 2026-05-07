import { describe, expect, it } from 'vitest';
import type { EngineCallbacks } from '../../game/engine';
import { GameEngine } from '../../game/engine';

// 空回调用于不需要验证回调的测试
function noopCallbacks(): EngineCallbacks {
  return {
    onNarrativeUpdate: () => {},
    onStateUpdate: () => {},
    onDecisionRequired: () => {},
    onProcessingStart: () => {},
    onProcessingEnd: () => {},
    onError: () => {},
    onGameOver: () => {},
  };
}

// 由于 LLM 调用需要 API key，只测试不需要 LLM 的命令和状态管理
describe('GameEngine', () => {
  describe('constructor', () => {
    it('should throw without API key', () => {
      // 清除环境变量
      const savedKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;

      expect(() => new GameEngine(noopCallbacks())).toThrow('DEEPSEEK_API_KEY');

      // 恢复
      if (savedKey) process.env.DEEPSEEK_API_KEY = savedKey;
    });

    it('should create engine with explicit API key', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      expect(engine).toBeDefined();
    });

    it('should create engine with env API key', () => {
      const savedKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = 'env-test-key';
      const engine = new GameEngine(noopCallbacks());
      expect(engine).toBeDefined();
      if (savedKey) process.env.DEEPSEEK_API_KEY = savedKey;
      else delete process.env.DEEPSEEK_API_KEY;
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const state = engine.getState();
      expect(state.player.name).toBe('无名散修');
      expect(state.meta.turn).toBe(0);
    });

    it('should have world data populated', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const state = engine.getState();
      expect(state.world.regions.length).toBeGreaterThan(0);
      expect(state.world.currentLocationId).toBe('cangwu_city');
    });
  });

  describe('getWelcomeText', () => {
    it('should return welcome text', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const text = engine.getWelcomeText();
      expect(text).toContain('修仙');
      expect(text).toContain('苍梧山脉');
    });
  });

  describe('isProcessing', () => {
    it('should be false when idle', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      expect(engine.isProcessing).toBe(false);
    });
  });

  describe('executeCommand /status', () => {
    it('should return status text', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/status');
      expect(result.type).toBe('narrative_append');
      expect(result.message).toContain('无名散修');
    });
  });

  describe('executeCommand /look', () => {
    it('should return location info', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/look');
      expect(result.type).toBe('narrative_append');
      expect(result.message).toContain('苍梧城');
    });
  });

  describe('executeCommand /inventory', () => {
    it('should return inventory text', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/inventory');
      expect(result.type).toBe('narrative_append');
      expect(result.message).toContain('背包');
    });

    it('should include spirit stones', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/inventory');
      expect(result.message).toContain('灵石');
    });
  });

  describe('executeCommand /move', () => {
    it('should show available locations when no argument', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/move');
      expect(result.type).toBe('narrative_append');
      expect(result.message).toContain('可前往');
    });

    it('should move to connected location', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/move outside_forest');
      expect(result.type).toBe('narrative_append');
      expect(result.message).toContain('城外密林');

      // 验证状态变更
      expect(engine.getState().world.currentLocationId).toBe('outside_forest');
    });

    it('should return error for unconnected location', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/move spirit_valley');
      expect(result.type).toBe('error');
      expect(result.message).toContain('无法前往');
    });

    it('should return error for nonexistent location', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/move nowhere');
      expect(result.type).toBe('error');
    });

    it('should match location by name', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      // 先移动到城外密林
      engine.executeCommand('/move outside_forest');
      // 用中文名称模糊匹配
      const result = engine.executeCommand('/move 灵溪谷');
      expect(result.type).toBe('narrative_append');
      expect(engine.getState().world.currentLocationId).toBe('spirit_valley');
    });
  });

  describe('executeCommand /help', () => {
    it('should return help text', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/help');
      expect(result.type).toBe('narrative_append');
      expect(result.message).toContain('命令列表');
      expect(result.message).toContain('/status');
      expect(result.message).toContain('/look');
      expect(result.message).toContain('/move');
    });
  });

  describe('executeCommand unknown', () => {
    it('should return error for unknown command', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      const result = engine.executeCommand('/foobar');
      expect(result.type).toBe('error');
      expect(result.message).toContain('未知命令');
    });
  });

  describe('saveGame / loadGame', () => {
    it('should save and load game state', () => {
      const engine = new GameEngine(noopCallbacks(), 'test-key');
      // 先移动改变状态
      engine.executeCommand('/move outside_forest');

      const saveResult = engine.saveGame('engine_test');
      expect(saveResult.ok).toBe(true);

      // 创建新引擎并加载
      const engine2 = new GameEngine(noopCallbacks(), 'test-key');
      const loadResult = engine2.loadGame('engine_test');
      expect(loadResult.ok).toBe(true);
    });
  });
});
