import { describe, it, expect } from 'vitest';
import { detectApi, buildTitleFilter } from '../../src/modules/scanner/ats-detector.js';

describe('detectApi', () => {
  it('detects Greenhouse from explicit api field', () => {
    const result = detectApi({ api: 'https://boards-api.greenhouse.io/v1/boards/mycompany/jobs' });
    expect(result?.type).toBe('greenhouse');
    expect(result?.url).toContain('greenhouse');
  });

  it('detects Ashby from careers URL', () => {
    const result = detectApi({ careers_url: 'https://jobs.ashbyhq.com/mycompany' });
    expect(result?.type).toBe('ashby');
    expect(result?.url).toContain('ashbyhq.com');
    expect(result?.url).toContain('mycompany');
  });

  it('detects Lever from careers URL', () => {
    const result = detectApi({ careers_url: 'https://jobs.lever.co/mycompany' });
    expect(result?.type).toBe('lever');
    expect(result?.url).toContain('lever.co');
    expect(result?.url).toContain('mycompany');
  });

  it('detects Greenhouse from job-boards URL', () => {
    const result = detectApi({ careers_url: 'https://job-boards.greenhouse.io/mycompany' });
    expect(result?.type).toBe('greenhouse');
    expect(result?.url).toContain('boards-api.greenhouse.io');
    expect(result?.url).toContain('mycompany');
  });

  it('detects Greenhouse EU from job-boards.eu URL', () => {
    const result = detectApi({ careers_url: 'https://job-boards.eu.greenhouse.io/mycompany' });
    expect(result?.type).toBe('greenhouse');
  });

  it('returns null for unknown ATS', () => {
    const result = detectApi({ careers_url: 'https://careers.example.com/jobs' });
    expect(result).toBeNull();
  });

  it('returns null for empty config', () => {
    const result = detectApi({});
    expect(result).toBeNull();
  });

  it('Ashby URL includes compensation param', () => {
    const result = detectApi({ careers_url: 'https://jobs.ashbyhq.com/acme-corp' });
    expect(result?.url).toContain('includeCompensation=true');
  });

  it('extracts company slug from Ashby URL with path segments', () => {
    const result = detectApi({ careers_url: 'https://jobs.ashbyhq.com/stripe/openings' });
    expect(result?.url).toContain('/stripe?');
  });

  it('extracts company slug from Lever URL with query string', () => {
    const result = detectApi({ careers_url: 'https://jobs.lever.co/shopify?department=eng' });
    expect(result?.url).toContain('/shopify');
  });
});

describe('buildTitleFilter', () => {
  const passFilter = buildTitleFilter({
    positive: ['engineer', 'developer'],
    negative: ['manager', 'director'],
  });

  it('passes title matching positive keyword', () => {
    expect(passFilter('Senior Software Engineer')).toBe(true);
    expect(passFilter('Frontend Developer')).toBe(true);
  });

  it('blocks title matching negative keyword', () => {
    expect(passFilter('Engineering Manager')).toBe(false);
    expect(passFilter('Director of Engineering')).toBe(false);
  });

  it('blocks title with both positive and negative (negative wins)', () => {
    expect(passFilter('Engineer Manager')).toBe(false);
  });

  it('passes any title when no filters defined', () => {
    const allPass = buildTitleFilter(undefined);
    expect(allPass('Anything Goes')).toBe(true);
  });

  it('passes any title when positive list is empty', () => {
    const noPositive = buildTitleFilter({ negative: ['manager'] });
    expect(noPositive('Software Engineer')).toBe(true);
    expect(noPositive('Product Manager')).toBe(false);
  });

  it('passes title with positive filter and empty negative list', () => {
    const onlyPositive = buildTitleFilter({ positive: ['engineer'] });
    expect(onlyPositive('Backend Engineer')).toBe(true);
    expect(onlyPositive('Product Manager')).toBe(false);
  });

  it('is case insensitive', () => {
    const filter = buildTitleFilter({ positive: ['ENGINEER'], negative: ['MANAGER'] });
    expect(filter('Software engineer')).toBe(true);
    expect(filter('Engineering manager')).toBe(false);
  });

  it('handles empty filters object', () => {
    const filter = buildTitleFilter({});
    expect(filter('Any title here')).toBe(true);
  });
});
