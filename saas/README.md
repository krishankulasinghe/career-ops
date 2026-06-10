# Career-Ops SaaS

Multi-tenant commercial SaaS platform built on top of the [career-ops](../) CLI tool.

## Stack

| Layer | Tech |
|-------|------|
| API | Fastify 4 + TypeScript (strict ESM) |
| ORM | Drizzle + PostgreSQL 16 |
| Queue | BullMQ + Redis 7 |
| Storage | S3-compatible (MinIO dev / AWS S3 prod) |
| Auth | Session cookies (Lucia-style) + API keys (SHA-256) |
| AI | DeepSeek primary, Gemini fallback |
| Frontend | React 18 + Vite + TanStack Query + Zustand |
| Testing | Vitest |

## Local Development

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### Start

```bash
# 1. Infrastructure
docker compose up -d

# 2. Backend
npm install
cp .env.example .env          # fill in values
npm run db:migrate
npm run db:seed               # optional demo data
npm run dev                   # API on :3000

# 3. Worker (separate terminal)
npm run worker

# 4. Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # UI on :5173
```

### Useful commands

```bash
npm run typecheck             # tsc --noEmit
npm test                      # vitest run
npm run db:studio             # Drizzle Studio UI
```

## Production

```bash
docker compose -f docker-compose.prod.yml up --build
```

The production stack runs:
- `app` — Fastify API on port 3000
- `worker` — BullMQ worker (Playwright for PDF/liveness)
- `frontend` — nginx serving the React SPA (proxies `/api/` to `app`)
- `postgres` — PostgreSQL 16
- `redis` — Redis 7

Configure via environment variables (see `.env.example`). Use AWS S3 or Cloudflare R2 for object storage in production.

## CI/CD

GitHub Actions (`.github/workflows/saas-ci.yml`) runs on every push/PR that touches `saas/`:

1. **Lint** — ESLint
2. **Typecheck** — `tsc --noEmit` (backend + frontend)
3. **Test** — Vitest
4. **Build** — backend TypeScript + Vite frontend
5. **Docker push** — builds and pushes images to GHCR on merge to `main`

## Architecture

```
Register → Login → Onboarding Wizard
                       ↓
              Paste JD URL / text
                       ↓
           POST /api/v1/evaluations
                       ↓
           BullMQ evaluation worker
           (fetch JD → AI score → store)
                       ↓
           Evaluation detail page
           (report tabs, radar chart, scores)
                       ↓
           PDF generated automatically
                       ↓
           Applications tracker updated
```

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user + org |
| POST | `/api/v1/auth/login` | Session login |
| GET | `/api/v1/auth/me` | Current user + org |
| GET | `/api/v1/applications` | List applications (paginated) |
| POST | `/api/v1/evaluations` | Queue new evaluation |
| GET | `/api/v1/evaluations/:id/status` | Poll eval status |
| GET | `/health` | Health check (DB + Redis + S3) |

Full API spec: run `npm run dev` and visit `http://localhost:3000/docs` (coming in Task 57).

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `g` | Go to Dashboard |
| `a` | Go to Applications |
| `e` | New Evaluation |
| `p` | Pipeline |
| `/` | Focus search |
| `Esc` | Close modal |

## Data Model

See [`src/db/schema.ts`](src/db/schema.ts) for full Drizzle schema.

Key tables: `users`, `organizations`, `memberships`, `profiles`, `cvs`, `applications`, `evaluations`, `ai_tasks`, `usage_records`, `audit_logs`, `pipeline_items`, `portals`.

## Multi-Tenancy

Every database query on tenant data is scoped by `org_id`. The `requireAuth` + `requireOrg` middleware chain populates `req.user` and `req.org` on every authenticated request.

## Security

- Passwords: bcrypt (12 rounds)
- API keys: SHA-256 hash stored, raw key shown once
- Sessions: signed cookie (Lucia-style)
- All inputs validated with Zod
- S3 keys scoped: `{orgId}/{type}/{filename}`
- Rate limiting: 100 req/min global

## Environment Variables

See [`.env.example`](.env.example) for the full list.
