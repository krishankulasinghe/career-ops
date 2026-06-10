import { describe, it, expect } from 'vitest';
import { classifyLiveness } from '../../src/shared/liveness-classifier.js';

describe('classifyLiveness', () => {
  it('returns expired for HTTP 404', () => {
    const result = classifyLiveness({ status: 404, bodyText: 'Page not found' });
    expect(result.result).toBe('expired');
    expect(result.reason).toContain('404');
  });

  it('returns expired for HTTP 410', () => {
    const result = classifyLiveness({ status: 410, bodyText: 'Gone' });
    expect(result.result).toBe('expired');
    expect(result.reason).toContain('410');
  });

  it('returns expired when body contains "job is no longer available"', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'We are sorry, this job is no longer available.',
    });
    expect(result.result).toBe('expired');
  });

  it('returns expired when body contains "position has been filled"', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'Thank you for your interest. This position has been filled.',
    });
    expect(result.result).toBe('expired');
  });

  it('returns expired when body contains "applications are closed"', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'Applications are closed for this role.',
    });
    expect(result.result).toBe('expired');
  });

  it('returns expired for redirect URL containing error=true', () => {
    const result = classifyLiveness({
      status: 200,
      finalUrl: 'https://example.com/jobs?error=true',
      bodyText: 'Some content here...',
    });
    expect(result.result).toBe('expired');
  });

  it('returns active when apply control detected', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'Company XYZ is hiring. Great opportunity.',
      applyControls: ['Apply Now', 'Submit Application'],
    });
    expect(result.result).toBe('active');
    expect(result.reason).toContain('apply control');
  });

  it('returns active with "Easy Apply" button', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'Senior Engineer role at a great company. More than 300 characters of content here to pass the minimum threshold check for content length validation purposes.',
      applyControls: ['Easy Apply'],
    });
    expect(result.result).toBe('active');
  });

  it('returns uncertain when content present but no apply control', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'A'.repeat(400), // plenty of content
      applyControls: [],
    });
    expect(result.result).toBe('uncertain');
  });

  it('returns expired when content is too short', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'Short text',
      applyControls: [],
    });
    expect(result.result).toBe('expired');
    expect(result.reason).toContain('insufficient content');
  });

  it('returns expired when listing page detected', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: '47 jobs found matching your criteria in engineering',
      applyControls: [],
    });
    expect(result.result).toBe('expired');
  });

  it('handles defaults gracefully (no params)', () => {
    const result = classifyLiveness();
    expect(['expired', 'uncertain']).toContain(result.result);
  });

  it('expired body pattern takes priority over apply control', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'This job is no longer available. We appreciate your interest.',
      applyControls: ['Apply Now'],
    });
    expect(result.result).toBe('expired');
  });

  it('handles German expired pattern', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: 'Diese Stelle ist nicht mehr besetzt.',
    });
    expect(result.result).toBe('expired');
  });

  it('handles French expired pattern', () => {
    const result = classifyLiveness({
      status: 200,
      bodyText: "Cette offre n'est plus disponible.",
    });
    expect(result.result).toBe('expired');
  });
});
