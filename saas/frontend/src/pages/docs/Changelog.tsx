import { Layout } from '@/components/layout/Layout';
import { IconStar, IconRocket, IconUsers, IconChartBar } from '@tabler/icons-react';

export function ChangelogPage() {
  return (
    <Layout title="Changelog">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 id="v1-7-0" className="docs-anchor mb-0">v1.7.0</h2>
                <span className="badge bg-success">Current</span>
              </div>
              <p className="text-secondary small mb-3">Released 2026-06-10</p>

              <h6 className="text-primary mb-2">
                <IconStar size={14} className="me-2" />Tabler Theme Migration
              </h6>
              <ul className="small mb-3">
                <li>Migrated the entire frontend from Adminator-inspired styles to <strong>Tabler v1.4.0</strong> Bootstrap 5 admin template</li>
                <li>All 30+ dashboard pages re-styled with Tabler utility classes, cards, and layout patterns</li>
                <li>ECharts charts integrated with Tabler color tokens for light and dark mode</li>
                <li>New sticky anchor-link sidebar added to all documentation pages</li>
                <li>Dark mode implementation using <code>data-bs-theme</code> attribute — FOUC-free with inline script fallback</li>
              </ul>

              <h6 className="text-primary mb-2">
                <IconRocket size={14} className="me-2" />SaaS Transformation
              </h6>
              <ul className="small mb-3">
                <li>Full multi-tenant architecture with <code>org_id</code> scoping on every DB query</li>
                <li>Fastify + Drizzle + PostgreSQL 16 backend replacing the CLI-only workflow</li>
                <li>BullMQ async job queues for evaluation, scan, PDF, liveness, analytics, and import workers</li>
                <li>S3-compatible object storage (MinIO dev / AWS S3 or R2 prod) for PDFs and CV files</li>
                <li>Lucia Auth session management with JWT API key support</li>
                <li>Organization onboarding wizard with profile setup, CV import, and portal configuration</li>
              </ul>

              <h6 className="text-primary mb-2">
                <IconUsers size={14} className="me-2" />Multi-Tenancy &amp; Teams
              </h6>
              <ul className="small mb-3">
                <li>Organization memberships, invites, and RBAC (owner / admin / member)</li>
                <li>SSO support via SAML 2.0 and OIDC for enterprise plans</li>
                <li>Per-org branding settings (logo, primary color, display name) applied at runtime</li>
                <li>Data residency configuration (EU, US, APAC) on enterprise plans</li>
                <li>Audit log for all mutations — writes via <code>audit.service.ts</code></li>
              </ul>

              <h6 className="text-primary mb-2">
                <IconChartBar size={14} className="me-2" />ECharts &amp; Analytics
              </h6>
              <ul className="small mb-0">
                <li>Replaced Recharts with <code>echarts-for-react</code> across the entire dashboard</li>
                <li>Score distribution histogram, pipeline funnel, acceptance trend, company heatmap</li>
                <li>Pattern analysis surfacing rejection reasons and targeting gaps</li>
                <li>Follow-up cadence calculator with overdue application alerts</li>
              </ul>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="v1-6-0" className="docs-anchor mb-3">v1.6.0</h2>
              <p className="text-secondary small mb-3">Released 2025-04-18</p>

              <ul className="small mb-0">
                <li>Multi-CLI support via the Open Agent Skill Standard — skills now work across Claude Code, Gemini CLI, Codex, OpenCode, Qwen, and Copilot</li>
                <li>Added German (<code>modes/de/</code>), French (<code>modes/fr/</code>), and Japanese (<code>modes/ja/</code>) language mode packs</li>
                <li>New <code>interview-prep</code> mode for company-specific interview coaching with STAR+R story bank</li>
                <li>Legitimacy block (Block G) added to all evaluation reports with <code>**Legitimacy:** {'{tier}'}</code> header field</li>
                <li>Playwright liveness checker now used for all offer verification — <code>check-liveness.mjs</code> and <code>liveness-core.mjs</code> refactored as zero-dep pure functions</li>
                <li>Batch processing improvements: <code>merge-tracker.mjs</code> handles column-order swap automatically</li>
                <li><code>normalize-statuses.mjs</code> and <code>dedup-tracker.mjs</code> scripts added for pipeline health maintenance</li>
                <li>GitHub Actions CI: 63+ test assertions, auto-labeler, Dependabot monitoring for npm/Go/Actions</li>
              </ul>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="v1-5-0" className="docs-anchor mb-3">v1.5.0</h2>
              <p className="text-secondary small mb-3">Released 2024-11-03</p>

              <ul className="small mb-0">
                <li>Initial public open-source release of Career-Ops CLI</li>
                <li>AI-powered offer evaluation with six-block scoring system (A–F)</li>
                <li>PDF report generation via Playwright HTML-to-PDF pipeline</li>
                <li>Zero-token portal scanner targeting Greenhouse, Ashby, and Lever ATS APIs</li>
                <li>Application pipeline tracker (<code>data/applications.md</code>) with canonical status system</li>
                <li>CV generation from Markdown source with HTML and LaTeX templates</li>
                <li>Pattern analysis script for surfacing rejection trends</li>
                <li>Follow-up cadence calculator</li>
                <li>DeepSeek primary and Gemini fallback AI providers</li>
                <li>Onboarding wizard for first-time setup (CV, profile, portals, tracker)</li>
              </ul>
            </div>
          </div>

        </div>

        <div className="col-lg-3">
          <div className="card sticky-top" style={{ top: 72 }}>
            <div className="card-header">
              <h6 className="mb-0">On this page</h6>
            </div>
            <div className="card-body p-0">
              <nav className="nav flex-column py-2">
                <a className="nav-link py-1 small" href="#v1-7-0">
                  v1.7.0 <span className="badge bg-success ms-1" style={{ fontSize: '0.65rem' }}>Current</span>
                </a>
                <a className="nav-link py-1 small" href="#v1-6-0">v1.6.0</a>
                <a className="nav-link py-1 small" href="#v1-5-0">v1.5.0</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
