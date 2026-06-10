import { Layout } from '@/components/layout/Layout';

export function GettingStartedPage() {
  return (
    <Layout title="Getting Started">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="introduction" className="docs-anchor mb-3">Introduction</h2>
              <p>
                Career-Ops SaaS is a commercial multi-tenant web platform built on top of the
                open-source Career-Ops CLI. It turns the battle-tested job-search pipeline into a
                hosted service — with a React dashboard, AI-powered evaluations, PDF generation,
                portal scanning, and full team collaboration support.
              </p>
              <p className="mb-0">
                This guide walks you through the quickest path to your first evaluation. By the
                end you will have a running instance, a connected AI provider, and a scored job
                offer waiting in your dashboard.
              </p>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="prerequisites" className="docs-anchor mb-3">Prerequisites</h2>
              <p>Before you begin, make sure you have the following installed:</p>
              <ul className="mb-0">
                <li><strong>Docker &amp; Docker Compose</strong> — for Postgres, Redis, and MinIO</li>
                <li><strong>Node.js 20+</strong> — the API and frontend both require Node 20</li>
                <li><strong>pnpm or npm</strong> — dependency management</li>
                <li><strong>An AI provider API key</strong> — DeepSeek (primary) or Gemini (fallback)</li>
              </ul>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="installation" className="docs-anchor mb-3">Installation</h2>

              <h5 id="docker" className="mt-3">1 — Start infrastructure with Docker</h5>
              <p>Clone the repository and spin up the backing services:</p>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`git clone https://github.com/your-org/career-ops-saas.git
cd career-ops-saas/saas
docker compose up -d`}</code>
              </pre>
              <p>
                This starts PostgreSQL 16, Redis 7, and MinIO. The MinIO console is available at{' '}
                <code>http://localhost:9001</code> (credentials: <code>minioadmin / minioadmin</code>).
              </p>

              <h5 className="mt-4">2 — Install dependencies</h5>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# API
npm install
npm run db:generate
npm run db:migrate
npm run db:seed   # optional dev seed data

# Frontend (separate terminal)
cd frontend && npm install`}</code>
              </pre>

              <h5 className="mt-4">3 — Configure environment variables</h5>
              <p>
                Copy the example env file and fill in your credentials. Every variable is
                documented inline.
              </p>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, AI_PROVIDER_KEY, etc.`}</code>
              </pre>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-3">
                <span className="fas fa-info-circle mt-1"></span>
                <div>
                  Never commit <code>.env</code>. The <code>.gitignore</code> already excludes it,
                  but double-check before pushing to a shared repository.
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="first-evaluation" className="docs-anchor mb-3">Your First Evaluation</h2>
              <p>With the services running, start the API and frontend dev servers:</p>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# Terminal 1 — API
npm run dev          # :3000

# Terminal 2 — BullMQ workers
npm run worker

# Terminal 3 — Frontend
cd frontend && npm run dev   # :5173`}</code>
              </pre>
              <p>
                Open <code>http://localhost:5173</code>, register an account, and complete the
                onboarding wizard. Then navigate to <strong>New Evaluation</strong>, paste a job
                posting URL, and hit <strong>Evaluate</strong>. The system enqueues an async AI
                task; you can watch the progress indicator and view the full scored report once
                it completes.
              </p>

              <div className="alert alert-success d-flex gap-2 mb-0 mt-3">
                <span className="fas fa-check-circle mt-1"></span>
                <div>
                  Evaluation results include a score out of 5, gap analysis across six
                  blocks (company, role, compensation, culture, growth, legitimacy), and
                  a ready-to-download PDF report.
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="dashboard-overview" className="docs-anchor mb-3">Dashboard Overview</h2>
              <p>The main dashboard gives you a real-time view of your entire job-search pipeline:</p>
              <ul className="mb-0">
                <li><strong>KPI Cards</strong> — total evaluations, average score, applied count, interview rate</li>
                <li><strong>Score Distribution</strong> — histogram of all evaluated offers by score bucket</li>
                <li><strong>Pipeline Funnel</strong> — conversion rates from Evaluated → Applied → Interview → Offer</li>
                <li><strong>Recent Applications</strong> — sortable table with status badges and quick-links to reports</li>
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
                <a className="nav-link py-1 fs--1" href="#introduction">Introduction</a>
                <a className="nav-link py-1 fs--1" href="#prerequisites">Prerequisites</a>
                <a className="nav-link py-1 fs--1" href="#installation">Installation</a>
                <a className="nav-link py-1 fs--1 ps-4" href="#docker">Docker setup</a>
                <a className="nav-link py-1 fs--1" href="#first-evaluation">First Evaluation</a>
                <a className="nav-link py-1 fs--1" href="#dashboard-overview">Dashboard Overview</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
