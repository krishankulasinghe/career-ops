import { URL } from 'url';

export interface ExtractedMeta {
  company: string | null;
  title: string | null;
}

// Best-effort extraction of company/title from a job URL before queueing
export function extractMetaFromUrl(rawUrl: string): ExtractedMeta {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { company: null, title: null };
  }

  const hostname = parsed.hostname.replace(/^www\./, '');
  const parts = hostname.split('.');
  const company = parts.length >= 2 ? parts[parts.length - 2] : hostname;

  // Try to pull a job title from known ATS URL patterns
  const path = parsed.pathname;
  let title: string | null = null;

  // Greenhouse: /jobs/<title-slug>  or  /gh/jobs/<title-slug>
  const ghMatch = path.match(/\/jobs\/([^/?#]+)/i);
  if (ghMatch) title = slugToTitle(ghMatch[1]);

  // Lever: /jobs/<id>/<title-slug>  (last segment is title)
  if (!title) {
    const leverMatch = path.match(/\/(?:jobs|postings)\/[^/]+\/([^/?#]+)/i);
    if (leverMatch) title = slugToTitle(leverMatch[1]);
  }

  return { company, title };
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}
