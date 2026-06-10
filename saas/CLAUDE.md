# Career-Ops SaaS — Agent Instructions

> **Context:** You are working inside `saas/` — the commercial SaaS layer being built on top of the career-ops CLI tool.
> Full transformation plan: `../SAAS_TRANSFORMATION_PLAN.md` | Implementation prompts: `../IMPLEMENTATION_PROMPTS.md`

---

## What This Project Is

Career-Ops SaaS transforms the open-source CLI tool into a **commercial multi-tenant web platform**:

| Layer | What |
|-------|------|
| **API** | Fastify + TypeScript modular monolith |
| **Database** | PostgreSQL via Drizzle ORM |
| **Queue** | BullMQ + Redis (eval, scan, PDF, liveness workers) |
| **Storage** | S3-compatible (MinIO dev / AWS S3 or R2 prod) |
| **Frontend** | React 18 SPA (Vite) with Adminator-inspired design |
| **AI** | DeepSeek primary, pluggable via `AIProvider` interface |
| **Auth** | Lucia Auth sessions + JWT API keys |

---

## Directory Layout

```
saas/
  src/
    server.ts                   # Fastify bootstrap + plugin registration
    config/
      env.ts                    # Zod-validated env vars — ALWAYS import from here
      database.ts               # Drizzle connection pool
      redis.ts                  # ioredis + BullMQ connection factory
      s3.ts                     # S3Client (MinIO in dev, AWS/R2 in prod)
      ai.ts                     # AI provider config
    db/
      schema.ts                 # ALL Drizzle table definitions (single file)
      migrations/               # Generated via `npm run db:generate`
      seed.ts                   # Dev seed data
    modules/
      auth/                     # Auth routes, service, middleware
      users/                    # GET/PUT /users/me + profile
      organizations/            # Org CRUD, members, invites
      applications/             # Application tracker CRUD + bulk import
      evaluations/              # Async eval: routes, service, queue, worker
      scanner/                  # Portal scanner: routes, service, queue, worker
      pdf/                      # PDF generation: routes, service, queue, worker
      liveness/                 # URL liveness: routes, service, worker
      analytics/                # Patterns, funnel, follow-up cadence
      pipeline/                 # URL inbox management
      portals/                  # Portal config CRUD + YAML import
      templates/                # CV template management
      ai/                       # Provider abstraction + prompt registry
      admin/                    # Platform stats, AI ops (superadmin)
      billing/                  # Usage metering, Stripe hooks
      audit/                    # Audit log writer
    shared/
      errors.ts                 # AppError, NotFoundError, ValidationError, etc.
      pagination.ts             # Cursor + offset pagination helpers
      validation.ts             # Shared Zod schemas
      logger.ts                 # Pino config
      events.ts                 # In-process domain event bus
      text-utils.ts             # normalizeTextForATS, roleTokens, roleFuzzyMatch
      liveness-classifier.ts   # classifyLiveness (ported from ../liveness-core.mjs)
    workers/
      index.ts                  # Worker process entry point (all BullMQ consumers)
  frontend/
    src/
      api/                      # TanStack Query hooks (one file per domain)
      components/
        layout/                 # Sidebar, Header, Layout
        shared/                 # DataTable, KPICard, StatusBadge, ScoreGauge, etc.
      pages/                    # One file per dashboard page
      hooks/                    # useAuth, useOrg
      stores/                   # Zustand (auth.store.ts)
      styles/                   # adminator-tokens.css
  tests/
    modules/                    # Vitest tests per module
    shared/                     # Tests for shared utilities
  docker-compose.yml            # Postgres + Redis + MinIO for local dev
  .env.example                  # All required env vars (never commit .env)
```

---

## Tech Stack & Conventions

### Backend

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | **Fastify** | Native ESM, built-in validation, Pino logging |
| ORM | **Drizzle** | Schema-as-code, no binary engine. Schema lives in `db/schema.ts` |
| Database | **PostgreSQL 16** | JSONB for flexible fields, UUID PKs |
| Queue | **BullMQ** | Named queues: `evaluation`, `scan`, `pdf`, `liveness`, `analytics`, `import` |
| Auth | **Lucia Auth** | DB-backed sessions; JWT for API key auth |
| Validation | **Zod** | All endpoint inputs validated. Schemas in `shared/validation.ts` or inline |
| Logging | **Pino** | Via Fastify. Structured JSON in prod, pretty in dev |
| Testing | **Vitest** | ESM-native. Run `npm test` |

### Frontend

| Concern | Choice |
|---------|--------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Server state | TanStack Query |
| Client state | Zustand |
| Design | Adminator Bootstrap CSS tokens — NOT jQuery |
| Data tables | React Table (TanStack Table) |
| Charts | Recharts |
| Markdown | react-markdown |

### Coding Conventions

- **TypeScript strict mode** everywhere. No `any` without a comment justification.
- **ESM modules** — `import`/`export`, never `require()`.
- **Path alias** `@/` maps to `src/` — use it everywhere.
- **Module structure:** Each module has `*.routes.ts` + `*.service.ts`. Queued modules add `*.queue.ts` + `*.worker.ts`.
- **Error handling:** Throw custom errors from `shared/errors.ts`. Never `throw new Error('string')` directly.
- **Env vars:** ALWAYS import from `@/config/env.ts`, never `process.env.X` directly.
- **Async/await** — no raw Promises. Use `try/catch` in routes; let errors bubble to Fastify error handler.
- **Database queries:** Use Drizzle. Always scope by `org_id` — see Multi-Tenancy section below.

---

## Multi-Tenancy (CRITICAL)

**Every database query that touches tenant data MUST include `org_id` in the WHERE clause.**

```typescript
// ✅ CORRECT — always scope by org
const apps = await db.select().from(applications)
  .where(and(eq(applications.orgId, orgId), eq(applications.userId, userId)));

// ❌ WRONG — missing tenant scope, data leakage risk
const apps = await db.select().from(applications);
```

**The `requireAuth` + `requireOrg` middleware chain populates `req.user` and `req.org`. Always use these — never trust user-supplied org IDs without verification.**

S3 objects must be scoped by org: `{orgId}/{category}/{filename}` — e.g., `org-123/pdfs/report-456.pdf`.

---

## Authentication Flow

```
Browser:    session cookie (Lucia Auth) → requireAuth middleware → req.user
API Client: Authorization: Bearer <api_key> → requireAuth middleware → req.user
```

API keys are stored as SHA-256 hashes. The raw key is shown once at creation, never stored in plaintext.

**Middleware chain:**
```typescript
fastify.addHook('preHandler', requireAuth);     // validates session or API key
fastify.addHook('preHandler', requireOrg);      // resolves org from membership
fastify.addHook('preHandler', requireRole('admin')); // optional RBAC
```

---

## Background Jobs (BullMQ)

**Pattern: route → enqueue → return taskId → poll status**

```typescript
// Route enqueues job
const task = await db.insert(ai_tasks).values({ status: 'pending', ...}).returning();
await evaluationQueue.add('evaluate', { taskId: task.id, orgId, userId, url });
return { taskId: task.id };

// Worker processes job
evaluationQueue.process(async (job) => {
  await db.update(ai_tasks).set({ status: 'processing' }).where(eq(ai_tasks.id, job.data.taskId));
  // ... do work
  await db.update(ai_tasks).set({ status: 'completed', output: result });
});

// Client polls
GET /api/v1/evaluations/:id/status → { status: 'completed', score: 4.2, reportUrl: '...' }
```

| Queue | Concurrency | Timeout | Retries |
|-------|-------------|---------|---------|
| `evaluation` | 3 | 120s | 2 (exponential) |
| `scan` | 10 | 30s | 1 |
| `pdf` | 1 (Playwright) | 60s | 1 |
| `liveness` | 1 (Playwright) | 20s | 1 |
| `analytics` | 5 | 30s | 0 |
| `import` | 3 | 60s | 1 |

**Playwright workers** (`pdf`, `liveness`) run at concurrency 1 — they are memory-heavy. Never increase without testing memory limits.

---

## AI Provider System

The `AIProvider` interface in `src/modules/ai/ai.provider.ts` is the ONLY way to call AI:

```typescript
interface AIProvider {
  name: string;
  evaluate(params: EvalParams): Promise<EvalResult>;
  generateText(params: TextParams): Promise<TextResult>;
  estimateCost(tokensIn: number, tokensOut: number): number;
}
```

**Current providers:**
- `ai.deepseek.ts` — Primary (Phase 1). OpenAI-compatible API.
- `ai.gemini.ts` — Fallback (Phase 1). Port of `../gemini-eval.mjs`.

**Every AI call MUST:**
1. Record to `ai_tasks` table (provider, model, tokens_in, tokens_out, cost_usd, latency_ms)
2. Increment `usage_records` for the org's current billing period
3. Check usage limits before calling (throw `UsageLimitError` if exceeded)

**Prompt Registry:** Mode files from `../modes/*.md` are stored in the `prompt_templates` DB table (versioned). Use `prompt.registry.ts` to resolve templates — never hardcode prompts.

---

## API Conventions

- **Prefix:** `/api/v1/`
- **Auth header:** `Authorization: Bearer <api_key>` or session cookie
- **Pagination:** `?cursor=<token>` (cursor-based) or `?page=<n>&limit=<n>` (offset)
- **Filtering:** Query params — e.g., `?status=applied&score_min=4.0`
- **Error shape:**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
  ```
- **Async responses:** Return `{ "taskId": "uuid" }`, client polls `GET .../status`
- **Success responses:** Return the created/updated resource directly (201 for creates, 200 for updates)

---

## Database Schema Reference

All tables are defined in `src/db/schema.ts`. Key relationships:

```
users ──N── memberships ──1── organizations
users ──1── profiles
users ──N── cvs
users ──N── applications ──N── evaluations
organizations ──N── portals ──N── scan_results
organizations ──N── ai_tasks
organizations ──N── usage_records
applications ──N── follow_ups
```

**UUID primary keys** on all tables. `org_id` foreign key on every tenant-scoped table.

**Key JSONB columns** (use typed helpers when reading/writing):
- `profiles.target_roles`, `profiles.compensation`, `profiles.narrative`, `profiles.archetypes`
- `applications.metadata`
- `evaluations.gaps`, `evaluations.scores`
- `organizations.settings`

---

## Porting CLI Logic

When porting functions from `../` (the original CLI scripts), follow this mapping:

| CLI Source | SaaS Destination | Notes |
|------------|-----------------|-------|
| `liveness-core.mjs` → `classifyLiveness()` | `shared/liveness-classifier.ts` | Zero-dep pure function — copy verbatim |
| `scan.mjs` → `detectApi()`, `buildTitleFilter()` | `modules/scanner/scanner.service.ts` | Port logic, swap HTTP client to fetch/axios |
| `merge-tracker.mjs` → `roleFuzzyMatch()`, `roleTokens()` | `shared/text-utils.ts` | Pure functions — copy verbatim |
| `generate-pdf.mjs` → `normalizeTextForATS()` | `shared/text-utils.ts` | Pure function — copy verbatim |
| `analyze-patterns.mjs` → analytics functions | `modules/analytics/analytics.service.ts` | Replace file parsing with DB queries |
| `gemini-eval.mjs` → prompt build + parse | `modules/ai/ai.deepseek.ts` | Follow same pattern: build → call → parse `---SCORE_SUMMARY---` block |
| `modes/_shared.md` + `modes/oferta.md` | `prompt_templates` DB table | Seeded in `db/seed.ts`, managed via prompt.registry.ts |

---

## Local Development

```bash
# Start infrastructure
docker compose up -d          # Postgres + Redis + MinIO

# Backend
npm install
npm run db:generate           # Generate migrations from schema
npm run db:migrate            # Apply migrations
npm run db:seed               # Seed dev data (optional)
npm run dev                   # API server on :3000 (tsx watch)
npm run worker                # Worker process (separate terminal)

# Frontend
cd frontend && npm install && npm run dev   # Vite dev server on :5173

# Tests
npm test                      # Vitest
npm run test:watch            # Watch mode
```

**Health check:** `GET http://localhost:3000/health` — pings Postgres, Redis, S3.

**MinIO console:** `http://localhost:9001` (minioadmin/minioadmin)

---

## Security Rules

1. **Never** query without `org_id` scope on tenant data
2. **Never** store API keys in plaintext — SHA-256 hash only
3. **Never** trust HTML input in PDF templates — sanitize before Playwright rendering
4. **Always** validate all endpoint inputs with Zod
5. **Always** write to `audit_logs` on mutations (use `audit.service.ts`)
6. **Rate limiting** is applied globally (100 req/min) and per-endpoint where needed
7. S3 object keys MUST be `{orgId}/{type}/{filename}` — never user-controlled paths
8. Signed S3 URLs expire in 1 hour for downloads

---

## Phase Status

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1 MVP** | Auth, profiles, CVs, evaluations, PDF, React dashboard, onboarding wizard | 🏗️ In Progress |
| Phase 2 | Scanner, analytics, batch, teams/RBAC, follow-ups | ⏳ Planned |
| Phase 3 | Multi-provider AI, SSO, webhooks, WebSocket real-time | ⏳ Planned |
| Phase 4 | API marketplace, white-label, SOC 2 | ⏳ Planned |

**MVP deliverable:** Register → login → onboarding wizard → submit JD URL → evaluation completes → view report → download PDF → see in applications table.

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `../SAAS_TRANSFORMATION_PLAN.md` | Full architecture, DB schema SQL, API map, roadmap |
| `../IMPLEMENTATION_PROMPTS.md` | Step-by-step implementation prompts (use in order) |
| `../gemini-eval.mjs` | Pattern for AI provider: prompt build → API call → parse output |
| `../liveness-core.mjs` | Pure function to port directly |
| `../scan.mjs` | ATS detection + portal fetch logic to port |
| `../modes/_shared.md` | Scoring system definition (Blocks A-G) — becomes prompt template |
| `../modes/oferta.md` | Full evaluation instructions — becomes eval prompt template |
| `../templates/states.yml` | Canonical application statuses — becomes DB enum |
| `../templates/cv-template.html` | Default HTML CV template — seed into `cv_templates` |

---

## Do Not

- ❌ Do NOT add user-specific data to prompt template defaults (those live in `profiles` table)
- ❌ Do NOT use `console.log` — use `import { logger } from '@/shared/logger'`
- ❌ Do NOT run Playwright in the API process — only in dedicated BullMQ workers
- ❌ Do NOT query tenant tables without `org_id` in WHERE clause
- ❌ Do NOT store secrets in code — always from `@/config/env.ts`
- ❌ Do NOT commit `.env` — only `.env.example`
- ❌ Do NOT increase `pdf` or `liveness` worker concurrency above 1 without profiling
