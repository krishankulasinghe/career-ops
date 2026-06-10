export interface EvalParams {
  systemPrompt: string;
  cvContent: string;
  jdContent: string;
  profileContext: string;
  model?: string;
  temperature?: number;
}

export interface GapItem {
  category: string;
  description: string;
  severity: 'hard' | 'soft' | 'minor';
  mitigation?: string;
}

export interface BlockScores {
  cvMatch?: number;
  northStar?: number;
  comp?: number;
  cultural?: number;
  redFlags?: number;
  global?: number;
}

export interface EvalResult {
  reportMarkdown: string;
  structured: {
    company: string;
    role: string;
    score: number;
    archetype?: string;
    legitimacy?: string;
    tldR?: string;
    scores: BlockScores;
    gaps: GapItem[];
  };
  usage: {
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    latencyMs: number;
    provider: string;
    model: string;
  };
}

export interface TextParams {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TextResult {
  text: string;
  usage: {
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    latencyMs: number;
  };
}

export interface AIProvider {
  name: string;
  evaluate(params: EvalParams): Promise<EvalResult>;
  generateText(params: TextParams): Promise<TextResult>;
  estimateCost(tokensIn: number, tokensOut: number, model?: string): number;
}

export function parseScoreSummary(report: string): {
  company: string;
  role: string;
  score: number;
  archetype?: string;
  legitimacy?: string;
  tldR?: string;
  scores: BlockScores;
  gaps: GapItem[];
} {
  const summaryMatch = report.match(/---SCORE_SUMMARY---([\s\S]*?)---END_SUMMARY---/);
  const summaryBlock = summaryMatch?.[1] ?? '';

  const extract = (key: string): string =>
    summaryBlock.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() ?? '';

  const company = extract('Company') || 'Unknown Company';
  const role = extract('Role') || 'Unknown Role';
  const scoreStr = extract('Overall Score');
  const score = parseFloat(scoreStr.replace('/5', '')) || 0;
  const archetype = extract('Archetype') || undefined;
  const legitimacy = extract('Legitimacy') || undefined;
  const tldR = extract('TL;DR') || undefined;

  const blockA = parseFloat(extract('Block A')) || undefined;
  const blockB = parseFloat(extract('Block B')) || undefined;
  const blockC = parseFloat(extract('Block C')) || undefined;
  const blockD = parseFloat(extract('Block D')) || undefined;
  const blockE = parseFloat(extract('Block E')) || undefined;

  const gaps: GapItem[] = [];
  const gapMatches = summaryBlock.matchAll(/Gap:\s*(.+?)\s*\|\s*(hard|soft|minor)\s*\|?\s*(.*)/gi);
  for (const match of gapMatches) {
    gaps.push({
      category: match[1]?.trim() ?? '',
      description: match[1]?.trim() ?? '',
      severity: (match[2]?.toLowerCase() ?? 'minor') as GapItem['severity'],
      mitigation: match[3]?.trim() || undefined,
    });
  }

  return {
    company,
    role,
    score,
    archetype,
    legitimacy,
    tldR,
    scores: {
      cvMatch: blockA,
      northStar: blockB,
      comp: blockC,
      cultural: blockD,
      redFlags: blockE,
      global: score,
    },
    gaps,
  };
}
