import { describe, it, expect } from 'vitest';
import { roleTokens, roleFuzzyMatch, normalizeTextForATS } from '../../src/shared/text-utils.js';

describe('roleTokens', () => {
  it('tokenizes a simple role', () => {
    const tokens = roleTokens('Software Engineer');
    expect(tokens).toContain('software');
    expect(tokens).toContain('engineer');
  });

  it('excludes stopwords', () => {
    const tokens = roleTokens('Senior Software Engineer');
    expect(tokens).not.toContain('senior');
    expect(tokens).toContain('software');
    expect(tokens).toContain('engineer');
  });

  it('excludes words shorter than 4 chars', () => {
    const tokens = roleTokens('Go Dev Role');
    expect(tokens).not.toContain('dev');
    expect(tokens).not.toContain('role');
  });

  it('lowercases all tokens', () => {
    const tokens = roleTokens('BACKEND ENGINEER');
    expect(tokens).toContain('backend');
    expect(tokens).toContain('engineer');
  });

  it('handles special characters', () => {
    const tokens = roleTokens('Full-Stack Engineer (React/Node)');
    expect(tokens).toContain('full');
    expect(tokens).toContain('stack');
    expect(tokens).toContain('engineer');
    expect(tokens).toContain('react');
    expect(tokens).toContain('node');
  });

  it('returns empty array for empty string', () => {
    const tokens = roleTokens('');
    expect(tokens).toEqual([]);
  });

  it('excludes location stopwords', () => {
    const tokens = roleTokens('Backend Engineer London');
    expect(tokens).not.toContain('london');
    expect(tokens).toContain('backend');
    expect(tokens).toContain('engineer');
  });
});

describe('roleFuzzyMatch', () => {
  it('matches identical roles', () => {
    expect(roleFuzzyMatch('Senior Software Engineer', 'Senior Software Engineer')).toBe(true);
  });

  it('matches similar roles ignoring seniority', () => {
    expect(roleFuzzyMatch('Senior Backend Engineer', 'Staff Backend Engineer')).toBe(true);
  });

  it('matches when title order differs', () => {
    expect(roleFuzzyMatch('Machine Learning Engineer', 'Engineer Machine Learning')).toBe(true);
  });

  it('does not match completely different roles', () => {
    expect(roleFuzzyMatch('Frontend Designer', 'Backend Database Administrator')).toBe(false);
  });

  it('does not match with only 1 overlapping token', () => {
    expect(roleFuzzyMatch('Product Engineer', 'Engineering Manager')).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(roleFuzzyMatch('', 'Software Engineer')).toBe(false);
    expect(roleFuzzyMatch('Software Engineer', '')).toBe(false);
  });

  it('matches full-stack variants', () => {
    expect(roleFuzzyMatch('Full Stack Developer', 'Full-Stack Engineer')).toBe(true);
  });

  it('does not match QA and Engineering', () => {
    expect(roleFuzzyMatch('Quality Assurance Engineer', 'Software Engineer')).toBe(false);
  });

  it('matches data engineering roles', () => {
    expect(roleFuzzyMatch('Data Engineer', 'Senior Data Engineer')).toBe(true);
  });
});

describe('normalizeTextForATS', () => {
  it('replaces em-dash with hyphen', () => {
    const { html, replacements } = normalizeTextForATS('<p>2020—present</p>');
    expect(html).toBe('<p>2020-present</p>');
    expect(replacements['em-dash']).toBe(1);
  });

  it('replaces en-dash with hyphen', () => {
    const { html, replacements } = normalizeTextForATS('<p>2019–2020</p>');
    expect(html).toBe('<p>2019-2020</p>');
    expect(replacements['en-dash']).toBe(1);
  });

  it('replaces smart quotes with straight quotes', () => {
    const { html, replacements } = normalizeTextForATS('<p>“Hello”</p>');
    expect(html).toBe('<p>"Hello"</p>');
    expect(replacements['smart-double-quote']).toBe(2);
  });

  it('replaces ellipsis with three dots', () => {
    const { html, replacements } = normalizeTextForATS('<p>More…</p>');
    expect(html).toBe('<p>More...</p>');
    expect(replacements['ellipsis']).toBe(1);
  });

  it('preserves tag attributes unchanged', () => {
    const { html } = normalizeTextForATS('<a href="https://example.com—test">link</a>');
    // href inside tag attribute should be preserved unchanged
    expect(html).toContain('href="https://example.com');
  });

  it('does not modify content inside style tags', () => {
    const input = '<style>body { content: "“test”" }</style>';
    const { html } = normalizeTextForATS(input);
    expect(html).toBe(input);
  });

  it('does not modify content inside script tags', () => {
    const input = '<script>const x = "“test”";</script>';
    const { html } = normalizeTextForATS(input);
    expect(html).toBe(input);
  });

  it('returns empty replacements for clean HTML', () => {
    const { replacements } = normalizeTextForATS('<p>Clean text here</p>');
    expect(Object.keys(replacements)).toHaveLength(0);
  });

  it('handles multiple replacements in one string', () => {
    const { html, replacements } = normalizeTextForATS('<p>From 2020—2023 and “great” results…</p>');
    expect(html).toBe('<p>From 2020-2023 and "great" results...</p>');
    expect(replacements['em-dash']).toBe(1);
    expect(replacements['smart-double-quote']).toBe(2);
    expect(replacements['ellipsis']).toBe(1);
  });

  it('handles empty string', () => {
    const { html, replacements } = normalizeTextForATS('');
    expect(html).toBe('');
    expect(Object.keys(replacements)).toHaveLength(0);
  });
});
