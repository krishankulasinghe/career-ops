import { describe, it, expect } from 'vitest';
import { parseScoreSummary } from '../../src/modules/ai/ai.provider.js';
import { calculateCost, estimateTokens } from '../../src/modules/ai/ai.cost-tracker.js';

const FIXTURE_REPORT = `
# Evaluation Report

## Job Overview
**Company:** TestCorp
**Role:** Senior Software Engineer

## Block A: CV Match
Score: 4.2/5

## Block B: North Star
Score: 3.8/5

---SCORE_SUMMARY---
Company: TestCorp
Role: Senior Software Engineer
Overall Score: 4.1/5
Archetype: IC Technical
Legitimacy: Tier 1 — Verified
TL;DR: Strong match with minor gaps
Block A: 4.2
Block B: 3.8
Block C: 4.0
Block D: 3.5
Block E: 4.5
Gap: React experience | soft | Can be addressed with 2-3 weeks study
Gap: AWS certification | minor | Not required for the role
---END_SUMMARY---
`;

describe('parseScoreSummary', () => {
  it('extracts company and role', () => {
    const result = parseScoreSummary(FIXTURE_REPORT);
    expect(result.company).toBe('TestCorp');
    expect(result.role).toBe('Senior Software Engineer');
  });

  it('score is in [0, 5]', () => {
    const result = parseScoreSummary(FIXTURE_REPORT);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.score).toBe(4.1);
  });

  it('parses block scores', () => {
    const result = parseScoreSummary(FIXTURE_REPORT);
    expect(result.scores.cvMatch).toBe(4.2);
    expect(result.scores.northStar).toBe(3.8);
  });

  it('gaps is non-empty array', () => {
    const result = parseScoreSummary(FIXTURE_REPORT);
    expect(result.gaps).toBeInstanceOf(Array);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('handles missing summary gracefully', () => {
    const result = parseScoreSummary('# Report with no summary block');
    expect(result.score).toBe(0);
    expect(result.gaps).toBeInstanceOf(Array);
  });
});

describe('calculateCost', () => {
  it('returns positive USD for deepseek', () => {
    const cost = calculateCost('deepseek', 'deepseek-chat', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('returns positive USD for gemini', () => {
    const cost = calculateCost('gemini', 'gemini-2.0-flash', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('returns 0 for unknown provider', () => {
    const cost = calculateCost('unknown', 'unknown-model', 1000, 500);
    expect(cost).toBe(0);
  });
});

describe('estimateTokens', () => {
  it('estimates tokens from text', () => {
    const tokens = estimateTokens('Hello world, this is a test string.');
    expect(tokens).toBeGreaterThan(0);
  });
});
