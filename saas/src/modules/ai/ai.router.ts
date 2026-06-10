import { env } from '@/config/env.js';
import { DeepSeekProvider } from './ai.deepseek.js';
import { GeminiProvider } from './ai.gemini.js';
import { OpenAIProvider } from './ai.openai.js';
import { AnthropicProvider } from './ai.anthropic.js';
import type { AIProvider, EvalParams, EvalResult, TextParams, TextResult } from './ai.provider.js';
import { logger } from '@/shared/logger.js';

// Singletons for platform-level keys (no custom key)
let _deepseek: DeepSeekProvider | null = null;
let _gemini: GeminiProvider | null = null;
let _openai: OpenAIProvider | null = null;
let _anthropic: AnthropicProvider | null = null;

function resolveProvider(name: string, customKey?: string): AIProvider {
  switch (name) {
    case 'gemini': {
      const key = customKey ?? process.env['GEMINI_API_KEY'];
      if (!key) throw new Error('GEMINI_API_KEY not configured');
      if (customKey) return new GeminiProvider(key);
      if (!_gemini) _gemini = new GeminiProvider(key);
      return _gemini;
    }
    case 'openai': {
      const key = customKey ?? process.env['OPENAI_API_KEY'];
      if (!key) throw new Error('OPENAI_API_KEY not configured');
      if (customKey) return new OpenAIProvider(key);
      if (!_openai) _openai = new OpenAIProvider(key);
      return _openai;
    }
    case 'anthropic': {
      const key = customKey ?? process.env['ANTHROPIC_API_KEY'];
      if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
      if (customKey) return new AnthropicProvider(key);
      if (!_anthropic) _anthropic = new AnthropicProvider(key);
      return _anthropic;
    }
    default: {
      const key = customKey ?? env.DEEPSEEK_API_KEY;
      if (!key) throw new Error('DEEPSEEK_API_KEY not configured');
      if (customKey) return new DeepSeekProvider(key);
      if (!_deepseek) _deepseek = new DeepSeekProvider(key);
      return _deepseek;
    }
  }
}

class FallbackProvider implements AIProvider {
  name: string;

  constructor(
    private readonly primaryName: string,
    private readonly fallbackName: string | undefined,
    private readonly customKey: string | undefined,
  ) {
    this.name = primaryName;
  }

  estimateCost(tokensIn: number, tokensOut: number, model?: string): number {
    try { return resolveProvider(this.primaryName, this.customKey).estimateCost(tokensIn, tokensOut, model); } catch { return 0; }
  }

  async generateText(params: TextParams): Promise<TextResult> {
    try {
      return await resolveProvider(this.primaryName, this.customKey).generateText(params);
    } catch (err) {
      if (!this.fallbackName) throw err;
      const fallback = resolveProvider(this.fallbackName);
      logger.warn({ err, primary: this.primaryName, fallback: this.fallbackName }, 'AI primary failed, using fallback');
      return fallback.generateText(params);
    }
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    try {
      return await resolveProvider(this.primaryName, this.customKey).evaluate(params);
    } catch (err) {
      if (!this.fallbackName) throw err;
      const fallback = resolveProvider(this.fallbackName);
      logger.warn({ err, primary: this.primaryName, fallback: this.fallbackName }, 'AI primary failed, using fallback');
      const result = await fallback.evaluate(params);
      result.usage.provider = `${this.primaryName}→${this.fallbackName}`;
      return result;
    }
  }
}

export function getProvider(providerName?: string, fallbackName?: string, customKey?: string): AIProvider {
  return new FallbackProvider(providerName ?? 'deepseek', fallbackName, customKey);
}

export function getOrgProvider(orgSettings: Record<string, unknown>): AIProvider {
  const providerName = (orgSettings['ai_provider'] as string) ?? 'deepseek';
  const fallbackName = (orgSettings['ai_provider_fallback'] as string) ?? undefined;
  return getProvider(providerName, fallbackName);
}
