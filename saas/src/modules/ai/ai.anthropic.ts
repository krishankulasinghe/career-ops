import type { AIProvider, EvalParams, EvalResult, TextParams, TextResult } from './ai.provider.js';
import { parseScoreSummary } from './ai.provider.js';
import { calculateCost } from './ai.cost-tracker.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';

  constructor(private readonly apiKey: string) {}

  estimateCost(tokensIn: number, tokensOut: number, model = 'claude-sonnet-4-6'): number {
    return calculateCost('anthropic', model, tokensIn, tokensOut);
  }

  async generateText(params: TextParams): Promise<TextResult> {
    const model = params.model ?? 'claude-haiku-4-5-20251001';
    const start = Date.now();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.3,
        messages: [{ role: 'user', content: params.prompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content.find((c) => c.type === 'text')?.text ?? '';
    const tokensIn = data.usage.input_tokens;
    const tokensOut = data.usage.output_tokens;
    const latencyMs = Date.now() - start;

    return { text, usage: { tokensIn, tokensOut, costUsd: this.estimateCost(tokensIn, tokensOut, model), latencyMs } };
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const model = params.model ?? 'claude-sonnet-4-6';
    const prompt = `${params.systemPrompt}\n\n## CV\n${params.cvContent}\n\n## Job Description\n${params.jdContent}\n\n## Profile Context\n${params.profileContext}`;

    const result = await this.generateText({ prompt, model, temperature: params.temperature ?? 0.3, maxTokens: 8000 });
    const structured = parseScoreSummary(result.text);

    return {
      reportMarkdown: result.text,
      structured,
      usage: { ...result.usage, provider: this.name, model },
    };
  }
}
