// Port of classification helpers from analyze-patterns.mjs

export type RemotePolicy = 'geo-restricted' | 'hybrid/onsite' | 'global remote' | 'regional remote' | 'unknown';

export function classifyRemote(raw: string | null | undefined): RemotePolicy {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (/\b(us[- ]?only|canada[- ]?only|residents only|usa only|us residents|canada residents)\b/.test(lower)) return 'geo-restricted';
  if (/\bargentina\s+remote\s+only\b/.test(lower)) return 'geo-restricted';
  if (/\b(hybrid|on-?site|office|columbus|cape town|relocat)\b/.test(lower)) return 'hybrid/onsite';
  if (/\b(global|anywhere|worldwide|no restrict|70\+|work from anywhere)\b/.test(lower)) return 'global remote';
  if (/\b(remote|latam|americas|brazil|fully remote)\b/.test(lower)) return 'regional remote';
  return 'unknown';
}

export type CompanySize = 'startup' | 'scaleup' | 'enterprise' | 'unknown';

export function classifyCompanySize(teamSize: string | null | undefined): CompanySize {
  if (!teamSize) return 'unknown';
  const lower = teamSize.toLowerCase();
  const nums = lower.match(/[\d,]+/g);
  if (nums) {
    const max = Math.max(...nums.map((n) => parseInt(n.replace(/,/g, ''), 10)));
    if (max <= 50) return 'startup';
    if (max <= 500) return 'scaleup';
    return 'enterprise';
  }
  if (/\b(small|elite|tiny|founding)\b/.test(lower)) return 'startup';
  if (/\b(large|enterprise|global)\b/.test(lower)) return 'enterprise';
  return 'unknown';
}

export type BlockerType = 'geo-restriction' | 'stack-mismatch' | 'seniority-mismatch' | 'onsite-requirement' | 'other' | null;

export function extractBlockerType(gap: { description: string; severity: string }): BlockerType {
  const desc = gap.description.toLowerCase();
  const sev = gap.severity.toLowerCase();
  if (sev.includes('nice') || sev.includes('soft')) return null;
  if (/\b(residency|us[- ]?only|canada|location|visa|geo|country|region)\b/.test(desc)) return 'geo-restriction';
  if (/\b(javascript|typescript|python|ruby|java|go|rust|node|react|angular|vue|django|flask|rails)\b/.test(desc)) return 'stack-mismatch';
  if (/\b(senior|staff|lead|principal|director|manager|head)\b/.test(desc)) return 'seniority-mismatch';
  if (/\b(hybrid|on-?site|office|relocat)\b/.test(desc)) return 'onsite-requirement';
  return 'other';
}

export interface ScoreStats {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export function scoreStats(scores: number[]): ScoreStats {
  if (scores.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    avg: Math.round(avg * 100) / 100,
    min: Math.min(...scores),
    max: Math.max(...scores),
    count: scores.length,
  };
}
