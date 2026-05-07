// ============================================================
// LLM 客户端封装 — DeepSeek via pi-ai
// ============================================================

import {
  type AssistantMessageEventStream,
  type Context,
  type Model,
  type StreamOptions,
  stream,
} from '@mariozechner/pi-ai';

// ==================== DeepSeek 模型配置 ====================

const DEEPSEEK_MODEL: Model<'openai-completions'> = {
  id: 'deepseek-chat',
  name: 'DeepSeek V4 Pro',
  api: 'openai-completions',
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  reasoning: false,
  input: ['text'],
  cost: {
    input: 0.27,
    output: 1.1,
    cacheRead: 0,
    cacheWrite: 0,
  },
  contextWindow: 128000,
  maxTokens: 8192,
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: true,
    thinkingFormat: 'openai',
  },
};

// ==================== 自定义错误 ====================

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// ==================== GameLLMClient ====================

export class GameLLMClient {
  private apiKey: string;
  private abortController: AbortController | null = null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new LLMError(
        '未设置 DEEPSEEK_API_KEY 环境变量。请设置环境变量或通过参数传入 API Key。'
      );
    }
    this.apiKey = key;
  }

  /**
   * 流式发送聊天请求，返回事件流
   */
  streamChat(context: Context, options?: Partial<StreamOptions>): AssistantMessageEventStream {
    this.abortController = new AbortController();

    const streamOptions: StreamOptions = {
      apiKey: this.apiKey,
      maxTokens: 4096,
      temperature: 0.8,
      ...options,
      signal: this.abortController.signal,
    };

    // 使用 openai-completions 特定的选项
    const fullOptions = {
      ...streamOptions,
      toolChoice: 'auto' as const,
    };

    return stream(DEEPSEEK_MODEL, context, fullOptions);
  }

  /**
   * 取消当前正在进行的请求
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
