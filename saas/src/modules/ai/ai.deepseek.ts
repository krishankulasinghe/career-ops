import type { AIProvider, EvalParams, EvalResult, TextParams, TextResult } from './ai.provider.js';
import { parseScoreSummary } from './ai.provider.js';
import { calculateCost, estimateTokens } from './ai.cost-tracker.js';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';

export class DeepSeekProvider implements AIProvider {
  name = 'deepseek';

  constructor(private readonly apiKey: string) {}

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const model = params.model ?? DEFAULT_MODEL;
    const start = Date.now();

    const userPrompt = `<USER_DATA>
## Candidate CV
${params.cvContent}

## Job Description
${params.jdContent}

## Profile Context
${params.profileContext}
</USER_DATA>

Please evaluate this job opportunity following your evaluation methodology exactly. End your response with a ---SCORE_SUMMARY--- block.`;

    const response = await this.callAPI(
      params.systemPrompt,
      userPrompt,
      model,
      params.temperature ?? 0.3,
    );

    const latencyMs = Date.now() - start;
    const tokensIn = response.usage?.prompt_tokens ?? estimateTokens(params.systemPrompt + userPrompt);
    const tokensOut = response.usage?.completion_tokens ?? estimateTokens(response.content);
    const costUsd = calculateCost(this.name, model, tokensIn, tokensOut);

    const structured = parseScoreSummary(response.content);

    return {
      reportMarkdown: response.content,
      structured,
      usage: { tokensIn, tokensOut, costUsd, latencyMs, provider: this.name, model },
    };
  }

  async generateText(params: TextParams): Promise<TextResult> {
    const model = params.model ?? DEFAULT_MODEL;
    const start = Date.now();

    const response = await this.callAPI('', params.prompt, model, params.temperature ?? 0.7);
    const latencyMs = Date.now() - start;
    const tokensIn = response.usage?.prompt_tokens ?? estimateTokens(params.prompt);
    const tokensOut = response.usage?.completion_tokens ?? estimateTokens(response.content);
    const costUsd = calculateCost(this.name, model, tokensIn, tokensOut);

    return { text: response.content, usage: { tokensIn, tokensOut, costUsd, latencyMs } };
  }

  estimateCost(tokensIn: number, tokensOut: number, model?: string): number {
    return calculateCost(this.name, model ?? DEFAULT_MODEL, tokensIn, tokensOut);
  }

  private async callAPI(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number,
  ): Promise<{ content: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: 4096 }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      usage: data.usage,
    };
  }
}
