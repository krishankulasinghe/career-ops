import { Layout } from '@/components/layout/Layout';

export function GulpPage() {
  return (
    <Layout title="Build & Tooling">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="dev-server" className="docs-anchor mb-3">Development Server</h2>
              <p>
                Career-Ops SaaS uses <strong>Vite</strong> for the frontend and{' '}
                <strong>tsx watch</strong> for the backend API. Both processes need to run
                simultaneously during development, along with the BullMQ worker process.
              </p>

              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# Terminal 1 — Postgres, Redis, MinIO
docker compose up -d

# Terminal 2 — Fastify API (auto-reloads on file change)
npm run dev          # listens on :3000

# Terminal 3 — BullMQ workers (evaluation, scan, pdf, liveness)
npm run worker

# Terminal 4 — Vite dev server (HMR enabled)
cd frontend && npm run dev   # listens on :5173`}</code>
              </pre>

              <p className="mt-3">
                The Vite config proxies <code>/api</code> requests to <code>localhost:3000</code>,
                so the frontend can talk to the API without CORS issues during development.
                HMR (Hot Module Replacement) is enabled by default — React component changes
                are applied in the browser without a full reload.
              </p>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-3">
                <span className="fas fa-info-circle mt-1"></span>
                <div>
                  Health check: <code>GET http://localhost:3000/health</code> pings Postgres,
                  Redis, and S3. All three must be green before the API accepts traffic.
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="production-build" className="docs-anchor mb-3">Building for Production</h2>
              <p>
                The frontend produces a static build that can be served from any CDN or the
                Fastify server itself. The API compiles TypeScript via <code>tsc</code> to
                <code>dist/</code>.
              </p>

              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# Frontend — outputs to frontend/dist/
cd frontend && npm run build

# API — outputs to dist/
npm run build

# Start the production server
npm start`}</code>
              </pre>

              <h5 className="mt-4">Docker production build</h5>
              <p>
                The repo ships a multi-stage <code>Dockerfile</code> that builds both the API
                and frontend in a single image:
              </p>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# Build the image
docker build -t career-ops-saas:latest .

# Run it (supply env vars via --env-file)
docker run -p 3000:3000 --env-file .env.production career-ops-saas:latest`}</code>
              </pre>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="testing" className="docs-anchor mb-3">Testing</h2>
              <p>
                The test suite runs with <strong>Vitest</strong> — ESM-native, fast, and
                compatible with the same TypeScript configuration as the source. Tests live
                in <code>saas/tests/</code> alongside the modules they cover.
              </p>

              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# Run all tests once
npm test

# Watch mode (re-runs on file save)
npm run test:watch

# Coverage report
npm run test:coverage

# Run a specific test file
npx vitest run tests/modules/evaluations.test.ts`}</code>
              </pre>

              <p className="mt-3">
                Integration tests that require a database spin up an isolated test schema
                using Drizzle migrations. The test setup file creates a fresh schema per
                test run and tears it down on exit — no manual cleanup required.
              </p>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="environment-setup" className="docs-anchor mb-3">Environment Setup</h2>
              <p>
                The GitHub Actions CI pipeline runs on every pull request. It mirrors the local
                dev setup using service containers:
              </p>
              <ul>
                <li>PostgreSQL 16 on port 5432</li>
                <li>Redis 7 on port 6379</li>
                <li>MinIO on port 9000 (S3-compatible)</li>
              </ul>
              <p>
                The workflow file is at <code>.github/workflows/ci.yml</code>. It runs
                TypeScript type-checking, ESLint, Vitest, and the career-ops CLI test suite
                (<code>node test-all.mjs</code>) in sequence. All checks must pass before a PR
                can be merged to <code>main</code>.
              </p>

              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`# Run the same checks locally that CI runs
npx tsc --noEmit            # type check
npx eslint src              # lint
npm test                    # unit + integration tests
node ../../test-all.mjs     # CLI pipeline checks (63+ assertions)`}</code>
              </pre>
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
                <a className="nav-link py-1 fs--1" href="#dev-server">Development Server</a>
                <a className="nav-link py-1 fs--1" href="#production-build">Building for Production</a>
                <a className="nav-link py-1 fs--1" href="#testing">Testing</a>
                <a className="nav-link py-1 fs--1" href="#environment-setup">Environment Setup</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
