import type { AIProvider, EvalParams, EvalResult, TextParams, TextResult } from './ai.provider.js';
import { parseScoreSummary } from './ai.provider.js';
import { calculateCost } from './ai.cost-tracker.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';

  constructor(private readonly apiKey: string) {}

  estimateCost(tokensIn: number, tokensOut: number, model = 'gpt-4o'): number {
    return calculateCost('openai', model, tokensIn, tokensOut);
  }

  async generateText(params: TextParams): Promise<TextResult> {
    const model = params.model ?? 'gpt-4o-mini';
    const start = Date.now();

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: params.prompt }],
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 4096,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const text = data.choices[0]?.message?.content ?? '';
    const tokensIn = data.usage.prompt_tokens;
    const tokensOut = data.usage.completion_tokens;
    const latencyMs = Date.now() - start;

    return { text, usage: { tokensIn, tokensOut, costUsd: this.estimateCost(tokensIn, tokensOut, model), latencyMs } };
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const model = params.model ?? 'gpt-4o';
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
