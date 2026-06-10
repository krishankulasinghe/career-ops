import type { FastifyInstance } from 'fastify';
import { getAuditLogStats } from './soc2.service.js';

// Subprocessors list — updated as of 2025
const SUBPROCESSORS = [
  {
    name: 'Amazon Web Services (AWS)',
    category: 'Infrastructure',
    country: 'United States / EU / Singapore',
    purpose: 'Cloud hosting, compute, storage, database, networking',
    link: 'https://aws.amazon.com/compliance/gdpr-center/',
  },
  {
    name: 'DeepSeek',
    category: 'AI Provider',
    country: 'China',
    purpose: 'AI evaluation of job descriptions (primary provider)',
    link: 'https://deepseek.com/privacy',
  },
  {
    name: 'Google (Gemini)',
    category: 'AI Provider',
    country: 'United States',
    purpose: 'AI evaluation of job descriptions (fallback provider)',
    link: 'https://cloud.google.com/terms/data-processing-addendum',
  },
  {
    name: 'OpenAI',
    category: 'AI Provider',
    country: 'United States',
    purpose: 'AI evaluation of job descriptions (optional provider)',
    link: 'https://openai.com/enterprise-privacy/',
  },
  {
    name: 'Anthropic',
    category: 'AI Provider',
    country: 'United States',
    purpose: 'AI evaluation of job descriptions (optional provider)',
    link: 'https://www.anthropic.com/legal/privacy',
  },
  {
    name: 'Stripe',
    category: 'Payments',
    country: 'United States',
    purpose: 'Payment processing, billing, invoicing',
    link: 'https://stripe.com/privacy',
  },
  {
    name: 'Resend',
    category: 'Email',
    country: 'United States',
    purpose: 'Transactional email delivery',
    link: 'https://resend.com/privacy',
  },
  {
    name: 'PostHog',
    category: 'Analytics',
    country: 'United States / EU',
    purpose: 'Product analytics and feature flags',
    link: 'https://posthog.com/privacy',
  },
  {
    name: 'Sentry',
    category: 'Error Monitoring',
    country: 'United States',
    purpose: 'Application error tracking and performance monitoring',
    link: 'https://sentry.io/privacy/',
  },
];

// SOC 2 controls status
const CONTROLS = [
  { category: 'CC1 — Control Environment', items: [
    { name: 'Code of Conduct', status: 'implemented', detail: 'Published at /code-of-conduct' },
    { name: 'Background checks', status: 'implemented', detail: 'All employees and contractors' },
    { name: 'Security training', status: 'implemented', detail: 'Annual security awareness training' },
    { name: 'Org chart & accountability', status: 'implemented', detail: 'BDFL governance model documented' },
  ]},
  { category: 'CC2 — Communication & Information', items: [
    { name: 'Security policy', status: 'implemented', detail: 'SECURITY.md in repository' },
    { name: 'Incident response plan', status: 'implemented', detail: 'docs/incident-response.md' },
    { name: 'Subprocessors list', status: 'implemented', detail: 'Published at /trust (this page)' },
    { name: 'Data Processing Agreement', status: 'implemented', detail: 'Available at /dpa' },
  ]},
  { category: 'CC3 — Risk Assessment', items: [
    { name: 'Annual risk assessment', status: 'implemented', detail: 'Reviewed quarterly by engineering lead' },
    { name: 'Threat modeling', status: 'in-progress', detail: 'In progress for Phase 4' },
    { name: 'Vulnerability scanning', status: 'implemented', detail: 'Trivy + npm audit in CI (see .github/workflows/saas-ci.yml)' },
    { name: 'Penetration testing', status: 'planned', detail: 'Pre-launch pentest planned' },
  ]},
  { category: 'CC6 — Logical & Physical Access', items: [
    { name: 'MFA enforcement', status: 'implemented', detail: 'TOTP 2FA available for all users' },
    { name: 'SSO / SAML', status: 'implemented', detail: 'SAML/OIDC for Enterprise and Team plans' },
    { name: 'Least privilege access', status: 'implemented', detail: 'RBAC with owner/admin/member roles' },
    { name: 'Access review cadence', status: 'implemented', detail: 'Quarterly access review process' },
    { name: 'API key rotation', status: 'implemented', detail: 'Revocable API keys with per-key scopes' },
    { name: 'Session management', status: 'implemented', detail: 'DB-backed sessions, forced expiry on logout' },
  ]},
  { category: 'CC7 — System Operations', items: [
    { name: 'Availability monitoring', status: 'implemented', detail: 'Health endpoints per region + CloudWatch' },
    { name: 'Multi-region deployment', status: 'implemented', detail: 'US / EU / APAC with latency routing' },
    { name: 'Automated backups', status: 'implemented', detail: 'RDS automated backups, 35-day retention on Enterprise' },
    { name: 'Disaster recovery runbook', status: 'implemented', detail: 'docs/disaster-recovery.md' },
    { name: 'Change management', status: 'implemented', detail: 'Branch protection, CI required, PR review' },
  ]},
  { category: 'CC8 — Change Management', items: [
    { name: 'CI/CD pipeline', status: 'implemented', detail: 'GitHub Actions: lint, test, type-check, security scan' },
    { name: 'Dependency scanning', status: 'implemented', detail: 'Dependabot for npm, GitHub Actions, Go modules' },
    { name: 'SBOM generation', status: 'implemented', detail: 'SBOM published on each release (.github/workflows/sbom.yml)' },
    { name: 'Container scanning', status: 'implemented', detail: 'Trivy image scan in deploy workflow' },
  ]},
  { category: 'P — Privacy', items: [
    { name: 'Data residency selection', status: 'implemented', detail: 'US / EU / APAC per org (Team/Enterprise)' },
    { name: 'GDPR data export', status: 'planned', detail: 'Task 59 — in roadmap' },
    { name: 'Right to erasure', status: 'planned', detail: 'Task 59 — in roadmap' },
    { name: 'Cookie consent', status: 'planned', detail: 'Task 52 — in roadmap' },
    { name: 'Encryption at rest', status: 'implemented', detail: 'AES-256-GCM for secrets, RDS/S3 KMS encryption' },
    { name: 'Encryption in transit', status: 'implemented', detail: 'TLS 1.3 enforced on all ALBs, internal VPC TLS' },
  ]},
];

export async function trustRoutes(fastify: FastifyInstance) {
  // Public endpoint — no auth required
  fastify.get('/api/v1/trust', async () => {
    const auditStats = await getAuditLogStats();
    return {
      lastUpdated: '2025-06-10',
      controls: CONTROLS,
      subprocessors: SUBPROCESSORS,
      certifications: [
        { name: 'SOC 2 Type II', status: 'in-progress', eta: '2026-Q1' },
        { name: 'GDPR Compliant', status: 'in-progress', detail: 'EU data residency available; DPA on request' },
        { name: 'ISO 27001', status: 'planned', eta: '2026-Q3' },
      ],
      auditLog: {
        retentionPolicy: auditStats.retentionByPlan,
        totalEntries: auditStats.totalEntries,
        oldestEntry: auditStats.oldestEntry,
      },
      encryption: {
        atRest: 'AES-256-GCM (secrets), AWS KMS (RDS, S3)',
        inTransit: 'TLS 1.3 (public), mutual TLS (internal)',
        keyRotation: 'Annual KMS key rotation enabled',
      },
      contact: {
        security: 'security@career-ops.io',
        privacy: 'privacy@career-ops.io',
        dpa: '/api/v1/trust/dpa',
      },
    };
  });

  // DPA template redirect / download
  fastify.get('/api/v1/trust/dpa', async (_req, reply) => {
    return reply.redirect('/trust#dpa');
  });
}
