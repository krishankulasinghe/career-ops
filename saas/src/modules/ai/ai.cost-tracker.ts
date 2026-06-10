export interface ProviderRates {
  inputPer1M: number;
  outputPer1M: number;
}

const RATES: Record<string, Record<string, ProviderRates>> = {
  deepseek: {
    'deepseek-chat': { inputPer1M: 0.27, outputPer1M: 1.10 },
    'deepseek-reasoner': { inputPer1M: 0.55, outputPer1M: 2.19 },
  },
  gemini: {
    'gemini-2.0-flash': { inputPer1M: 0.10, outputPer1M: 0.40 },
    'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },
  },
  openai: {
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  },
  anthropic: {
    'claude-sonnet-4-6': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'claude-haiku-4-5-20251001': { inputPer1M: 0.80, outputPer1M: 4.00 },
  },
};

export function calculateCost(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const providerRates = RATES[provider.toLowerCase()];
  if (!providerRates) return 0;

  const modelRates = providerRates[model] ?? Object.values(providerRates)[0];
  if (!modelRates) return 0;

  const inputCost = (tokensIn / 1_000_000) * modelRates.inputPer1M;
  const outputCost = (tokensOut / 1_000_000) * modelRates.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
