// Port of ATS detection logic from scan.mjs

export interface CompanyConfig {
  careers_url?: string;
  api?: string;
  name?: string;
}

export interface AtsEndpoint {
  type: 'greenhouse' | 'ashby' | 'lever';
  url: string;
}

// Detects which ATS API backs a company's careers page
export function detectApi(company: CompanyConfig): AtsEndpoint | null {
  if (company.api?.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url ?? '';

  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  const ghEuMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghEuMatch && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghEuMatch[1]}/jobs`,
    };
  }

  return null;
}

export interface TitleFilter {
  positive?: string[];
  negative?: string[];
}

// Returns a predicate that returns true when a job title passes positive + negative filters
export function buildTitleFilter(titleFilter: TitleFilter | undefined): (title: string) => boolean {
  const positive = (titleFilter?.positive ?? []).map((k) => k.toLowerCase());
  const negative = (titleFilter?.negative ?? []).map((k) => k.toLowerCase());

  return (title: string): boolean => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some((k) => lower.includes(k));
    const hasNegative = negative.some((k) => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}
