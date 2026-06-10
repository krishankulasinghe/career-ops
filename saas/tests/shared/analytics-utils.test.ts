import { describe, it, expect } from 'vitest';
import {
  classifyRemote,
  classifyCompanySize,
  extractBlockerType,
  scoreStats,
} from '../../src/shared/analytics-utils.js';

describe('classifyRemote', () => {
  it('classifies US-only as geo-restricted', () => {
    expect(classifyRemote('US only')).toBe('geo-restricted');
    expect(classifyRemote('US-only candidates')).toBe('geo-restricted');
    expect(classifyRemote('USA only')).toBe('geo-restricted');
    expect(classifyRemote('US residents only')).toBe('geo-restricted');
  });

  it('classifies Canada-only as geo-restricted', () => {
    expect(classifyRemote('Canada only')).toBe('geo-restricted');
    expect(classifyRemote('Canada residents only')).toBe('geo-restricted');
  });

  it('classifies hybrid/onsite', () => {
    expect(classifyRemote('Hybrid - 3 days in office')).toBe('hybrid/onsite');
    expect(classifyRemote('On-site required')).toBe('hybrid/onsite');
    expect(classifyRemote('Office based role')).toBe('hybrid/onsite');
  });

  it('classifies global remote', () => {
    expect(classifyRemote('Global remote, work from anywhere')).toBe('global remote');
    expect(classifyRemote('Anywhere in the world')).toBe('global remote');
    expect(classifyRemote('Worldwide team')).toBe('global remote');
  });

  it('classifies regional remote', () => {
    expect(classifyRemote('Remote - LATAM')).toBe('regional remote');
    expect(classifyRemote('Fully remote Americas')).toBe('regional remote');
    expect(classifyRemote('Brazil remote')).toBe('regional remote');
  });

  it('returns unknown for empty/null', () => {
    expect(classifyRemote(null)).toBe('unknown');
    expect(classifyRemote(undefined)).toBe('unknown');
    expect(classifyRemote('')).toBe('unknown');
  });

  it('returns unknown for unrecognized text', () => {
    expect(classifyRemote('Flexible arrangement')).toBe('unknown');
  });
});

describe('classifyCompanySize', () => {
  it('classifies startup for small numbers', () => {
    expect(classifyCompanySize('10-50 employees')).toBe('startup');
    expect(classifyCompanySize('25 people')).toBe('startup');
  });

  it('classifies scaleup for mid-range', () => {
    expect(classifyCompanySize('100-500 employees')).toBe('scaleup');
    expect(classifyCompanySize('200 people')).toBe('scaleup');
  });

  it('classifies enterprise for large numbers', () => {
    expect(classifyCompanySize('5,000+ employees')).toBe('enterprise');
    expect(classifyCompanySize('10000 people')).toBe('enterprise');
  });

  it('classifies by keyword', () => {
    expect(classifyCompanySize('Small startup team')).toBe('startup');
    expect(classifyCompanySize('Large enterprise company')).toBe('enterprise');
  });

  it('returns unknown for null/empty', () => {
    expect(classifyCompanySize(null)).toBe('unknown');
    expect(classifyCompanySize(undefined)).toBe('unknown');
    expect(classifyCompanySize('')).toBe('unknown');
  });

  it('returns unknown for unrecognized text', () => {
    expect(classifyCompanySize('Team size varies')).toBe('unknown');
  });
});

describe('extractBlockerType', () => {
  it('identifies geo-restriction blockers', () => {
    const gap = { description: 'Must be US residency or citizen', severity: 'hard' };
    expect(extractBlockerType(gap)).toBe('geo-restriction');
  });

  it('identifies stack mismatch blockers', () => {
    const gap = { description: 'Requires Python experience', severity: 'hard' };
    expect(extractBlockerType(gap)).toBe('stack-mismatch');
  });

  it('identifies seniority mismatch blockers', () => {
    const gap = { description: 'Position requires senior/lead experience', severity: 'hard' };
    expect(extractBlockerType(gap)).toBe('seniority-mismatch');
  });

  it('identifies onsite requirement blockers', () => {
    const gap = { description: 'Requires hybrid or on-site presence in NYC', severity: 'hard' };
    expect(extractBlockerType(gap)).toBe('onsite-requirement');
  });

  it('returns null for soft/nice-to-have gaps', () => {
    const gap = { description: 'Python experience preferred', severity: 'nice-to-have' };
    expect(extractBlockerType(gap)).toBeNull();
  });

  it('returns null for soft severity', () => {
    const gap = { description: 'TypeScript experience', severity: 'soft' };
    expect(extractBlockerType(gap)).toBeNull();
  });

  it('returns other for unrecognized hard gaps', () => {
    const gap = { description: 'Unrelated requirement here', severity: 'hard' };
    expect(extractBlockerType(gap)).toBe('other');
  });

  it('identifies React stack mismatch', () => {
    const gap = { description: 'Must have React experience', severity: 'critical' };
    expect(extractBlockerType(gap)).toBe('stack-mismatch');
  });
});

describe('scoreStats', () => {
  it('returns correct stats for an array of scores', () => {
    const stats = scoreStats([3.0, 4.0, 5.0, 2.5, 4.5]);
    expect(stats.avg).toBe(3.8);
    expect(stats.min).toBe(2.5);
    expect(stats.max).toBe(5.0);
    expect(stats.count).toBe(5);
  });

  it('returns zeros for empty array', () => {
    const stats = scoreStats([]);
    expect(stats.avg).toBe(0);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.count).toBe(0);
  });

  it('handles single element', () => {
    const stats = scoreStats([4.2]);
    expect(stats.avg).toBe(4.2);
    expect(stats.min).toBe(4.2);
    expect(stats.max).toBe(4.2);
    expect(stats.count).toBe(1);
  });

  it('rounds average to 2 decimal places', () => {
    const stats = scoreStats([1, 2, 3]);
    expect(stats.avg).toBe(2);
  });

  it('handles floating point averages', () => {
    const stats = scoreStats([3.3, 3.3, 3.4]);
    expect(stats.avg).toBe(3.33);
  });
});
