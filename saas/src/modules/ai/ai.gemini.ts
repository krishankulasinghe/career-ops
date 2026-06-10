import type { AIProvider, EvalParams, EvalResult, TextParams, TextResult } from './ai.provider.js';
import { parseScoreSummary } from './ai.provider.js';
import { calculateCost, estimateTokens } from './ai.cost-tracker.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements AIProvider {
  name = 'gemini';

  constructor(private readonly apiKey: string) {}

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const model = params.model ?? DEFAULT_MODEL;
    const start = Date.now();

    const fullPrompt = `${params.systemPrompt}

<USER_DATA>
## Candidate CV
${params.cvContent}

## Job Description
${params.jdContent}

## Profile Context
${params.profileContext}
</USER_DATA>

Please evaluate this job opportunity following your evaluation methodology exactly. End your response with a ---SCORE_SUMMARY--- block.`;

    const content = await this.callAPI(fullPrompt, model, params.temperature ?? 0.3);
    const latencyMs = Date.now() - start;
    const tokensIn = estimateTokens(fullPrompt);
    const tokensOut = estimateTokens(content);
    const costUsd = calculateCost(this.name, model, tokensIn, tokensOut);

    const structured = parseScoreSummary(content);

    return {
      reportMarkdown: content,
      structured,
      usage: { tokensIn, tokensOut, costUsd, latencyMs, provider: this.name, model },
    };
  }

  async generateText(params: TextParams): Promise<TextResult> {
    const model = params.model ?? DEFAULT_MODEL;
    const start = Date.now();
    const content = await this.callAPI(params.prompt, model, params.temperature ?? 0.7);
    const latencyMs = Date.now() - start;
    const tokensIn = estimateTokens(params.prompt);
    const tokensOut = estimateTokens(content);
    const costUsd = calculateCost(this.name, model, tokensIn, tokensOut);
    return { text: content, usage: { tokensIn, tokensOut, costUsd, latencyMs } };
  }

  estimateCost(tokensIn: number, tokensOut: number, model?: string): number {
    return calculateCost(this.name, model ?? DEFAULT_MODEL, tokensIn, tokensOut);
  }

  private async callAPI(prompt: string, model: string, temperature: number): Promise<string> {
    const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 4096 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    return data.candidates[0]?.content?.parts?.[0]?.text ?? '';
  }
}
