# Career-Ops SaaS — Implementation Prompts

> **How to use:** Copy each prompt below and paste it into Claude Code (or your AI coding CLI) one at a time, in order. Wait for each to complete before running the next. Each prompt is self-contained with full context.

---

## Prompt 1: Project Scaffolding & Docker Setup

```
I'm building a SaaS platform from an existing CLI tool (career-ops). Read SAAS_TRANSFORMATION_PLAN.md for full context.

This is Step 1: Create the project scaffolding.

Create a new directory called `saas/` in the project root with:

1. **Package setup:**
   - `saas/package.json` — Node.js project with type: "module", TypeScript, these dependencies:
     - fastify, @fastify/cors, @fastify/cookie, @fastify/rate-limit, @fastify/static
     - drizzle-orm, postgres (pg driver)
     - bullmq, ioredis
     - @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
     - zod
     - bcrypt, nanoid
     - pino, pino-pretty
     - dotenv
   - Dev deps: typescript, tsx, drizzle-kit, vitest, @types/node, @types/bcrypt, eslint
   - Scripts: "dev", "build", "start", "db:generate", "db:migrate", "db:push", "db:studio", "worker", "test"

2. **TypeScript config:**
   - `saas/tsconfig.json` — target ES2022, module NodeNext, strict: true, outDir: dist, rootDir: src, paths alias @/* -> src/*

3. **Environment:**
   - `saas/.env.example` with all required vars:
     ```
     NODE_ENV=development
     PORT=3000
     DATABASE_URL=postgresql://career_ops:career_ops@localhost:5432/career_ops
     REDIS_URL=redis://localhost:6379
     S3_ENDPOINT=http://localhost:9000
     S3_ACCESS_KEY=minioadmin
     S3_SECRET_KEY=minioadmin
     S3_BUCKET=career-ops
     S3_REGION=us-east-1
     DEEPSEEK_API_KEY=your-deepseek-api-key
     SESSION_SECRET=change-this-to-random-64-char-string
     CORS_ORIGIN=http://localhost:5173
     ```
   - `saas/.env` — copy of .env.example with dev defaults filled in
   - Add `saas/.env` to `.gitignore`

4. **Docker Compose:**
   - `saas/docker-compose.yml` with services:
     - postgres:16-alpine (port 5432, volume for persistence, POSTGRES_DB=career_ops, POSTGRES_USER=career_ops, POSTGRES_PASSWORD=career_ops)
     - redis:7-alpine (port 6379)
     - minio (port 9000 API, 9001 console, MINIO_ROOT_USER=minioadmin, MINIO_ROOT_PASSWORD=minioadmin)
   - Named volumes for postgres data and minio data
   - Network: career-ops-network

5. **Config files:**
   - `saas/src/config/env.ts` — Zod schema validating all env vars, export validated `env` object
   - `saas/src/config/database.ts` — Drizzle connection using postgres (pg) driver, connection pool
   - `saas/src/config/redis.ts` — ioredis connection + BullMQ connection factory
   - `saas/src/config/s3.ts` — S3Client configured for MinIO in dev / AWS in prod

6. **Server entry point:**
   - `saas/src/server.ts` — Fastify app with:
     - CORS plugin (origin from env)
     - Cookie plugin
     - Rate limit plugin (100 req/min default)
     - Health check route: GET /health returns {status: "ok", timestamp, services: {db, redis, s3}}
     - Actually ping DB, Redis, and S3 in the health check
     - Graceful shutdown handling
     - Listen on PORT from env

7. **Worker entry point:**
   - `saas/src/workers/index.ts` — placeholder that imports Redis config and logs "Worker process started"

8. **Shared utilities:**
   - `saas/src/shared/errors.ts` — AppError class (statusCode, code, message), NotFoundError, ValidationError, UnauthorizedError, ForbiddenError
   - `saas/src/shared/logger.ts` — Pino logger instance configured from env (pretty in dev, JSON in prod)

After creating all files:
- Run `cd saas && npm install`
- Run `docker compose up -d` to start Postgres, Redis, MinIO
- Run `npm run dev` to verify the server starts and GET /health returns ok

Do NOT skip any step. Create every file listed above.
```

---

## Prompt 2: Database Schema (All Tables)

```
Read SAAS_TRANSFORMATION_PLAN.md section "5. Database Schema" for the full schema design.

Now create the complete Drizzle ORM schema in `saas/src/db/schema.ts`.

Create ALL of these tables using drizzle-orm/pg-core:

1. **users** — id (uuid, pk, default gen_random_uuid), email (varchar 255, unique, not null), password_hash (varchar 255), full_name (varchar 255, not null), avatar_url (text), role (varchar 20, default 'user'), email_verified_at (timestamp), created_at (timestamp, default now), updated_at (timestamp, default now)

2. **sessions** — id (varchar 255, pk), user_id (uuid, references users, cascade delete), expires_at (timestamp, not null)

3. **api_keys** — id (uuid pk), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), key_hash (varchar 255 not null), key_prefix (varchar 8 not null), name (varchar 100), scopes (text array), last_used_at (timestamp), expires_at (timestamp), created_at (timestamp default now)

4. **organizations** — id (uuid pk), name (varchar 255 not null), slug (varchar 100 unique not null), plan (varchar 50 default 'free'), stripe_customer_id (varchar 255), stripe_subscription_id (varchar 255), settings (jsonb default {}), max_members (int default 1), max_evaluations_mo (int default 20), max_scans_mo (int default 5), created_at, updated_at

5. **memberships** — id (uuid pk), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), role (varchar 20 default 'member'), joined_at (timestamp default now). Add unique constraint on (user_id, org_id)

6. **profiles** — id (uuid pk), user_id (uuid ref users cascade, unique), org_id (uuid ref organizations cascade), full_name (varchar 255), email_contact (varchar 255), phone (varchar 50), location (varchar 255), timezone (varchar 50), linkedin_url (text), portfolio_url (text), github_url (text), target_roles (jsonb), compensation (jsonb), narrative (jsonb), location_prefs (jsonb), archetypes (jsonb), writing_style (jsonb), cv_format (varchar 20 default 'html'), custom_config (jsonb default {}), created_at, updated_at

7. **cvs** — id (uuid pk), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), name (varchar 255 default 'default'), content_md (text not null), version (int default 1), is_primary (boolean default false), created_at, updated_at

8. **cv_templates** — id (uuid pk), org_id (uuid ref organizations, nullable), name (varchar 255 not null), content_html (text), content_tex (text), is_default (boolean default false), created_at

9. **applications** — id (uuid pk), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), seq_number (int not null), date (date not null), company (varchar 255 not null), role (varchar 255 not null), score (decimal 3,1), status (varchar 20 not null default 'evaluated'), has_pdf (boolean default false), pdf_url (text), notes (text), job_url (text), source (varchar 50), archetype (varchar 100), legitimacy (varchar 50), metadata (jsonb default {}), created_at, updated_at. Add unique constraint on (user_id, company, role). Add indexes on (user_id, status), (org_id), (score DESC)

10. **evaluations** — id (uuid pk), application_id (uuid ref applications cascade), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), report_number (int not null), report_content (text not null), jd_text (text), jd_snapshot_url (text), archetype (varchar 100), seniority (varchar 50), remote_policy (varchar 100), team_size (varchar 100), domain (varchar 100), comp_estimate (varchar 100), tl_dr (text), score_cv_match (decimal 3,1), score_north_star (decimal 3,1), score_comp (decimal 3,1), score_cultural (decimal 3,1), score_red_flags (decimal 3,1), score_global (decimal 3,1), legitimacy_tier (varchar 50), gaps (jsonb), ai_provider (varchar 50), ai_model (varchar 100), ai_tokens_in (int), ai_tokens_out (int), ai_cost_usd (decimal 10,6), ai_latency_ms (int), created_at

11. **portals** — id (uuid pk), org_id (uuid ref organizations cascade), name (varchar 255 not null), careers_url (text), api_type (varchar 20), api_url (text), enabled (boolean default true), metadata (jsonb default {}), created_at, updated_at

12. **scan_results** — id (uuid pk), org_id (uuid ref organizations cascade), portal_id (uuid ref portals set null), url (text not null), title (varchar 500 not null), company (varchar 255 not null), location (varchar 255), source (varchar 50), status (varchar 20 default 'added'), first_seen (date not null), processed_at (timestamp), created_at. Unique on (org_id, url)

13. **title_filters** — id (uuid pk), org_id (uuid ref organizations cascade), type (varchar 10 not null), keyword (varchar 255 not null)

14. **pipeline_items** — id (uuid pk), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), url (text not null), company (varchar 255), title (varchar 500), status (varchar 20 default 'pending'), source (varchar 50), added_at (timestamp default now), processed_at (timestamp)

15. **follow_ups** — id (uuid pk), application_id (uuid ref applications cascade), user_id (uuid ref users cascade), date (date not null), channel (varchar 50), contact_name (varchar 255), contact_email (varchar 255), notes (text), created_at

16. **ai_tasks** — id (uuid pk), org_id (uuid ref organizations cascade), user_id (uuid ref users), task_type (varchar 50 not null), status (varchar 20 default 'pending'), input (jsonb), output (jsonb), provider (varchar 50), model (varchar 100), tokens_in (int), tokens_out (int), cost_usd (decimal 10,6), latency_ms (int), error_msg (text), retry_count (int default 0), created_at, started_at (timestamp), completed_at (timestamp). Indexes on (org_id, status), (task_type)

17. **prompt_templates** — id (uuid pk), org_id (uuid, nullable), name (varchar 100 not null), version (int default 1), language (varchar 10 default 'en'), content (text not null), is_active (boolean default true), created_at, updated_at

18. **audit_logs** — id (uuid pk), org_id (uuid ref organizations cascade), user_id (uuid ref users set null), action (varchar 100 not null), entity_type (varchar 50), entity_id (uuid), metadata (jsonb default {}), ip_address (varchar 45), user_agent (text), created_at. Index on (org_id, created_at DESC)

19. **usage_records** — id (uuid pk), org_id (uuid ref organizations cascade), period (date not null), evaluations_count (int default 0), scans_count (int default 0), pdfs_count (int default 0), ai_tokens_total (bigint default 0), ai_cost_total (decimal 10,4 default 0), storage_bytes (bigint default 0). Unique on (org_id, period)

Export all tables AND their inferred types (InferSelectModel, InferInsertModel) for use in services.

Also update `saas/drizzle.config.ts` to point to the schema file and use DATABASE_URL from env.

After creating the schema, run:
- `cd saas && npx drizzle-kit generate` to generate migration SQL
- `npx drizzle-kit push` to apply to the database (make sure docker compose is running)

Verify by running `npx drizzle-kit studio` and checking all tables exist.
```

---

## Prompt 3: Auth Module (Register, Login, Sessions, API Keys)

```
Read SAAS_TRANSFORMATION_PLAN.md for context. The database schema is already created in saas/src/db/schema.ts.

Now build the authentication module. Create these files:

### 1. saas/src/modules/auth/auth.service.ts

Implement:
- `register(email, password, fullName)` — hash password with bcrypt (12 rounds), create user, create default organization (name: "{fullName}'s Workspace", slug from name), create membership (role: owner), create session, return {user, session, organization}
- `login(email, password)` — find user by email, verify password, create session, return {user, session}
- `logout(sessionId)` — delete session from DB
- `createSession(userId)` — generate session ID with nanoid(64), insert into sessions table with 30-day expiry, return session
- `validateSession(sessionId)` — find session, check not expired, return user+session or null. Delete if expired.
- `createApiKey(userId, orgId, name, scopes)` — generate key with nanoid(48), prefix "co_" + first 8 chars, hash full key with SHA-256, store hash+prefix+scopes, return the full key (only time it's shown)
- `validateApiKey(key)` — hash provided key, find by hash, check not expired, update last_used_at, return user+org+scopes
- `hashPassword(password)` — bcrypt hash
- `verifyPassword(password, hash)` — bcrypt compare

### 2. saas/src/modules/auth/auth.middleware.ts

Create Fastify preHandler hooks:
- `requireAuth` — checks for session cookie OR Authorization Bearer header. For cookie: validate session. For Bearer: validate API key. Attach user, org, and session/scopes to request. Return 401 if invalid.
- `requireRole(...roles)` — checks user.role is in the allowed roles list. Return 403 if not.
- `requireOrg` — checks that the user has a membership in the requested org (from params or body). Attach membership role. Return 403 if not a member.
- `requireOrgRole(...roles)` — checks membership role is in allowed list. Return 403 if not.

Extend Fastify request type declaration to include: user, org, membership, session, apiKeyScopes.

### 3. saas/src/modules/auth/auth.routes.ts

Create a Fastify plugin that registers these routes:

- `POST /api/v1/auth/register` — body: {email, password, fullName}. Validate with Zod (email format, password min 8 chars, fullName min 2 chars). Call register(). Set session cookie (httpOnly, secure in prod, sameSite lax, path /, 30 day maxAge). Return {user: {id, email, fullName, role}, organization: {id, name, slug}}.

- `POST /api/v1/auth/login` — body: {email, password}. Validate. Call login(). Set session cookie. Return {user, organization}.

- `POST /api/v1/auth/logout` — requireAuth. Delete session. Clear cookie. Return {ok: true}.

- `POST /api/v1/auth/api-keys` — requireAuth. Body: {name, scopes}. Call createApiKey(). Return {key (full, one-time), prefix, name, scopes, expiresAt}.

- `DELETE /api/v1/auth/api-keys/:id` — requireAuth. Verify key belongs to user. Delete. Return {ok: true}.

- `GET /api/v1/auth/me` — requireAuth. Return current user + org + membership role.

### 4. Register the auth routes

Update `saas/src/server.ts` to register the auth routes plugin under prefix (the routes already include /api/v1/auth).

### 5. Shared validation schemas

Create `saas/src/shared/validation.ts` with Zod schemas:
- emailSchema — z.string().email()
- passwordSchema — z.string().min(8).max(128)
- uuidSchema — z.string().uuid()
- paginationSchema — z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })

### 6. Pagination helper

Create `saas/src/shared/pagination.ts`:
- `paginate(query, page, limit)` — returns {data, meta: {page, limit, total, totalPages}}
- Works with Drizzle queries

After creating all files, test manually:
1. `cd saas && npm run dev`
2. Use curl or httpie to test:
   - POST /api/v1/auth/register with {"email":"test@test.com","password":"test1234","fullName":"Test User"}
   - POST /api/v1/auth/login
   - GET /api/v1/auth/me (with cookie)
   - POST /api/v1/auth/api-keys
   - GET /health to verify services are still up
```

---

## Prompt 4: Users, Organizations & Profiles Modules

```
Read SAAS_TRANSFORMATION_PLAN.md for context. Auth module is complete in saas/src/modules/auth/.

Now build the Users, Organizations, and Profiles modules.

### 1. saas/src/modules/users/users.service.ts

- `getUserById(id)` — returns user (without password_hash)
- `updateUser(id, data)` — update fullName, avatarUrl. Return updated user.
- `getUserOrganizations(userId)` — return all orgs the user is a member of, with their membership role

### 2. saas/src/modules/users/users.routes.ts

- `GET /api/v1/users/me` — requireAuth. Return user + profile + orgs
- `PUT /api/v1/users/me` — requireAuth. Body: {fullName?, avatarUrl?}. Update and return user.

### 3. saas/src/modules/organizations/orgs.service.ts

- `createOrg(userId, name)` — create org with auto-generated slug (lowercase, hyphenated), create membership (owner role). Return org.
- `getOrg(orgId)` — return org details
- `updateOrg(orgId, data)` — update name, settings. Return updated org.
- `getOrgMembers(orgId)` — return members with user info and membership role
- `inviteMember(orgId, email, role)` — check org member limits (from org.max_members). If user with email exists, create membership. If not, return a pending invite indicator (for now just check if user exists). Return membership or error.
- `removeMember(orgId, userId)` — delete membership. Cannot remove the last owner.
- `updateMemberRole(orgId, userId, newRole)` — update membership role. Cannot change last owner.

### 4. saas/src/modules/organizations/orgs.routes.ts

- `POST /api/v1/orgs` — requireAuth. Body: {name}. Create org, return it.
- `GET /api/v1/orgs/:orgId` — requireAuth, requireOrg. Return org details.
- `PUT /api/v1/orgs/:orgId` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Update org.
- `GET /api/v1/orgs/:orgId/members` — requireAuth, requireOrg. Return members list.
- `POST /api/v1/orgs/:orgId/invite` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {email, role}. Invite member.
- `DELETE /api/v1/orgs/:orgId/members/:userId` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Remove member.

### 5. saas/src/modules/profiles/profiles.service.ts

- `getProfile(userId)` — return profile or null
- `createProfile(userId, orgId, data)` — create profile with all fields from the profiles table. Return profile.
- `updateProfile(userId, data)` — update any profile field. Return updated profile.
- `getProfileWithCv(userId)` — return profile + primary CV joined

### 6. saas/src/modules/profiles/profiles.routes.ts

- `GET /api/v1/profiles/me` — requireAuth. Return profile.
- `PUT /api/v1/profiles/me` — requireAuth. Body: any profile fields (all optional). Upsert profile. Return updated.

### 7. Register all new routes in saas/src/server.ts

Register users, organizations, and profiles route plugins.

Test:
- Create user via register
- GET /api/v1/users/me — should return user
- PUT /api/v1/users/me — update fullName
- POST /api/v1/orgs — create second org
- GET /api/v1/orgs/{orgId}/members — see yourself as owner
- PUT /api/v1/profiles/me — set target_roles, compensation, narrative
- GET /api/v1/profiles/me — verify saved
```

---

## Prompt 5: CVs & Applications Modules

```
Read SAAS_TRANSFORMATION_PLAN.md for context. Auth, Users, Orgs, Profiles modules are complete.

Now build the CVs and Applications modules.

### 1. saas/src/modules/cvs/cvs.service.ts

- `listCvs(userId, orgId)` — return all CVs for user in org
- `getCv(id, userId)` — return CV by id (verify ownership)
- `createCv(userId, orgId, name, contentMd, isPrimary)` — if isPrimary, unset other primary CVs first. Create CV. Return it.
- `updateCv(id, userId, data)` — update name, content_md, is_primary. If setting primary, unset others. Increment version. Return updated.
- `deleteCv(id, userId)` — delete CV. Cannot delete if it's the only one.
- `getPrimaryCv(userId)` — return the CV where is_primary=true, or the first CV

### 2. saas/src/modules/cvs/cvs.routes.ts

- `GET /api/v1/cvs` — requireAuth. List user's CVs.
- `POST /api/v1/cvs` — requireAuth. Body: {name, contentMd, isPrimary?}. Create CV.
- `GET /api/v1/cvs/:id` — requireAuth. Get CV (verify ownership).
- `PUT /api/v1/cvs/:id` — requireAuth. Update CV.
- `DELETE /api/v1/cvs/:id` — requireAuth. Delete CV.

### 3. saas/src/modules/applications/applications.service.ts

- `listApplications(userId, orgId, filters)` — paginated. Filters: status, scoreMin, scoreMax, company, dateFrom, dateTo, source. Sort by: date, score, company (configurable). Return paginated results.
- `getApplication(id, userId)` — return single application with its evaluations
- `createApplication(userId, orgId, data)` — auto-increment seq_number (max existing + 1). Check unique constraint (user+company+role). Return created.
- `updateApplication(id, userId, data)` — update status, notes, score, has_pdf, pdf_url. Validate status is canonical (Evaluated, Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP). Return updated.
- `deleteApplication(id, userId)` — delete application and cascaded evaluations
- `importFromMarkdown(userId, orgId, markdownContent)` — parse the pipe-delimited applications.md format. For each row: extract #, Date, Company, Role, Score, Status, PDF emoji, Report link, Notes. Create application records. Handle duplicates (skip if company+role exists). Return {imported: N, skipped: N, errors: [...]}
- `getNextSeqNumber(userId)` — returns max(seq_number) + 1 or 1

Also create `saas/src/shared/status-validator.ts`:
- Export CANONICAL_STATUSES = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP']
- Export STATUS_ALIASES map (evaluada→Evaluated, aplicado→Applied, bewertet→Evaluated, etc. — read from templates/states.yml in the parent project for the full alias list)
- Export `validateStatus(status)` — returns canonical status or throws

### 4. saas/src/modules/applications/applications.routes.ts

- `GET /api/v1/applications` — requireAuth. Query params for filters + pagination. Return paginated list.
- `POST /api/v1/applications` — requireAuth. Body: {company, role, jobUrl?, score?, status?, notes?, source?}. Create application.
- `GET /api/v1/applications/:id` — requireAuth. Return application with evaluations.
- `PUT /api/v1/applications/:id` — requireAuth. Update fields.
- `DELETE /api/v1/applications/:id` — requireAuth. Delete.
- `POST /api/v1/applications/import` — requireAuth. Body: {markdown: string}. Import from applications.md format. Return counts.

### 5. Register routes in server.ts

Test:
- POST CV with markdown content
- GET CVs list
- POST application manually
- GET applications with filters (?status=Evaluated&scoreMin=4.0)
- POST /applications/import with sample applications.md content
- Verify dedup works (same company+role rejected)
```

---

## Prompt 6: AI Provider Abstraction & DeepSeek Integration

```
Read SAAS_TRANSFORMATION_PLAN.md section "7. AI System Design" for context.

Also read the existing `gemini-eval.mjs` in the project root to understand the current AI evaluation pattern — how it constructs prompts from mode files, calls the API, and parses structured output.

Also read `modes/_shared.md` and `modes/oferta.md` to understand the evaluation scoring system (Blocks A-G).

Now build the AI provider abstraction layer.

### 1. saas/src/modules/ai/ai.provider.ts

Define TypeScript interfaces:
```typescript
export interface EvalParams {
  systemPrompt: string;
  cvContent: string;
  jdContent: string;
  profileContext: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface EvalResult {
  reportMarkdown: string;
  structured: {
    company: string;
    role: string;
    score: number;
    archetype: string;
    legitimacy: string;
    scores: Record<string, number>;
    gaps: Array<{description: string; severity: string; mitigation: string}>;
    tldr: string;
    seniority: string;
    remotePolicy: string;
    compEstimate: string;
  };
  usage: {
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    latencyMs: number;
  };
}

export interface TextParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TextResult {
  text: string;
  usage: { tokensIn: number; tokensOut: number; costUsd: number; latencyMs: number; };
}

export interface AIProvider {
  name: string;
  evaluate(params: EvalParams): Promise<EvalResult>;
  generateText(params: TextParams): Promise<TextResult>;
  estimateCost(tokensIn: number, tokensOut: number): number;
}
```

### 2. saas/src/modules/ai/ai.deepseek.ts

Implement DeepSeekProvider class:
- DeepSeek uses the OpenAI-compatible API (https://api.deepseek.com/v1)
- Use native fetch (no SDK needed) to call POST /chat/completions
- Model: "deepseek-chat" (or configurable)
- `evaluate()`:
  1. Build messages array: [{role: "system", content: systemPrompt}, {role: "user", content: `JD:\n${jdContent}\n\nCV:\n${cvContent}\n\nProfile:\n${profileContext}`}]
  2. Call DeepSeek API with temperature 0.3, max_tokens 8000
  3. Parse response: extract markdown report from content
  4. Parse structured data: look for score pattern (X.X/5), archetype, legitimacy tier, gaps table
  5. Track tokens from response.usage
  6. Calculate cost (DeepSeek pricing: ~$0.14/M input, ~$0.28/M output for deepseek-chat)
  7. Return EvalResult

- `generateText()`:
  1. Simple chat completion call
  2. Return TextResult with usage

- `estimateCost()`: return calculated USD based on token counts

Include error handling: retry on 429/500 with exponential backoff (1s, 3s), max 2 retries. Timeout after 120s.

### 3. saas/src/modules/ai/ai.router.ts

- `getProvider(providerName?)` — returns configured AIProvider instance. Default: DeepSeek. Future: switch based on org settings.
- Cache provider instances (singleton per provider type)

### 4. saas/src/modules/ai/ai.cost-tracker.ts

- `trackUsage(orgId, taskType, provider, model, tokensIn, tokensOut, costUsd, latencyMs)` — insert into ai_tasks table AND increment usage_records for current period
- `getUsage(orgId, period?)` — return usage_records for org
- `checkLimits(orgId, taskType)` — check if org has exceeded their plan limits (evaluations_count < max_evaluations_mo). Return {allowed: boolean, current: number, limit: number}

### 5. saas/src/modules/ai/prompt.registry.ts

- `getPromptTemplate(name, language?, orgId?)` — look up prompt_templates table. Priority: org-specific > system default. Return template content.
- `buildEvalPrompt(profile, language?)` — combine _shared template + oferta template into a complete system prompt. Replace any profile-specific placeholders.
- `seedDefaultTemplates()` — read modes/_shared.md and modes/oferta.md from the parent project root, insert as system prompt_templates (org_id=null) if not already present. This is called on server startup.

### 6. Update saas/src/config/ai.ts

Export AI configuration: default provider name, model, API keys from env.

Test:
- Start server
- Verify prompt templates are seeded from modes/ files
- Manually call DeepSeek API with a test prompt to verify connectivity (add a temporary test route or use the REPL)
```

---

## Prompt 7: Evaluation Module (Queue + Worker + Routes)

```
Read SAAS_TRANSFORMATION_PLAN.md. AI provider is ready in saas/src/modules/ai/.

Now build the evaluation module — the core feature. When a user submits a job URL or JD text, it:
1. Creates an ai_task (status: pending)
2. Enqueues a BullMQ job
3. Worker picks it up, calls DeepSeek, parses results
4. Saves evaluation report + creates/updates application
5. User polls for status

### 1. saas/src/modules/evaluations/evaluations.service.ts

- `submitEvaluation(userId, orgId, input: {url?: string, jdText?: string})` — 
  1. Check usage limits via ai.cost-tracker.checkLimits(orgId, 'evaluation')
  2. Create ai_task record (status: pending, task_type: 'evaluation', input: {url, jdText})
  3. Enqueue to 'evaluation' BullMQ queue with {taskId, userId, orgId, url, jdText}
  4. Return {taskId, status: 'pending'}

- `getEvaluation(id, userId)` — return evaluation with application info
- `getEvaluationStatus(taskId)` — return ai_task status + output (if completed)
- `listEvaluations(userId, orgId, pagination)` — paginated list of evaluations with application info
- `getNextReportNumber(orgId)` — max(report_number) + 1 or 1

### 2. saas/src/modules/evaluations/evaluations.queue.ts

- Create BullMQ Queue named 'evaluation'
- Export `enqueueEvaluation(data)` function

### 3. saas/src/modules/evaluations/evaluations.worker.ts

Create BullMQ Worker for 'evaluation' queue:

The worker job handler should:
1. Update ai_task status to 'processing', set started_at
2. Get JD content:
   - If url provided: use fetch() to GET the URL and extract text (simple HTML-to-text stripping — remove tags, decode entities). If fetch fails, store error and fail the task.
   - If jdText provided: use directly
3. Load user's primary CV from DB (cvs table, is_primary=true)
4. Load user's profile from DB
5. Load prompt templates via prompt.registry.buildEvalPrompt()
6. Build profileContext string from profile (target roles, compensation, narrative, archetypes)
7. Call aiProvider.evaluate({systemPrompt, cvContent, jdContent, profileContext})
8. Parse the result:
   - Extract company name and role from the report (or from the JD)
   - Use the structured data from EvalResult
9. Create or update application record:
   - Get next seq_number
   - Insert with score, status='evaluated', archetype, legitimacy
   - ON CONFLICT (user_id, company, role): update score if higher, update report link
10. Create evaluation record with all structured data + full report markdown
11. Update ai_task: status='completed', output={evaluationId, applicationId, score, company, role}, completed_at, tokens, cost, latency
12. Increment usage_records via cost-tracker

Error handling:
- Catch all errors, update ai_task status='failed', error_msg=error.message
- BullMQ will retry based on queue config (2 retries, exponential backoff)

### 4. saas/src/modules/evaluations/evaluations.routes.ts

- `POST /api/v1/evaluations` — requireAuth. Body: {url?: string, jdText?: string} (at least one required). Submit for evaluation. Return {taskId, status}.
- `GET /api/v1/evaluations/:id` — requireAuth. Return full evaluation with report.
- `GET /api/v1/evaluations/:id/status` — requireAuth. Return task status (pending/processing/completed/failed) + output if completed.
- `GET /api/v1/evaluations` — requireAuth. Paginated list of evaluations.

### 5. Register the evaluation worker in saas/src/workers/index.ts

Import and start the evaluation worker. Log when jobs are processed.

### 6. Register evaluation routes in server.ts

### 7. Test the full flow

After building:
1. Make sure docker compose is running (Postgres, Redis)
2. Start API server: `npm run dev`
3. Start worker: `npm run worker` (in separate terminal)
4. Register a user (if not already done)
5. Create a CV (POST /api/v1/cvs with some markdown CV content)
6. Submit an evaluation:
   ```
   POST /api/v1/evaluations
   {"jdText": "We are looking for a Senior Software Engineer with 5+ years experience in TypeScript, Node.js, React. Experience with PostgreSQL and Redis required. Remote-first company, competitive salary $150K-200K."}
   ```
7. Poll status: GET /api/v1/evaluations/{taskId}/status
8. When completed, GET /api/v1/evaluations/{evaluationId} to see the full report
9. GET /api/v1/applications to see the auto-created application entry

This is the most critical feature — make sure the entire flow works end to end.
```

---

## Prompt 8: PDF Generation Module

```
Read SAAS_TRANSFORMATION_PLAN.md. Evaluations are working.

Now build PDF generation. Read the existing `generate-pdf.mjs` in the project root to understand the current implementation — especially the `normalizeTextForATS()` function and the Playwright PDF generation logic.

Also read `templates/cv-template.html` to understand the HTML CV template structure and placeholders.

### 1. saas/src/shared/text-utils.ts

Port these pure functions from the existing codebase:

- `normalizeTextForATS(html)` — from generate-pdf.mjs. Converts smart quotes to ASCII, em-dashes to hyphens, removes zero-width characters. Copy the logic exactly.

### 2. saas/src/modules/pdf/pdf.service.ts

- `requestPdfGeneration(userId, orgId, applicationId, evaluationId)` —
  1. Check that application and evaluation exist and belong to user
  2. Create ai_task (task_type: 'pdf', status: pending)
  3. Enqueue to 'pdf' BullMQ queue
  4. Return {taskId, status: 'pending'}

- `getPdfStatus(taskId)` — return ai_task status
- `getPdfDownloadUrl(applicationId, userId)` — get the pdf_url from application, generate S3 presigned GET URL (1 hour expiry), return URL

### 3. saas/src/modules/pdf/pdf.queue.ts

Create BullMQ Queue named 'pdf' with concurrency 1.

### 4. saas/src/modules/pdf/pdf.worker.ts

Worker handler:
1. Load evaluation report from DB
2. Load user's primary CV
3. Load user's profile (name, contact info)
4. Load CV template from cv_templates (default system template — seed from templates/cv-template.html)
5. Fill template placeholders:
   - {{NAME}} → profile.full_name
   - {{EMAIL}} → profile.email_contact
   - {{PHONE}} → profile.phone
   - {{LINKEDIN}} → profile.linkedin_url
   - {{LOCATION}} → profile.location
   - {{SUMMARY_TEXT}} → generated summary from evaluation (Block E personalization)
   - For other sections, use CV content parsed from markdown
6. Apply normalizeTextForATS() to the filled HTML
7. Resolve font paths (check if fonts/ directory exists in project root, use them)
8. Launch Playwright Chromium (headless)
9. Set HTML content, wait for fonts
10. Generate PDF with margins (0.6in), format from profile.cv_format or 'letter'
11. Upload PDF buffer to S3: key = `{orgId}/pdfs/cv-{company}-{date}.pdf`
12. Update application: has_pdf=true, pdf_url=S3 key
13. Update ai_task: completed, output={pdfUrl}

### 5. saas/src/modules/pdf/pdf.routes.ts

- `POST /api/v1/pdf/generate` — requireAuth. Body: {applicationId, evaluationId}. Enqueue PDF generation. Return {taskId}.
- `GET /api/v1/pdf/:applicationId` — requireAuth. Return presigned download URL.
- `GET /api/v1/pdf/:taskId/status` — requireAuth. Return generation status.

### 6. Seed default CV template

In the prompt.registry seedDefaultTemplates() function (or create a separate seed function), also read templates/cv-template.html from the parent project and insert it as a default cv_template row (org_id=null, is_default=true).

### 7. Register worker in workers/index.ts, routes in server.ts

### 8. Install Playwright

Add to package.json: playwright (already should be there)
Run: npx playwright install chromium

Test:
1. After a successful evaluation, POST /api/v1/pdf/generate with the applicationId and evaluationId
2. Poll status
3. When done, GET /api/v1/pdf/{applicationId} to get download URL
4. Download and verify the PDF
```

---

## Prompt 9: Pipeline Module

```
Read SAAS_TRANSFORMATION_PLAN.md. Evaluations and PDF generation are working.

Build the Pipeline module — the URL inbox where users add job URLs to evaluate later.

### 1. saas/src/modules/pipeline/pipeline.service.ts

- `listItems(userId, orgId, filters?)` — paginated. Filter by status (pending/processing/processed/failed). Sort by added_at DESC.
- `addItems(userId, orgId, items: Array<{url, company?, title?}>)` — bulk add. Dedup against existing items (same url in same org). Return {added: N, duplicates: N}.
- `addFromText(userId, orgId, text)` — parse text that contains URLs (one per line, optionally with "| Company | Title" after). Extract URLs, call addItems().
- `updateItem(id, userId, data)` — update status, company, title
- `deleteItem(id, userId)` — delete single item
- `processItem(id, userId, orgId)` — change status to 'processing', submit evaluation via evaluations.service.submitEvaluation({url}), update status to 'processed' when done (or 'failed' on error). Return evaluation taskId.
- `processAll(userId, orgId)` — get all 'pending' items, process each one. Return array of taskIds.

### 2. saas/src/modules/pipeline/pipeline.routes.ts

- `GET /api/v1/pipeline` — requireAuth. Query: ?status=pending&page=1&limit=20. Return paginated items.
- `POST /api/v1/pipeline` — requireAuth. Body: {urls: [{url, company?, title?}]} OR {text: "url1\nurl2\nurl3"}. Add items. Return counts.
- `PUT /api/v1/pipeline/:id` — requireAuth. Update item.
- `DELETE /api/v1/pipeline/:id` — requireAuth. Delete item.
- `POST /api/v1/pipeline/:id/process` — requireAuth. Process single item. Return {taskId}.
- `POST /api/v1/pipeline/process-all` — requireAuth. Process all pending. Return {taskIds: [...]}.

### 3. Register routes in server.ts

Test:
- POST /api/v1/pipeline with {text: "https://example.com/job1\nhttps://example.com/job2 | Acme | Senior Dev"}
- GET /api/v1/pipeline — see 2 pending items
- POST /api/v1/pipeline/{id}/process — process one item
- Verify evaluation is created
```

---

## Prompt 10: Audit Log & Usage Tracking

```
Read SAAS_TRANSFORMATION_PLAN.md. Core features are working.

Build the audit log and usage tracking systems that wrap around all existing modules.

### 1. saas/src/modules/audit/audit.service.ts

- `log(orgId, userId, action, entityType?, entityId?, metadata?, ipAddress?, userAgent?)` — insert into audit_logs. Fire and forget (don't await, don't block the request).
- `getAuditLog(orgId, filters?)` — paginated. Filter by action, entity_type, user_id, dateFrom, dateTo. Sort by created_at DESC.
- Pre-defined action constants:
  - 'user.registered', 'user.login', 'user.logout'
  - 'application.created', 'application.updated', 'application.deleted', 'application.imported'
  - 'evaluation.submitted', 'evaluation.completed', 'evaluation.failed'
  - 'pdf.generated'
  - 'pipeline.added', 'pipeline.processed'
  - 'org.created', 'org.member_invited', 'org.member_removed'
  - 'api_key.created', 'api_key.revoked'

### 2. Add audit logging to existing modules

Go through each existing module and add audit.log() calls:
- auth.service.ts: log register, login, logout, api key create/delete
- applications.service.ts: log create, update, delete, import
- evaluations.service.ts: log submit, complete (in worker)
- pdf worker: log generation complete
- pipeline.service.ts: log add, process
- orgs.service.ts: log create, invite, remove member

### 3. saas/src/modules/audit/audit.routes.ts

- `GET /api/v1/audit` — requireAuth, requireOrgRole('owner', 'admin'). Paginated audit log. Query: ?action=evaluation.completed&dateFrom=2026-01-01&limit=50

### 4. Usage tracking middleware

Create `saas/src/shared/usage.middleware.ts`:
- A Fastify onResponse hook that tracks API usage (optional, for future rate limiting refinement)

### 5. Update usage tracking in evaluation and PDF workers

Make sure the workers are calling `ai.cost-tracker.trackUsage()` after every AI task completes. This should already be in the worker code — verify it works and the usage_records table gets incremented.

### 6. saas/src/modules/admin/admin.routes.ts

- `GET /api/v1/admin/stats` — requireAuth, requireRole('admin', 'superadmin'). Return platform-wide stats: total users, total orgs, total evaluations, total AI cost, evaluations today.
- `GET /api/v1/admin/ai/usage` — requireAuth, requireRole('admin', 'superadmin'). Return AI usage breakdown by provider, model, org. Aggregate from ai_tasks table.

### 7. Register routes in server.ts

Test:
- Perform several actions (register, create app, submit eval)
- GET /api/v1/audit — verify all actions logged with timestamps
- GET /api/v1/admin/stats — verify platform stats
```

---

## Prompt 11: React Frontend — Project Setup & Layout

```
Read SAAS_TRANSFORMATION_PLAN.md section "9. Frontend & Dashboard Design".

Now create the React SPA frontend.

### 1. Create frontend project

```bash
cd saas
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom @tanstack/react-query zustand axios react-markdown remark-gfm recharts
npm install -D @types/react @types/react-dom tailwindcss @tailwindcss/vite
```

Wait — actually, we're using Adminator's Bootstrap design system, not Tailwind. Let me adjust:

```bash
cd saas
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom @tanstack/react-query zustand axios react-markdown remark-gfm recharts bootstrap
npm install -D @types/react @types/react-dom
```

### 2. Configure Vite proxy

Update `frontend/vite.config.ts`:
- Proxy /api/* to http://localhost:3000 (the Fastify backend)
- Port 5173

### 3. Design tokens

Create `frontend/src/styles/globals.css`:
- Import Bootstrap CSS
- Add CSS custom properties inspired by Adminator's color scheme:
  - --primary: #1d8cf8 (blue)
  - --success: #00f2c3 (teal)
  - --danger: #fd5d93 (pink)
  - --warning: #ff8d72 (orange)
  - --info: #1d8cf8
  - --dark: #1e1e2f (sidebar dark)
  - --sidebar-bg: #1e1e2f
  - --sidebar-text: #9a9abf
  - --card-bg: #ffffff
  - --body-bg: #f5f6fa
- Dashboard-style font: Inter or system font stack

### 4. Auth store

Create `frontend/src/stores/auth.store.ts` (Zustand):
- State: user (null or {id, email, fullName, role}), org (null or {id, name, slug, plan}), isAuthenticated: boolean
- Actions: setUser, setOrg, logout, initialize (call GET /api/v1/auth/me to check session)

### 5. API client

Create `frontend/src/api/client.ts`:
- Axios instance with baseURL '' (proxy handles it)
- withCredentials: true (for cookies)
- Response interceptor: if 401, redirect to /login

### 6. Auth API hooks

Create `frontend/src/api/auth.ts`:
- `useLogin()` — TanStack mutation, POST /api/v1/auth/login
- `useRegister()` — TanStack mutation, POST /api/v1/auth/register
- `useLogout()` — TanStack mutation, POST /api/v1/auth/logout
- `useMe()` — TanStack query, GET /api/v1/auth/me

### 7. Layout components

Create `frontend/src/components/layout/Sidebar.tsx`:
- Dark sidebar (Adminator-style) with nav items:
  - Dashboard (icon: grid)
  - Applications (icon: briefcase)
  - New Evaluation (icon: plus-circle)
  - Pipeline (icon: inbox)
  - Templates (icon: file-text)
  - Analytics (icon: bar-chart) — disabled/coming soon badge
  - Scanner (icon: search) — disabled/coming soon badge
- Bottom section: Settings, Profile
- Collapsible on mobile
- Active state highlighting based on current route

Create `frontend/src/components/layout/Header.tsx`:
- Top bar with:
  - Page title (dynamic based on route)
  - User avatar + name dropdown (Profile, Settings, Logout)
  - Org name display

Create `frontend/src/components/layout/Layout.tsx`:
- Wraps Sidebar + Header + main content area (children)
- Uses react-router-dom Outlet for page content

### 8. Auth pages

Create `frontend/src/pages/Login.tsx`:
- Clean login form: email, password, submit button
- Link to register
- Calls useLogin(), on success navigates to /dashboard

Create `frontend/src/pages/Register.tsx`:
- Registration form: fullName, email, password, confirm password
- Calls useRegister(), on success navigates to /dashboard

### 9. Router setup

Create `frontend/src/App.tsx`:
- React Router with routes:
  - /login → Login (public)
  - /register → Register (public)
  - / → Layout wrapper (protected, redirect to /login if not authenticated)
    - /dashboard → Dashboard (placeholder "Dashboard coming soon")
    - /applications → Applications (placeholder)
    - /evaluations/new → NewEvaluation (placeholder)
    - /evaluations/:id → EvaluationDetail (placeholder)
    - /pipeline → Pipeline (placeholder)
    - /templates → Templates (placeholder)
    - /profile → Profile (placeholder)
    - /settings → Settings (placeholder)

### 10. Protected route wrapper

Create a ProtectedRoute component that:
- Calls useMe() on mount
- If loading, show spinner
- If not authenticated, redirect to /login
- If authenticated, render children

### 11. Update frontend/src/main.tsx

- Wrap with QueryClientProvider and BrowserRouter
- Import globals.css

Test:
- `cd saas/frontend && npm run dev`
- Navigate to http://localhost:5173
- Should see login page
- Register a new user
- Should redirect to dashboard
- Sidebar should be visible with nav items
- Clicking nav items changes the page (placeholder content)
- Logout should redirect to login
```

---

## Prompt 12: React Frontend — Dashboard & Applications Pages

```
The React frontend is scaffolded with auth, layout, and routing working.

Now build the main dashboard and applications pages.

### 1. Shared components

Create `frontend/src/components/shared/KPICard.tsx`:
- Props: title (string), value (string|number), icon (string), trend? (up/down/neutral), trendValue? (string)
- Renders a Bootstrap card with large value, small title, optional trend indicator
- Style: white card, subtle shadow, colored icon

Create `frontend/src/components/shared/StatusBadge.tsx`:
- Props: status (string)
- Color mapping: Evaluated→blue, Applied→info, Responded→warning, Interview→purple, Offer→success, Rejected→danger, Discarded→secondary, SKIP→light
- Renders Bootstrap badge

Create `frontend/src/components/shared/ScoreGauge.tsx`:
- Props: score (number, 0-5)
- Color: <3.5 red, 3.5-3.9 orange, 4.0-4.4 blue, 4.5+ green
- Renders score as "4.2/5" with colored background pill

Create `frontend/src/components/shared/DataTable.tsx`:
- Generic reusable table component
- Props: columns (array of {key, label, render?}), data, loading, onSort?, sortBy?, sortDir?
- Renders Bootstrap table with sortable column headers (click to sort)
- Loading skeleton state
- Empty state message

Create `frontend/src/components/shared/Pagination.tsx`:
- Props: page, totalPages, onPageChange
- Bootstrap pagination component

Create `frontend/src/components/shared/LoadingSpinner.tsx`:
- Centered Bootstrap spinner

Create `frontend/src/components/shared/EmptyState.tsx`:
- Props: title, description, actionLabel?, onAction?
- Centered message with optional CTA button

### 2. Applications API hooks

Create `frontend/src/api/applications.ts`:
- `useApplications(filters)` — GET /api/v1/applications with query params
- `useApplication(id)` — GET /api/v1/applications/:id
- `useCreateApplication()` — POST mutation
- `useUpdateApplication()` — PUT mutation
- `useDeleteApplication()` — DELETE mutation
- `useImportApplications()` — POST /api/v1/applications/import mutation

### 3. Dashboard page

Update `frontend/src/pages/Dashboard.tsx`:
- Top row: 4 KPI cards
  - Total Applications (count from applications API)
  - Average Score (calculated)
  - Applied (count with status=Applied)
  - Interviews (count with status=Interview)
- Middle row: Recent Applications table (last 10, columns: #, Date, Company, Role, Score, Status)
  - Each row links to /evaluations/{evaluationId}
- Bottom row: placeholder cards for "Analytics" and "Scanner" (coming soon)

### 4. Applications page

Update `frontend/src/pages/Applications.tsx`:
- Filter bar at top:
  - Status dropdown (All, Evaluated, Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP)
  - Score range (min/max inputs)
  - Search by company name (text input)
  - "Import" button (opens modal)
- DataTable with columns:
  - # (seq_number)
  - Date
  - Company
  - Role
  - Score (ScoreGauge component)
  - Status (StatusBadge component)
  - PDF (✅/❌ icon, clickable to download if available)
  - Actions (view evaluation, edit status dropdown)
- Pagination at bottom
- Click row → navigate to /evaluations/{id}

### 5. Import modal

Create a modal component for the "Import" button:
- Large textarea: "Paste your applications.md content here"
- Preview section showing parsed rows count
- Import button that calls useImportApplications()
- Shows result: "Imported X, Skipped Y duplicates"

### 6. Dashboard API hooks

Create `frontend/src/api/analytics.ts` (basic for now):
- `useDashboardStats()` — calls GET /api/v1/applications with no pagination to get counts, or create a dedicated stats endpoint

Test:
- Navigate to /dashboard — see KPI cards (may show 0s if no data)
- Navigate to /applications — see table
- Create some applications via the API or import
- Filter by status — table updates
- Sort by score — works
- Click a row — navigates to evaluation detail (placeholder for now)
```

---

## Prompt 13: React Frontend — Evaluation Pages

```
Dashboard and Applications pages are working.

Now build the evaluation submission and detail pages.

### 1. Evaluation API hooks

Create `frontend/src/api/evaluations.ts`:
- `useEvaluations(pagination)` — GET /api/v1/evaluations
- `useEvaluation(id)` — GET /api/v1/evaluations/:id
- `useEvaluationStatus(taskId)` — GET /api/v1/evaluations/:id/status, with refetchInterval: 2000 (poll every 2s while status is pending/processing)
- `useSubmitEvaluation()` — POST /api/v1/evaluations mutation

### 2. New Evaluation page

Update `frontend/src/pages/NewEvaluation.tsx`:
- Two input options (tabs):
  - **URL tab**: URL input field + "Evaluate" button
  - **Text tab**: Large textarea for pasting JD text + "Evaluate" button
- On submit:
  1. Call useSubmitEvaluation()
  2. Show progress state with animated spinner and status text:
     - "Queued..." → "Analyzing job description..." → "Generating report..." → "Complete!"
  3. Poll useEvaluationStatus(taskId) every 2 seconds
  4. When completed: show summary card (company, role, score, archetype) + "View Full Report" button
  5. If failed: show error message with retry button

### 3. Evaluation Detail page

Update `frontend/src/pages/EvaluationDetail.tsx`:
- Header section:
  - Company name + Role title (large)
  - Score gauge (ScoreGauge component, prominent)
  - Status badge
  - Archetype badge
  - Legitimacy tier badge (color-coded: High Confidence=green, Proceed with Caution=yellow, Suspicious=red)
  - Date
  - "Download PDF" button (if has_pdf, calls PDF download endpoint)
  - "Generate PDF" button (if no PDF yet)
  - Back button → /applications

- Metadata cards row:
  - Seniority level
  - Remote policy
  - Comp estimate
  - Team size

- Block scores mini-chart:
  - Bar chart or radar chart showing individual block scores (CV Match, North Star, Comp, Cultural, Red Flags)
  - Use Recharts

- Full report:
  - Render evaluation.report_content as markdown using react-markdown with remark-gfm
  - Style the markdown nicely (headers, tables, lists, code blocks)
  - Sections should be collapsible (Block A, B, C, D, E, F, G)

- Gaps table (if gaps exist):
  - Table with columns: Gap Description, Severity, Mitigation Strategy

- AI metadata footer:
  - Provider, model, tokens (in/out), cost, latency
  - Small muted text

### 4. PDF API hooks

Create `frontend/src/api/pdf.ts`:
- `useGeneratePdf()` — POST /api/v1/pdf/generate mutation
- `usePdfStatus(taskId)` — GET /api/v1/pdf/:taskId/status, poll while pending
- `usePdfDownload(applicationId)` — GET /api/v1/pdf/:applicationId, returns download URL

### 5. MarkdownRenderer component

Create `frontend/src/components/shared/MarkdownRenderer.tsx`:
- Uses react-markdown with remark-gfm
- Custom renderers for:
  - Tables → Bootstrap table styling
  - Headers → proper sizing with margin
  - Code blocks → syntax highlighted background
  - Links → open in new tab
  - Lists → proper spacing

Test:
1. Navigate to /evaluations/new
2. Paste a job description text
3. Click Evaluate
4. Watch the progress indicator poll
5. When done, click "View Full Report"
6. Verify the markdown report renders nicely
7. Check block scores chart
8. Click "Generate PDF" if available
9. Download and verify PDF
```

---

## Prompt 14: React Frontend — Profile, Pipeline & Settings Pages

```
Core pages are working (Dashboard, Applications, Evaluations).

Now build the remaining pages: Profile, Pipeline, Settings.

### 1. Profile page

Update `frontend/src/pages/Profile.tsx`:

Two sections in tabs:

**Tab 1: CV Editor**
- Textarea with the user's CV markdown (from primary CV)
- Live preview panel beside it (MarkdownRenderer) — split screen on desktop
- "Save" button to update CV
- "Upload New CV" button to create a new CV version
- CV version history list (small, showing version numbers and dates)

**Tab 2: Profile Settings**
- Form fields (all from the profile table):
  - Full Name, Email, Phone, Location, Timezone
  - LinkedIn URL, Portfolio URL, GitHub URL
  - Target Roles — dynamic list (add/remove items, each with: name, level, fit dropdown)
  - Compensation — target range (text), currency dropdown, minimum (number)
  - Narrative — headline (text), exit story (textarea), superpowers (tag input)
  - Location Preferences — onsite availability dropdown (remote/hybrid/onsite/flexible)
  - CV Format — radio: HTML or LaTeX
- "Save Profile" button

### 2. Profile API hooks

Create `frontend/src/api/profile.ts`:
- `useProfile()` — GET /api/v1/profiles/me
- `useUpdateProfile()` — PUT /api/v1/profiles/me mutation

Update `frontend/src/api/cvs.ts`:
- `useCvs()` — GET /api/v1/cvs
- `useCv(id)` — GET /api/v1/cvs/:id
- `useCreateCv()` — POST mutation
- `useUpdateCv()` — PUT mutation
- `useDeleteCv()` — DELETE mutation

### 3. Pipeline page

Update `frontend/src/pages/Pipeline.tsx`:
- Add URLs section at top:
  - Textarea: "Paste job URLs (one per line, optionally: URL | Company | Title)"
  - "Add to Pipeline" button
  - Shows count after adding
- Pipeline table:
  - Columns: URL (truncated, clickable), Company, Title, Status (StatusBadge), Added Date, Actions
  - Status filter tabs: All | Pending | Processing | Processed | Failed
  - Actions per row: Process (play icon), Delete (trash icon)
- Bulk actions bar:
  - "Process All Pending" button (with count badge)
- When processing starts, status updates to "processing" and polls

### 4. Pipeline API hooks

Create `frontend/src/api/pipeline.ts`:
- `usePipelineItems(filters)` — GET /api/v1/pipeline
- `useAddPipelineItems()` — POST mutation
- `useProcessPipelineItem()` — POST /api/v1/pipeline/:id/process mutation
- `useProcessAllPipeline()` — POST /api/v1/pipeline/process-all mutation
- `useDeletePipelineItem()` — DELETE mutation

### 5. Settings page

Update `frontend/src/pages/Settings.tsx`:
- Organization section:
  - Org name (editable)
  - Org slug (display only)
  - Current plan badge
- Team members section (if applicable):
  - Members table: Name, Email, Role, Joined Date, Actions (change role, remove)
  - "Invite Member" form: email + role dropdown
- API Keys section:
  - List of API keys: name, prefix (co_xxxx...), scopes, last used, created
  - "Create API Key" button → modal with name input + scope checkboxes
  - Shows full key ONCE after creation (with copy button)
  - Delete button per key
- Usage section:
  - Current month usage bars:
    - Evaluations: X / Y (progress bar)
    - PDFs: X / Y
  - "Upgrade Plan" button (placeholder)

### 6. Register any new API hook files

Test:
- Profile page: edit CV, save, verify in split preview
- Profile page: update target roles, save, verify persisted
- Pipeline: add 3 URLs, see in table, process one, verify evaluation created
- Settings: see org info, API keys section, usage meters
```

---

## Prompt 15: Onboarding Wizard

```
All main pages are working. Now build the onboarding wizard for new users.

### 1. Create frontend/src/pages/OnboardingWizard.tsx

Multi-step wizard that appears after first registration (when user has no profile and no CV).

**Step 1: Welcome**
- "Welcome to Career-Ops! Let's set up your profile in 5 minutes."
- Brief explanation of what the system does
- "Get Started" button

**Step 2: Profile Basics**
- Form: Full Name, Email, Phone, Location, Timezone
- LinkedIn URL (optional)
- Portfolio URL (optional)
- "Next" button

**Step 3: Target Roles**
- "What roles are you looking for?"
- Dynamic list: add role entries (role title text input + seniority dropdown)
- Salary target range input
- "Next" button

**Step 4: Your CV**
- Three options (tabs):
  1. "Paste Markdown" — textarea to paste CV in markdown format
  2. "Paste Plain Text" — textarea, system converts to markdown sections
  3. "Build from Scratch" — guided form: Summary, Experience entries (company, title, dates, bullets), Skills, Education
- Live preview panel (MarkdownRenderer)
- "Next" button

**Step 5: First Evaluation (Optional)**
- "Try it out! Paste a job URL or description to see Career-Ops in action."
- URL input or JD textarea
- "Evaluate" button (or "Skip" link)
- If they evaluate: show progress → show score summary → "Finish Setup"

**Step 6: Done**
- "You're all set! Here's what you can do:"
- Quick links: Dashboard, Add more evaluations, Set up pipeline
- "Go to Dashboard" button

### 2. Onboarding detection

In the ProtectedRoute component (or Layout):
- After auth check, also check if user has a profile (GET /api/v1/profiles/me)
- If no profile exists, redirect to /onboarding
- If profile exists, show normal layout

### 3. Routing

Add /onboarding route in App.tsx (protected, but outside the Layout wrapper — full-screen wizard)

### 4. Step indicator

Create a step indicator component showing: Step 1 of 5, with progress dots/bar.

Test:
1. Register a brand new user
2. Should redirect to /onboarding (not /dashboard)
3. Complete each step
4. After finishing, navigate to /dashboard — should show data from onboarding
5. Subsequent logins should go directly to /dashboard (profile exists)
```

---

## Prompt 16: Port Existing Business Logic Utilities

```
Read these files from the project root (NOT the saas/ directory) and port their pure functions to TypeScript in the SaaS backend:

### 1. Port from liveness-core.mjs → saas/src/shared/liveness-classifier.ts

Read `liveness-core.mjs`. Port the `classifyLiveness()` function exactly to TypeScript. This is a pure function with zero dependencies. Keep the same logic, regex patterns, and classification tiers (active/expired/uncertain). Export it.

### 2. Port from merge-tracker.mjs → saas/src/shared/text-utils.ts (add to existing file)

Read `merge-tracker.mjs`. Port these functions to TypeScript and add to text-utils.ts:
- `roleTokens(roleString)` — tokenize role, remove stopwords (Senior, Junior, Lead, Staff, Principal, Remote, Hybrid, etc.), filter to min 3 chars
- `roleFuzzyMatch(roleA, roleB)` — compute Jaccard token overlap, return true if overlap ≥ 2 AND ratio ≥ 0.6

### 3. Port from analyze-patterns.mjs → saas/src/shared/analytics-utils.ts (new file)

Read `analyze-patterns.mjs`. Port these pure functions:
- `classifyRemote(remotePolicy)` — classify as global/regional/geo-restricted/hybrid/unknown
- `classifyCompanySize(company)` — classify as startup/scaleup/enterprise
- `extractBlockerType(gapDescription)` — classify as geo-restriction/stack-mismatch/seniority-mismatch/onsite-requirement/other
- `scoreStats(scores)` — compute min, max, avg, median, count

### 4. Port from scan.mjs → saas/src/shared/ats-utils.ts (new file)

Read `scan.mjs`. Port these pure functions:
- `detectApi(careersUrl)` — detect ATS type (greenhouse/ashby/lever) from URL pattern. Return {type, boardId, apiUrl} or null.
- `buildTitleFilter(globalFilter, companyFilter?)` — merge positive/negative keyword lists

### 5. Write tests

Create `saas/tests/shared/text-utils.test.ts`:
- Test normalizeTextForATS with smart quotes, em-dashes, zero-width chars
- Test roleTokens with various role strings
- Test roleFuzzyMatch with matching and non-matching roles

Create `saas/tests/shared/liveness-classifier.test.ts`:
- Test classifyLiveness with expired patterns, active patterns, uncertain patterns
- Port test cases from the existing test-all.mjs if they exist

Create `saas/tests/shared/ats-utils.test.ts`:
- Test detectApi with greenhouse, ashby, lever URLs
- Test buildTitleFilter with overlapping filters

Run: `cd saas && npx vitest run`

All tests should pass.
```

---

## Prompt 17: Seed Data & Data Migration Tool

```
Build the seed data and data migration functionality.

### 1. saas/src/db/seed.ts

Create a seed script that:
1. Creates a demo user (email: demo@career-ops.com, password: demo1234, fullName: Demo User)
2. Creates a default org (name: Demo Workspace)
3. Seeds prompt_templates from the parent project's modes/ directory:
   - Read modes/_shared.md → insert as template (name: 'shared', language: 'en')
   - Read modes/oferta.md → insert as template (name: 'oferta', language: 'en')
   - Read modes/pdf.md → insert as template (name: 'pdf', language: 'en')
   - Read modes/scan.md → insert as template (name: 'scan', language: 'en')
   - Read modes/apply.md → insert as template (name: 'apply', language: 'en')
   - If modes/de/ exists, read _shared.md and angebot.md → insert as templates (language: 'de')
   - If modes/fr/ exists, read _shared.md and offre.md → insert as templates (language: 'fr')
4. Seed default CV template from templates/cv-template.html
5. Seed canonical statuses into a reference (or just ensure the validation works)

Add npm script: "db:seed": "tsx src/db/seed.ts"

### 2. Data migration endpoint enhancement

Update `saas/src/modules/applications/applications.service.ts` importFromMarkdown():
- Handle the exact format of applications.md from the existing project:
  ```
  | # | Date | Company | Role | Score | Status | PDF | Report | Notes |
  |---|------|---------|------|-------|--------|-----|--------|-------|
  | 1 | 2026-05-20 | Acme | Senior AI | 4.2/5 | Applied | ✅ | [1](reports/001-acme-2026-05-20.md) | Strong match |
  ```
- Parse each row: split by |, trim, extract fields
- Handle score format "X.X/5" → extract decimal
- Handle PDF emoji ✅ → has_pdf=true, ❌ → false
- Handle report link [N](path) → extract report number
- Validate status against canonical list (with alias support)
- Skip header rows and separator rows

### 3. Profile import

Add to profiles.service.ts:
- `importFromYaml(userId, orgId, yamlContent)` — parse profile.yml content, map to profile fields:
  - candidate.full_name → full_name
  - candidate.email → email_contact
  - candidate.location → location
  - target_roles → target_roles (JSONB)
  - compensation → compensation (JSONB)
  - narrative → narrative (JSONB)
  - location → location_prefs (JSONB)

### 4. CV import

The CV import already works (POST /api/v1/cvs with contentMd). No changes needed.

### 5. Full migration endpoint

Create `POST /api/v1/migrate` — requireAuth. Body: {applicationsMarkdown?, profileYaml?, cvMarkdown?}. Calls all import functions. Returns summary of what was imported.

Test:
1. Run `npm run db:seed` — verify demo user and templates created
2. Run `npx drizzle-kit studio` — verify data in tables
3. POST /api/v1/migrate with sample data from the existing project
4. Verify applications, profile, CV all imported correctly
```

---

## Prompt 18: CI/CD & Docker Production Setup

```
Build the CI/CD pipeline and production Docker setup.

### 1. saas/Dockerfile

Multi-stage Dockerfile:
- Stage 1 (builder): node:20-alpine, install deps, compile TypeScript, build frontend
- Stage 2 (runner): node:20-alpine, copy dist + node_modules (prod only) + frontend/dist
- CMD: node dist/server.js
- EXPOSE 3000
- Healthcheck: curl /health

### 2. saas/Dockerfile.worker

Same as above but:
- CMD: node dist/workers/index.js
- No need for frontend files

### 3. Update docker-compose.yml for full stack

Add services:
- api: build from Dockerfile, depends on postgres/redis/minio, maps port 3000, env_file .env
- worker: build from Dockerfile.worker, depends on postgres/redis/minio, env_file .env
- frontend: build from frontend/ (or serve from API via @fastify/static)

Actually, better approach: serve frontend from the API server using @fastify/static in production. Update server.ts:
- In production (NODE_ENV=production): serve frontend/dist as static files
- SPA fallback: serve index.html for all non-API routes
- In development: frontend runs on its own Vite dev server

### 4. saas/.github/workflows/ci.yml (or just document it)

Create a GitHub Actions workflow:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: career_ops_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: [5432:5432]
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd saas && npm ci
      - run: cd saas && npm run build
      - run: cd saas && npm test
      - run: cd saas/frontend && npm ci && npm run build
```

### 5. Production docker-compose.prod.yml

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports: ["3000:3000"]
    env_file: .env.production
    depends_on: [postgres, redis]
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    env_file: .env.production
    depends_on: [postgres, redis]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    env_file: .env.production
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

### 6. saas/.env.production.example

Production env template with notes:
- DATABASE_URL (use managed Postgres like Neon, Supabase, or RDS)
- REDIS_URL (use managed Redis like Upstash or ElastiCache)
- S3 settings (use real AWS S3 or Cloudflare R2)
- DEEPSEEK_API_KEY
- SESSION_SECRET (generate with: openssl rand -hex 32)
- CORS_ORIGIN (your production domain)

Test:
1. `docker compose build` — verify both images build
2. `docker compose up` — verify full stack starts
3. Access http://localhost:3000 — should see React app
4. Register, login, submit evaluation — full flow works in Docker
```

---

## Prompt 19: Final Integration Testing & Polish

```
Everything is built. Now do a final integration test and polish pass.

### 1. End-to-end test

Walk through the complete user journey and fix any issues:

1. docker compose up -d (Postgres, Redis, MinIO)
2. npm run db:seed (seed templates and demo data)
3. npm run dev (start API server)
4. npm run worker (start worker — separate terminal)
5. cd frontend && npm run dev (start frontend — separate terminal)

6. Open http://localhost:5173
7. Register new user: testuser@example.com / TestPass123 / Test User
8. Should redirect to onboarding wizard
9. Complete profile: fill in name, location, target roles
10. Add CV: paste sample markdown CV
11. Skip first evaluation (or test with a sample JD)
12. Arrive at dashboard

13. Navigate to /evaluations/new
14. Paste a sample JD text:
    "Senior TypeScript Engineer at TechCorp. 5+ years Node.js, React, PostgreSQL. Remote-first, $150K-180K. Team of 8 engineers building a SaaS platform."
15. Submit evaluation
16. Watch progress indicator
17. When complete, view full report
18. Verify Block scores chart renders
19. Verify markdown report renders properly

20. Navigate to /applications
21. Verify the evaluation auto-created an application entry
22. Check score, status, company, role are correct
23. Try filtering by status
24. Try sorting by score

25. Generate PDF for the evaluation
26. Download PDF — verify it exists and is readable

27. Navigate to /pipeline
28. Add 3 URLs via text input
29. Verify they appear as pending
30. Process one — verify evaluation is created

31. Navigate to /profile
32. Edit CV — verify live preview
33. Update target roles — save — refresh — verify persisted

34. Navigate to /settings
35. Verify org info displays
36. Create API key — copy it
37. Test API key: curl -H "Authorization: Bearer {key}" http://localhost:3000/api/v1/auth/me

38. Check /api/v1/admin/stats (login as user with admin role or update the demo user's role)

### 2. Fix any issues found

Go through each issue and fix it. Common things to check:
- Error handling: do API errors show friendly messages in the UI?
- Loading states: do pages show spinners while loading?
- Empty states: do pages show "No data yet" messages?
- Form validation: do forms show inline errors?
- Mobile responsiveness: does the sidebar collapse on small screens?
- Session persistence: does refreshing the page keep you logged in?
- API error format consistency: are all errors {error: {code, message}}?

### 3. Add a README

Create `saas/README.md` with:
- Project title and description
- Prerequisites (Node.js 20+, Docker)
- Quick start (docker compose up, npm install, npm run dev)
- Environment variables reference
- Available npm scripts
- API documentation overview (link to /health endpoint)
- Architecture overview (brief)

### 4. Final verification

Run:
- `npm test` — all tests pass
- `npm run build` — TypeScript compiles without errors
- `cd frontend && npm run build` — React builds without errors
- `docker compose build` — Docker images build
- The full flow from Prompt 19 step 6-38 works

The MVP is complete.
```

---

## Summary: Prompt Execution Order

| # | Prompt | What It Builds | Estimated Time |
|---|--------|----------------|----------------|
| 1 | Project Scaffolding | Fastify, Docker, configs, health check | 30 min |
| 2 | Database Schema | All 19 tables with Drizzle | 20 min |
| 3 | Auth Module | Register, login, sessions, API keys | 30 min |
| 4 | Users/Orgs/Profiles | User management, orgs, profiles | 25 min |
| 5 | CVs & Applications | CV CRUD, applications CRUD, import | 25 min |
| 6 | AI Provider | DeepSeek integration, prompt registry | 30 min |
| 7 | Evaluations | Full eval flow: queue → worker → report | 40 min |
| 8 | PDF Generation | Playwright PDF worker, S3 upload | 30 min |
| 9 | Pipeline | URL inbox, process items | 20 min |
| 10 | Audit & Usage | Audit log, usage tracking, admin stats | 20 min |
| 11 | React Setup | Vite, auth, layout, routing | 30 min |
| 12 | Dashboard & Apps | KPI cards, applications table | 30 min |
| 13 | Evaluation Pages | Submit eval, view report, PDF download | 35 min |
| 14 | Profile/Pipeline/Settings | Profile editor, pipeline UI, settings | 30 min |
| 15 | Onboarding Wizard | 5-step onboarding flow | 25 min |
| 16 | Business Logic Ports | Port pure functions from existing code | 20 min |
| 17 | Seed & Migration | Demo data, import from CLI files | 20 min |
| 18 | CI/CD & Docker | Dockerfiles, GitHub Actions, production | 20 min |
| 19 | Integration Test | End-to-end test, polish, README | 40 min |

**Total estimated: ~8-10 hours of Claude execution time**

---

## Phase 2 & 3: Prompts 20-33

The prompts below extend the MVP into the Phase 2 (Scanner + Analytics + Teams + Billing) and Phase 3 (AI Admin) feature sets defined in `SAAS_TRANSFORMATION_PLAN.md` sections 11.2 and 11.3. Run them in order, after Prompt 19.

---

## Prompt 20: Portals Module (CRUD + ATS Detection + YAML Import)

```
Read SAAS_TRANSFORMATION_PLAN.md sections 6.1 (PORTALS endpoints) and 11.2 (Week 9-12).

Also read the existing `scan.mjs` and `portals.yml` in the project root to understand the portal config shape (name, careers_url, api_type, api_url, enabled, filters, etc.) and the ATS auto-detection patterns (Greenhouse boards.greenhouse.io, Ashby jobs.ashbyhq.com, Lever jobs.lever.co).

The `detectApi()` pure function was already ported in Prompt 16 to `saas/src/shared/ats-utils.ts`. Reuse it.

Build the Portals module.

### 1. saas/src/modules/portals/portals.service.ts

- `listPortals(orgId, filters?)` — paginated. Filter by enabled (boolean), api_type, name (ilike). Sort by name ASC.
- `getPortal(id, orgId)` — return single portal (org-scoped). Throw NotFoundError if not in org.
- `createPortal(orgId, data: {name, careersUrl, apiType?, apiUrl?, enabled?, metadata?})` —
  1. If apiType/apiUrl not provided, call detectApi(careersUrl) and set them
  2. Insert. Return created.
- `updatePortal(id, orgId, data)` — update any field. Re-run detectApi if careersUrl changes and apiType is null. Return updated.
- `deletePortal(id, orgId)` — soft delete by setting enabled=false (preserves scan_results FK). Actual delete only if no scan_results reference it.
- `importFromYaml(orgId, yamlContent)` —
  1. Parse YAML with `yaml` package (add dep)
  2. Expect shape: `portals: [{name, careers_url, enabled?, title_filter?, ...}]` and optionally `title_filter: {positive: [], negative: []}` at root
  3. For each portal entry: detectApi() if no api_type, upsert by (org_id, name)
  4. Persist root-level title_filter entries into `title_filters` table (type='positive'/'negative')
  5. Return {imported: N, updated: N, skipped: N, errors: [...]}
- `listTitleFilters(orgId)` — return {positive: [], negative: []}
- `setTitleFilters(orgId, positive: string[], negative: string[])` — delete existing, insert new. Return new lists.

### 2. saas/src/modules/portals/portals.routes.ts

- `GET /api/v1/portals` — requireAuth, requireOrg. Query: ?enabled=true&apiType=greenhouse&page=1&limit=50. Paginated.
- `POST /api/v1/portals` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {name, careersUrl, apiType?, apiUrl?, enabled?, metadata?}. Create.
- `GET /api/v1/portals/:id` — requireAuth, requireOrg. Return portal.
- `PUT /api/v1/portals/:id` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Update.
- `DELETE /api/v1/portals/:id` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Soft delete.
- `POST /api/v1/portals/import` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {yaml: string}. Bulk import.
- `GET /api/v1/portals/title-filters` — requireAuth, requireOrg. Return positive/negative lists.
- `PUT /api/v1/portals/title-filters` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {positive: string[], negative: string[]}. Update.

### 3. Audit logging

Add audit.log() calls: `portal.created`, `portal.updated`, `portal.deleted`, `portal.imported`, `title_filters.updated`.

### 4. Register routes in server.ts

### 5. Tests

Create `saas/tests/modules/portals.test.ts`:
- Upsert behavior (same name + org → updates, not duplicates)
- detectApi integration (greenhouse/ashby/lever URLs auto-detect)
- YAML import with mixed valid/invalid entries
- Soft delete preserves rows when scan_results FK exists

Run: `cd saas && npx vitest run tests/modules/portals.test.ts`

Test manually:
1. POST /api/v1/portals with `{"name": "Stripe", "careersUrl": "https://boards.greenhouse.io/stripe"}` — verify api_type='greenhouse' auto-detected
2. POST /api/v1/portals/import with sample portals.yml content
3. GET /api/v1/portals?enabled=true — verify list
4. PUT /api/v1/portals/title-filters with positive: ["engineer", "developer"], negative: ["intern"]
```

---

## Prompt 21: Scanner Service & Worker (Greenhouse/Ashby/Lever)

```
Read SAAS_TRANSFORMATION_PLAN.md section 11.2 (Week 9-12: Scanner).

Read the existing `scan.mjs` in the project root carefully. Note the API patterns:
- **Greenhouse:** GET `https://boards-api.greenhouse.io/v1/boards/{boardId}/jobs` → `{jobs: [{id, title, absolute_url, location: {name}, updated_at}]}`
- **Ashby:** GET `https://api.ashbyhq.com/posting-api/job-board/{boardId}` → `{jobs: [{id, title, jobUrl, locationName, publishedDate}]}`
- **Lever:** GET `https://api.lever.co/v0/postings/{boardId}?mode=json` → array of `{id, text, hostedUrl, categories: {location}, createdAt}`

Build the Scanner.

### 1. saas/src/modules/scanner/scanner.service.ts

- `triggerScan(userId, orgId, portalIds?: string[])` —
  1. Check usage limits via cost-tracker.checkLimits(orgId, 'scan')
  2. Resolve portals: if portalIds provided, use those (verify org-scoped). Otherwise all enabled portals for org.
  3. Create ai_task (task_type: 'scan', input: {portalIds, triggered_by: userId})
  4. Enqueue to 'scan' BullMQ queue
  5. Return {taskId, portalCount}
- `getScanStatus(taskId, userId)` — return ai_task status + output (portals scanned, new results count)
- `listResults(orgId, filters?)` — paginated. Filter by source (portal name), company, status, dateFrom (first_seen >=). Sort by first_seen DESC.
- `getScanHistory(orgId, pagination)` — paginated. Group ai_tasks where task_type='scan' by created_at. Return list with portal counts and new-results counts.
- `markResultProcessed(id, orgId, status)` — update scan_results.status ('added'|'skipped'|'evaluated') and processed_at.
- `convertToPipeline(orgId, userId, resultIds: string[])` — for each result, add to pipeline_items (dedup by URL). Mark result status='added'. Return {added: N, duplicates: N}.

### 2. saas/src/modules/scanner/scanner.fetchers.ts

Export per-ATS fetchers. Each returns a normalized array `{externalId, title, url, company, location, postedAt}`:

- `fetchGreenhouse(boardId, portalName)` — GET boards-api.greenhouse.io endpoint, map fields.
- `fetchAshby(boardId, portalName)` — GET posting-api endpoint, map fields.
- `fetchLever(boardId, portalName)` — GET api.lever.co endpoint, map fields.
- `fetchPortal(portal)` — dispatch based on portal.api_type. Throws if unknown type.

Use native fetch with 30s timeout. Retry once on 5xx with 2s backoff.

### 3. saas/src/modules/scanner/scanner.queue.ts

Create BullMQ Queue 'scan'. Job options: 2 retries, exponential backoff (5s, 30s).

### 4. saas/src/modules/scanner/scanner.worker.ts

Worker for 'scan' queue:
1. Update ai_task status='processing', started_at
2. Load portals from DB by IDs
3. Load org title_filters (positive + negative)
4. For each portal, in parallel batches of 5:
   - Call fetchPortal(portal)
   - For each result: apply title filter (must match a positive keyword if any defined, and not match any negative) — pure helper `buildTitleFilter()` from Prompt 16
   - For each surviving result, upsert into scan_results ON CONFLICT (org_id, url) DO NOTHING. Track count of inserted vs skipped.
5. Update ai_task: status='completed', output: {portalsScanned, newResults, skippedDuplicates, filteredOut, errors: [{portal, error}]}
6. Track usage via cost-tracker (scans_count++) — note: scans are free of token cost but count toward plan scan quota
7. Audit log: `scanner.completed`

Errors: catch per-portal errors so one failed portal doesn't fail the whole scan. Aggregate errors into output.errors.

### 5. saas/src/modules/scanner/scanner.routes.ts

- `POST /api/v1/scanner/run` — requireAuth, requireOrg. Body: `{portalIds?: string[]}`. Trigger. Return {taskId, portalCount}.
- `GET /api/v1/scanner/run/:taskId/status` — requireAuth, requireOrg. Status.
- `GET /api/v1/scanner/results` — requireAuth, requireOrg. Paginated results. Query: ?source=&company=&status=&dateFrom=&page=&limit=.
- `POST /api/v1/scanner/results/convert` — requireAuth, requireOrg. Body: {resultIds: string[]}. Push to pipeline.
- `PUT /api/v1/scanner/results/:id` — requireAuth, requireOrg. Body: {status}. Mark processed.
- `GET /api/v1/scanner/history` — requireAuth, requireOrg. Paginated history.

### 6. Register worker in workers/index.ts, routes in server.ts

### 7. Tests

Create `saas/tests/modules/scanner.test.ts`:
- Mock fetch for each ATS, assert field mapping is correct
- Filter logic: positive only, negative only, both, neither
- Dedup: re-running same scan doesn't create duplicates

Manual test:
1. Create a portal with `{"name": "Stripe", "careersUrl": "https://boards.greenhouse.io/stripe"}`
2. POST /api/v1/scanner/run with no portalIds → scans all enabled portals
3. Poll status until completed
4. GET /api/v1/scanner/results — verify rows
5. POST /api/v1/scanner/results/convert with a few IDs — verify they appear in /api/v1/pipeline
```

---

## Prompt 22: Scanner UI + Cron Scheduling

```
The Scanner backend is working. Now build the Scanner UI and recurring scan scheduling.

### 1. saas/src/modules/scanner/scanner.schedule.ts

- `upsertSchedule(orgId, userId, cron: string, portalIds?: string[], enabled: boolean)` —
  1. Validate cron expression using `cron-parser` (add dep). Reject if invalid.
  2. Store in organizations.settings.scanner_schedule = {cron, portalIds, enabled, updatedBy: userId, updatedAt}
  3. Register BullMQ repeatable job: queue.add('scheduled-scan', {orgId, portalIds}, {repeat: {pattern: cron}, jobId: `scan-${orgId}`})
  4. If enabled=false, removeRepeatable.
- `getSchedule(orgId)` — return current schedule from settings
- `removeSchedule(orgId)` — removeRepeatable from queue + clear settings entry

When the scheduled job fires, the worker handles it identically to a manual scan but with input.triggered_by='schedule'.

### 2. Schedule routes (extend scanner.routes.ts)

- `GET /api/v1/scanner/schedule` — requireAuth, requireOrg. Return current schedule.
- `PUT /api/v1/scanner/schedule` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {cron, portalIds?, enabled}. Upsert.
- `DELETE /api/v1/scanner/schedule` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Remove.

### 3. Frontend API hooks — saas/frontend/src/api/scanner.ts

- `useRunScan()` — POST /api/v1/scanner/run mutation
- `useScanStatus(taskId)` — GET status, refetchInterval 2000 while pending/processing
- `useScanResults(filters)` — GET /api/v1/scanner/results
- `useConvertResults()` — POST /scanner/results/convert mutation
- `useScanHistory(pagination)` — GET /scanner/history
- `useScanSchedule()` — GET /scanner/schedule
- `useUpdateScanSchedule()` — PUT mutation
- `useDeleteScanSchedule()` — DELETE mutation

### 4. Portals API hooks — saas/frontend/src/api/portals.ts

CRUD hooks for /api/v1/portals + title-filters get/set + import.

### 5. saas/frontend/src/pages/Portals.tsx

- Table: Name, Careers URL (truncated, link), ATS type (badge), Enabled (toggle), Actions
- "Add Portal" button → modal: name, careersUrl, enabled. Submit → auto-detect ATS shown after creation.
- "Import YAML" button → modal: paste YAML textarea, preview parsed portal count, import.
- "Title Filters" panel: two tag inputs (positive / negative), save button.

### 6. saas/frontend/src/pages/Scanner.tsx

Layout:
- Header: "Scan Now" button (multi-select portals dropdown, default all)
- Status banner: shows in-progress scan with portal count + progress text (polled)
- KPI row: Last scan time, New results this week, Total open scans, Conversion rate (results → applications)
- Recurring schedule card: cron expression input + enabled toggle, "Save Schedule" button, human-readable description ("Every day at 9 AM")
- Results table: New (badge if status='added' and < 24h), Date Seen, Title, Company, Location, Source (portal name), Status, Actions
  - Multi-select rows
  - Bulk action: "Convert to Pipeline" (calls convert endpoint)
  - Per-row: "Evaluate" (creates pipeline item + immediately triggers evaluation), "Skip" (status='skipped')
- Filter bar: status, source (portal), company search, date range
- Pagination
- Scan history accordion at bottom: collapsed by default, expands to show last 20 scans with portal count and new-results count

### 7. Update Sidebar nav

Enable "Scanner" and add "Portals" item. Remove "coming soon" badge.

### 8. Tests

Verify:
- Schedule cron validation rejects invalid expressions
- Schedule disabled → no repeatable job exists in BullMQ
- Schedule enabled → repeatable job registered, fires per cron

Manual:
1. Add 2-3 portals (one of each ATS type if possible)
2. /scanner → click "Scan Now"
3. Watch progress → results populate
4. Multi-select 3 results → "Convert to Pipeline"
5. Set schedule "0 9 * * *", enable → verify scheduled job in Redis (`BullMQ` repeat keys)
6. Disable → verify removed
```

---

## Prompt 23: Batch Evaluation + Liveness Checker

```
Read SAAS_TRANSFORMATION_PLAN.md sections 6.1 (LIVENESS endpoints) and 11.2 (Week 13-16).

The liveness classifier was ported in Prompt 16 to `saas/src/shared/liveness-classifier.ts`. The evaluation flow already exists from Prompt 7.

Now wire up batch evaluation and a liveness check worker.

### 1. Batch evaluation (extend evaluations module)

Add to evaluations.service.ts:
- `submitBatch(userId, orgId, items: Array<{url?: string, jdText?: string, company?: string, role?: string}>)` —
  1. Check usage limits (allowed >= items.length, or partial allowed)
  2. Validate at least one of url/jdText per item
  3. Create one ai_task per item (task_type: 'evaluation', input: item, metadata: {batchId: nanoid()})
  4. Enqueue each to 'evaluation' queue
  5. Return {batchId, taskIds: [...], queued: N, rejected: [...] }

- `getBatchStatus(batchId, userId, orgId)` — return all ai_tasks where input.batchId = batchId, summarize {pending, processing, completed, failed} counts, list each with status+output.

Add to evaluations.routes.ts:
- `POST /api/v1/evaluations/batch` — requireAuth, requireOrg. Body: {items: [...]}. Returns batchId + taskIds.
- `GET /api/v1/evaluations/batch/:batchId/status` — requireAuth, requireOrg. Returns aggregate + per-item status.

### 2. Liveness module

#### saas/src/modules/liveness/liveness.service.ts

- `submitLivenessCheck(userId, orgId, urls: string[])` —
  1. Limit max 50 URLs per request
  2. Create ai_task (task_type: 'liveness', input: {urls})
  3. Enqueue to 'liveness' queue
  4. Return {taskId, count}
- `getLivenessStatus(taskId, userId, orgId)` — return ai_task with output array of {url, tier, signals, fetchedAt}
- `getLivenessForApplications(applicationIds, orgId)` — for each application's job_url, lookup most recent liveness result (from ai_tasks where url matches), return map.

#### saas/src/modules/liveness/liveness.queue.ts

Create BullMQ Queue 'liveness'. Concurrency 5.

#### saas/src/modules/liveness/liveness.worker.ts

Worker for 'liveness':
1. Update ai_task status='processing'
2. For each URL, in parallel batches of 5:
   - Fetch URL with 15s timeout, user-agent string. Handle 404/410/expired domains.
   - Strip HTML to text (cheap, no Playwright in worker)
   - Run classifyLiveness(htmlText, statusCode) → returns {tier: 'active'|'expired'|'uncertain', signals: [...]}
   - Append result
3. Update ai_task: status='completed', output: [{url, tier, signals, fetchedAt}], latency, tokens=0, cost=0

Errors per URL: capture as result {url, tier: 'error', error: msg}. Don't fail the whole task.

#### saas/src/modules/liveness/liveness.routes.ts

- `POST /api/v1/liveness/check` — requireAuth, requireOrg. Body: {urls: string[]} (max 50). Submit. Return {taskId, count}.
- `GET /api/v1/liveness/:taskId/status` — requireAuth, requireOrg. Return status + results.
- `POST /api/v1/liveness/applications` — requireAuth, requireOrg. Body: {applicationIds: string[]}. Triggers liveness check on each application's job_url. Returns {taskId}.

### 3. Worker registration

Register liveness worker in workers/index.ts.

### 4. Frontend integration

API hooks `saas/frontend/src/api/batch.ts`:
- `useSubmitBatch()` mutation
- `useBatchStatus(batchId)` — refetchInterval 3000 while any item pending/processing

API hooks `saas/frontend/src/api/liveness.ts`:
- `useCheckLiveness()` mutation
- `useLivenessStatus(taskId)` polled
- `useCheckLivenessForApplications()` mutation

#### Batch UI

Update Pipeline page: "Evaluate All Pending" → uses submitBatch (more efficient than per-item process). Show batch progress panel.

Update Applications page: bulk-select rows → "Check Liveness" button → triggers liveness for selected. Update column "Liveness" with tier badge (Active green / Expired gray / Uncertain yellow). Auto-refresh from polled status.

### 5. Tests

`saas/tests/modules/batch.test.ts`:
- 100 items: enforce quota correctly
- Mixed valid/invalid items: invalid rejected, valid queued

`saas/tests/modules/liveness.test.ts`:
- Mocked fetch returning expired page → tier='expired'
- Mocked 404 → tier='expired'
- Mocked active job page → tier='active'

Manual:
1. /pipeline → "Evaluate All Pending" with 5 items → watch batch progress
2. /applications → select 3 → "Check Liveness" → verify tiers update
```

---

## Prompt 24: Follow-ups Module

```
Read SAAS_TRANSFORMATION_PLAN.md section 6.1 (FOLLOW-UPS) and 11.2 (Week 13-16).

Read the existing `followup-cadence.mjs` in the project root to understand the cadence rules:
- Day 7 after Applied → first follow-up due
- Day 14 → second follow-up
- Day 21 → final follow-up
- Urgency levels: overdue (red), due-today (orange), soon (yellow), scheduled (green)

The cadence calculator was ported in Prompt 16 to `saas/src/shared/analytics-utils.ts` (or add it now if not done).

### 1. saas/src/modules/followups/followups.service.ts

- `listFollowUps(userId, orgId, filters?)` — paginated. Join with applications. Filter by urgency (computed), application status, dateFrom/To. Include current urgency for each item.
- `getCadence(userId, orgId)` — for every application in status Applied/Responded, compute next follow-up date and urgency. Return list grouped by urgency tier.
- `recordFollowUp(userId, orgId, data: {applicationId, date, channel, contactName?, contactEmail?, notes?})` — insert into follow_ups. If channel/contactName provided, optionally update application notes.
- `updateFollowUp(id, userId, data)` — update notes, channel.
- `deleteFollowUp(id, userId)` — delete.

Helper `computeUrgency(application, lastFollowUpDate?)` — uses ported `followup-cadence.mjs` logic. Returns 'overdue'|'due-today'|'soon'|'scheduled'|'none'.

### 2. saas/src/modules/followups/followups.routes.ts

- `GET /api/v1/followups` — requireAuth, requireOrg. Query: ?urgency=overdue&page=&limit=. Return list with urgency.
- `GET /api/v1/followups/cadence` — requireAuth, requireOrg. Return grouped cadence view.
- `POST /api/v1/followups` — requireAuth, requireOrg. Body: {applicationId, date, channel, contactName?, contactEmail?, notes?}. Record.
- `PUT /api/v1/followups/:id` — requireAuth, requireOrg. Update.
- `DELETE /api/v1/followups/:id` — requireAuth, requireOrg. Delete.

### 3. Frontend

API hooks `saas/frontend/src/api/followups.ts`:
- `useFollowUps(filters)`, `useCadence()`, `useRecordFollowUp()`, `useUpdateFollowUp()`, `useDeleteFollowUp()`.

Page `saas/frontend/src/pages/FollowUps.tsx`:
- Top: Urgency-tier cards (Overdue count red, Due Today orange, Soon yellow, Scheduled green) — click filters list
- Table: Application (Company / Role), Last Status Change, Days Since, Next Action, Urgency badge, Actions (Record button)
- "Record Follow-up" modal: date (default today), channel (email/linkedin/phone/other), contact name + email, notes
- Per-application detail drawer shows full follow-up history

Add nav item "Follow-ups" in sidebar.

### 4. Email reminders (optional, behind feature flag)

If `env.EMAIL_PROVIDER` set, register a daily cron job that:
- For each user with overdue follow-ups, send a single digest email (use whatever email service is wired in section 18 of the plan — placeholder logger if not).

### 5. Tests

- Cadence math: Day 6 → 'soon', Day 7 → 'due-today', Day 8 → 'overdue' after Applied
- Recording a follow-up resets urgency for next cycle

Manual:
1. Mark a few applications as Applied dated 8+ days ago → /followups shows them as Overdue
2. Record follow-up → urgency moves to 'scheduled' for next cycle
```

---

## Prompt 25: Analytics Backend (Funnel, Patterns, Score Threshold)

```
Read SAAS_TRANSFORMATION_PLAN.md section 6.1 (ANALYTICS) and 11.2 (Week 13-16).

The analytics pure functions (classifyRemote, classifyCompanySize, extractBlockerType, scoreStats) were ported in Prompt 16 to `saas/src/shared/analytics-utils.ts`.

Build the analytics service.

### 1. saas/src/modules/analytics/analytics.service.ts

- `getFunnel(orgId, filters?: {dateFrom?, dateTo?, archetype?})` — count applications by status. Return:
  ```
  {
    stages: [
      {status: 'Evaluated', count, percentage},
      {status: 'Applied', count, percentage, conversionFromPrev},
      {status: 'Responded', ...},
      {status: 'Interview', ...},
      {status: 'Offer', ...}
    ],
    rejectedTotal,
    discardedTotal,
    totalEvaluated
  }
  ```
- `getPatterns(orgId, filters?)` — analyze rejected/discarded applications. Return:
  ```
  {
    byArchetype: [{archetype, count, avgScore, rejectionRate}],
    byCompanySize: [{size, count, rejectionRate}],
    byRemotePolicy: [{policy, count, rejectionRate}],
    blockerTypes: [{type, count, examples: [...]}],
    scoreDistribution: {evaluated: {...stats}, applied: {...}, rejected: {...}, offer: {...}}
  }
  ```
  Uses analytics-utils helpers. Mines gap descriptions from evaluations for blocker classification.

- `getScoreThreshold(orgId)` — find the score below which rejection rate exceeds 80%. Compute by binning applications into 0.5-wide score buckets, computing rejection rate per bucket, finding the lowest bucket with rate <= 20%. Return `{recommendedMinScore, rationale: "Below 3.5 → 87% rejection rate over 23 samples"}`.

- `getFollowUpsAnalytics(orgId)` — average response time (Applied → Responded), follow-up effectiveness rate (response rate with vs without follow-up).

- `getTimeSeriesEvaluations(orgId, granularity: 'day'|'week'|'month', dateFrom, dateTo)` — buckets of evaluation count, avg score over time.

### 2. saas/src/modules/analytics/analytics.routes.ts

- `GET /api/v1/analytics/funnel` — requireAuth, requireOrg. Query: ?dateFrom=&dateTo=&archetype=.
- `GET /api/v1/analytics/patterns` — requireAuth, requireOrg.
- `GET /api/v1/analytics/score-threshold` — requireAuth, requireOrg.
- `GET /api/v1/analytics/followups` — requireAuth, requireOrg.
- `GET /api/v1/analytics/timeseries` — requireAuth, requireOrg. Query: ?granularity=week&dateFrom=&dateTo=.

### 3. Caching

Add to analytics.service.ts: per-org cache (Redis, 10 min TTL) keyed on org+filters hash. Bust cache when applications/evaluations updated (use a Redis pub/sub or a simpler "lastMutationAt:org:{orgId}" timestamp comparison).

### 4. Tests

`saas/tests/modules/analytics.test.ts`:
- Seed 100 mock applications across statuses → funnel percentages correct
- Score threshold: synthetic data where score 3.5 has 80% rejection → recommendedMinScore returns 3.5
- Time series: 30 days of data, weekly granularity → 4-5 buckets

Manual:
1. After accumulating data via prior prompts, GET each endpoint
2. Verify funnel numbers match counts in /applications by status
3. Verify patterns surface real archetype/companySize breakdowns
```

---

## Prompt 26: Analytics Frontend (Funnel, Patterns, Trends)

```
Analytics backend is ready. Now build the Analytics UI.

### 1. API hooks — saas/frontend/src/api/analytics.ts

- `useFunnel(filters)`, `usePatterns(filters)`, `useScoreThreshold()`, `useFollowUpsAnalytics()`, `useTimeSeriesEvaluations(granularity, dateFrom, dateTo)`.

### 2. Reusable charts (Recharts)

Create in `saas/frontend/src/components/charts/`:
- `FunnelChart.tsx` — vertical funnel with stage labels, counts, drop-off arrows
- `BarChartCard.tsx` — generic horizontal bar chart for breakdowns
- `LineChartCard.tsx` — line chart for time series
- `ScoreDistributionChart.tsx` — histogram with status overlay (stacked bars)

All charts respect dark/light theme via CSS vars defined in Prompt 11.

### 3. saas/frontend/src/pages/Analytics.tsx

Tabs:
**Funnel tab:**
- Filter bar: date range, archetype dropdown
- Big funnel chart in center
- Stage cards beneath: each shows count + conversion rate from previous stage
- Side panel: Rejected total, Discarded total, with breakdown into "Bad fit" vs "Closed" reasons

**Patterns tab:**
- Card: Recommended score threshold (big number + rationale line)
- Bar charts row: By Archetype, By Company Size, By Remote Policy — each showing rejection rate
- Blocker types card: top-5 reasons applications fail, with example snippets (collapsible)
- Score distribution chart at bottom

**Trends tab:**
- Granularity toggle: Day / Week / Month
- Line chart: evaluations per period, with secondary axis for average score
- KPI strip: This Period vs Last Period (evals count delta %, avg score delta)

**Follow-ups tab:**
- Avg response time card (days)
- Follow-up effectiveness card (response rate with follow-up vs without)
- Funnel of: Applied → Responded → Interview, with/without follow-up overlay

### 4. Dashboard enrichments

Update `Dashboard.tsx`:
- Replace placeholder "Analytics" tile with a Mini Funnel widget (4 stages, simplified)
- Add "Recommended Min Score" KPI card using useScoreThreshold

### 5. Enable Sidebar item

Remove the "coming soon" badge from Analytics nav item.

### 6. Loading + empty states

- If org has < 10 applications: show empty state "Need at least 10 applications for meaningful patterns. You have N."
- Per-chart skeleton during load

Manual:
1. /analytics → all four tabs render
2. Verify funnel matches actual counts on /applications
3. Patterns surface real archetypes from past evaluations
4. Score threshold matches gut check on dataset
```

---

## Prompt 27: Team Invitations + RBAC Enforcement

```
Read SAAS_TRANSFORMATION_PLAN.md section 11.2 (Week 17-20: Teams + RBAC) and 13.1.

Roles: owner > admin > member > viewer.

### 1. Invitations table

Add to schema: `invitations` — id (uuid pk), org_id (uuid ref organizations cascade), email (varchar 255 not null), role (varchar 20 not null), token (varchar 64 unique not null), invited_by (uuid ref users), expires_at (timestamp not null), accepted_at (timestamp), created_at. Index on (token), (org_id, email).

Generate migration: `npx drizzle-kit generate && npx drizzle-kit push`.

### 2. saas/src/modules/organizations/invitations.service.ts

- `createInvitation(orgId, invitedBy, email, role)` —
  1. Check inviter is owner/admin (caller already validated, this is internal check)
  2. Check org member limits (current count + pending invites < max_members)
  3. If user with email exists AND already a member → throw ConflictError
  4. Generate token nanoid(64). 7-day expiry.
  5. Insert. Send email (if EMAIL_PROVIDER configured) with link `${env.FRONTEND_URL}/invite/accept?token=...`. Else log the URL.
  6. Return invitation (without token unless caller is owner/admin viewing pending invites).
- `listInvitations(orgId, status?: 'pending'|'accepted'|'expired')` — list with status computed.
- `acceptInvitation(token, userId)` —
  1. Find by token, check not expired and not accepted
  2. If invitee email doesn't match userId email → throw ForbiddenError
  3. Create membership (org_id, user_id, role)
  4. Mark invitation accepted_at = now
  5. Return {orgId, role}
- `revokeInvitation(id, orgId, callerUserId)` — caller must be owner/admin. Delete row.
- `resendInvitation(id, orgId, callerUserId)` — caller must be owner/admin. Reset expiry, resend email.

### 3. Update orgs.service.ts inviteMember

Refactor to call invitations.service.createInvitation. Remove the legacy "create membership immediately if user exists" path; everyone goes through token acceptance now (cleaner, consistent).

### 4. Invitation routes (extend orgs.routes.ts)

- `POST /api/v1/orgs/:orgId/invitations` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {email, role}. Create.
- `GET /api/v1/orgs/:orgId/invitations` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). List.
- `DELETE /api/v1/orgs/:orgId/invitations/:id` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Revoke.
- `POST /api/v1/orgs/:orgId/invitations/:id/resend` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Resend.
- `POST /api/v1/invitations/accept` — requireAuth. Body: {token}. Accept. Returns {orgId, role}.
- `GET /api/v1/invitations/:token` — public (no auth). Returns invitation metadata for the accept page (orgName, inviterName, role, email, expiresAt) — does NOT include sensitive info.

### 5. RBAC enforcement audit

Go through every existing route and ensure correct requireOrgRole:
- Read-only (GET): any member (incl. viewer)
- Mutations (POST/PUT/DELETE) on org-owned entities (CVs, applications, evaluations, pipeline, portals, etc.): member or above (NOT viewer)
- Org settings + invitations + member management: owner or admin
- Billing changes: owner only
- Custom prompt templates: owner or admin

Add `requireOrgRole('owner', 'admin', 'member')` middleware (exclude viewer) where appropriate. Add a `denyViewer` helper if convenient.

For evaluation submission: viewer should NOT be able to submit. For viewing reports: viewer SHOULD be able to read.

### 6. Frontend

Update Settings → Team Members tab:
- Two sections: "Members" (existing) and "Pending Invitations"
- Pending invitations table: Email, Role, Invited By, Expires, Actions (Resend, Revoke)
- "Invite Member" form: email + role dropdown (owner/admin/member/viewer)
- Member role dropdown: editable inline (calls existing updateMemberRole)

New page `saas/frontend/src/pages/AcceptInvite.tsx`:
- Route: /invite/accept?token=...
- Fetches public invitation metadata via GET /invitations/:token
- If user is logged in AND email matches → "Accept Invitation" button → calls POST /invitations/accept → on success, switches active org and navigates to /dashboard
- If user not logged in → "Sign in to accept" with login link that preserves the token
- If email mismatch → error with "Sign in as {email} to accept"
- If expired → error message

API hooks `saas/frontend/src/api/invitations.ts`: useInvitationMetadata(token), useAcceptInvitation(), useListInvitations(orgId), useCreateInvitation(orgId), useRevokeInvitation(), useResendInvitation().

### 7. Audit logging

- `org.invitation_created`, `org.invitation_accepted`, `org.invitation_revoked`, `org.invitation_resent`
- `org.member_role_updated`

### 8. Tests

`saas/tests/modules/invitations.test.ts`:
- Create → token unique, 7-day expiry
- Accept with matching email → membership created, invitation marked accepted
- Accept with mismatched email → ForbiddenError
- Accept expired → error
- Revoke + resend behavior
- Member limit enforcement (pending + active counted)

RBAC tests `saas/tests/modules/rbac.test.ts`:
- Viewer cannot POST application, evaluation, pipeline item
- Viewer can GET them
- Member cannot manage invitations or update org settings
- Admin cannot remove the last owner
- Owner can do everything

Manual:
1. Invite owner@test.com as admin → check email log/output for link
2. Register that user separately → /invite/accept?token=... → accept
3. Verify they appear in members with admin role
4. Switch active org → can see same data
5. Try viewer-level account: cannot submit evaluation (403)
```

---

## Prompt 28: Notifications & Activity Feed

```
Build in-app notifications and an org activity feed.

### 1. Notifications table

Add to schema: `notifications` — id (uuid pk), user_id (uuid ref users cascade), org_id (uuid ref organizations cascade), type (varchar 50 not null), title (varchar 255 not null), body (text), entity_type (varchar 50), entity_id (uuid), read_at (timestamp), created_at (timestamp default now). Index on (user_id, read_at, created_at DESC).

Generate + push migration.

### 2. saas/src/modules/notifications/notifications.service.ts

- `notify(userId, orgId, type, title, body, entityType?, entityId?)` — insert row. Fire and forget.
- `notifyOrg(orgId, type, title, body, entityType?, entityId?, excludeUserId?)` — fanout to every membership user_id in org (except excluded).
- `listForUser(userId, orgId, filters?)` — paginated. Filter unreadOnly.
- `markRead(ids, userId)` — bulk mark.
- `markAllRead(userId, orgId)`.
- `getUnreadCount(userId, orgId)`.

Notification types:
- `evaluation.completed`, `evaluation.failed`
- `pdf.generated`
- `scanner.completed` (org fanout)
- `pipeline.processed`
- `usage.warning` (80% of plan), `usage.exceeded` (100%)
- `invitation.received`, `invitation.accepted`
- `member.joined`, `member.removed`
- `follow_up.due` (daily digest from cron)

### 3. Wire into existing workers/services

- Evaluation worker on success → notify(userId, orgId, 'evaluation.completed', `"${role} at ${company}" — Score ${score}`, ..., 'evaluation', evalId)
- Evaluation worker on failure → notify(userId, orgId, 'evaluation.failed', ...)
- PDF worker on completion → notify(userId, ...)
- Scanner worker on completion → notifyOrg with summary
- Usage-record incrementer → if hitting 80%/100%, notify all org owners/admins (one-time per month, dedup via metadata)

### 4. Routes

- `GET /api/v1/notifications` — requireAuth, requireOrg. Query: ?unreadOnly=true&page=&limit=. Paginated.
- `POST /api/v1/notifications/mark-read` — requireAuth. Body: {ids: string[]}. Mark.
- `POST /api/v1/notifications/mark-all-read` — requireAuth, requireOrg.
- `GET /api/v1/notifications/unread-count` — requireAuth, requireOrg.

### 5. Activity feed (extends audit log)

Reuse audit_logs. Add endpoint:
- `GET /api/v1/audit/feed` — requireAuth, requireOrg. Paginated. Returns enriched rows with user.full_name and best-effort entity link (e.g., "Alice submitted evaluation for Stripe / Senior SWE"). Excludes noisy actions like `user.login` (filterable via query).

### 6. Frontend

API hooks `saas/frontend/src/api/notifications.ts`: useNotifications(filters), useUnreadCount() with refetchInterval 30s, useMarkRead(), useMarkAllRead().

Header bell component `saas/frontend/src/components/layout/NotificationBell.tsx`:
- Bell icon with unread count badge
- Click → dropdown panel with last 10 notifications, "Mark all read", link to /notifications page
- Notification row: icon (by type), title, body (truncated), relative time, read indicator
- Clicking a notification: marks as read + navigates to entity (e.g., /evaluations/:id)

Add to Header.tsx alongside user dropdown.

Page `saas/frontend/src/pages/Notifications.tsx`:
- Tabs: Unread / All
- Same row design as dropdown but larger
- Pagination
- Filter by type (dropdown)

Page `saas/frontend/src/pages/ActivityFeed.tsx`:
- Linear timeline view of audit log
- Filter: action type, date range, user
- Grouped by day with "Today" / "Yesterday" / date labels

Add nav entry "Activity" (admin/owner only).

### 7. Tests

- Notification created on evaluation completion
- Usage warning fires only once per month per threshold
- Mark-read only affects own user

Manual:
1. Submit evaluation → bell badge increments → click → navigate to report
2. Trigger scan as owner → other org members see "scanner.completed" notification
3. Fill plan to 80% → owner gets usage warning
```

---

## Prompt 29: Stripe Billing Backend

```
Read SAAS_TRANSFORMATION_PLAN.md sections 6.1 (BILLING), 11.2 (Week 13-16), 12.1, 12.2.

### 1. Stripe setup

Add dep: `stripe`. Add env vars:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FREE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
STRIPE_PRICE_AI_OVERAGE=price_... (metered, per 1K tokens)
FRONTEND_URL=http://localhost:5173
```

Add to config/env.ts schema.

Create `saas/src/config/stripe.ts` — export configured Stripe client instance.

### 2. Plans configuration

Create `saas/src/modules/billing/plans.config.ts`:

```typescript
export const PLANS = {
  free: { name: 'Free', stripeKey: 'STRIPE_PRICE_FREE', maxEvaluationsMo: 10, maxScansMo: 2, maxPdfsMo: 5, maxMembers: 1, maxCvVersions: 1 },
  pro: { name: 'Pro', stripeKey: 'STRIPE_PRICE_PRO', maxEvaluationsMo: 100, maxScansMo: 20, maxPdfsMo: 50, maxMembers: 1, maxCvVersions: 5 },
  team: { name: 'Team', stripeKey: 'STRIPE_PRICE_TEAM', maxEvaluationsMo: 500, maxScansMo: 100, maxPdfsMo: 250, maxMembers: 10, maxCvVersions: 20 },
  enterprise: { name: 'Enterprise', stripeKey: null, maxEvaluationsMo: 999999, maxScansMo: 999999, maxPdfsMo: 999999, maxMembers: 999999, maxCvVersions: 999999 },
} as const;
```

### 3. saas/src/modules/billing/billing.service.ts

- `getOrCreateCustomer(orgId)` — if org.stripe_customer_id exists return it. Otherwise create Stripe customer with metadata {orgId, orgSlug}, save to org, return.
- `createCheckoutSession(orgId, planKey, returnUrl)` — owner only. Creates Stripe Checkout subscription session for the price. success_url and cancel_url use returnUrl with appended `?status=success|cancelled`. Returns checkout URL.
- `createPortalSession(orgId, returnUrl)` — owner only. Creates Stripe Customer Portal session. Returns URL.
- `applyPlanToOrg(orgId, planKey)` — update org.plan, max_evaluations_mo, max_scans_mo, etc. from PLANS[planKey].
- `getUsage(orgId, period?)` — return usage_records row for current period (default) or specified period, plus computed remaining quota.
- `listInvoices(orgId)` — call Stripe invoices.list for the customer.

### 4. Webhook handler

`saas/src/modules/billing/billing.webhook.ts`:
- Fastify route `POST /api/v1/billing/webhook` — no auth, raw body, signature verified via stripe.webhooks.constructEvent
- Handle events:
  - `checkout.session.completed` → find org by customer ID, resolve price → plan, applyPlanToOrg, store subscription_id, notify owners
  - `customer.subscription.updated` → if plan changed, applyPlanToOrg
  - `customer.subscription.deleted` → applyPlanToOrg(orgId, 'free')
  - `invoice.payment_failed` → notify owners (org.notify type='billing.payment_failed')
  - `invoice.paid` → audit log

Fastify needs raw body for webhook signature: add per-route content type parser or use @fastify/raw-body for that route.

### 5. Quota enforcement middleware

Create `saas/src/shared/quota.middleware.ts`:
- `requireQuota(taskType: 'evaluation'|'scan'|'pdf')` — preHandler. Checks usage_records for current period vs org's max_*_mo. If at 100%, return 402 PAYMENT_REQUIRED with {code, message, current, limit, planKey}. If at 80% emits soft warning header `X-Quota-Warning`.

Apply this middleware to:
- POST /api/v1/evaluations → requireQuota('evaluation')
- POST /api/v1/evaluations/batch → requireQuota('evaluation') (and check items.length doesn't exceed remaining; partial rejection)
- POST /api/v1/scanner/run → requireQuota('scan')
- POST /api/v1/pdf/generate → requireQuota('pdf')

Cost-tracker `checkLimits` already exists from Prompt 6/10 — wire the middleware on top so HTTP layer rejects cleanly with 402.

### 6. Billing routes

- `GET /api/v1/billing/usage` — requireAuth, requireOrg. Current period usage + quotas + plan.
- `GET /api/v1/billing/invoices` — requireAuth, requireOrg, requireOrgRole('owner', 'admin').
- `POST /api/v1/billing/checkout` — requireAuth, requireOrg, requireOrgRole('owner'). Body: {planKey, returnUrl}. Return checkout URL.
- `POST /api/v1/billing/portal` — requireAuth, requireOrg, requireOrgRole('owner'). Body: {returnUrl}. Return portal URL.
- `GET /api/v1/billing/plan` — requireAuth, requireOrg. Return current plan details + limits.
- `POST /api/v1/billing/webhook` — public, raw body. Stripe webhook.

### 7. Tests

`saas/tests/modules/billing.test.ts`:
- Webhook signature verification: tampered payload rejected
- checkout.session.completed → org plan updated, limits applied
- subscription.deleted → org downgraded to free
- Quota middleware: at limit returns 402

Use Stripe's mock event payloads or a Stripe fixture library.

Manual (Stripe test mode):
1. Stripe CLI: `stripe listen --forward-to localhost:3000/api/v1/billing/webhook`
2. POST /api/v1/billing/checkout with planKey=pro → open URL → use test card 4242...
3. Verify webhook fires → org plan='pro' → limits updated
4. Generate 11 evaluations on free plan → 11th returns 402
```

---

## Prompt 30: Billing UI + Plan Limits Display

```
Billing backend is wired. Now build the Billing UI.

### 1. API hooks — saas/frontend/src/api/billing.ts

- `useBillingUsage()`, `useBillingPlan()`, `useBillingInvoices()`, `useCreateCheckout()` mutation, `useCreatePortal()` mutation.

### 2. saas/frontend/src/pages/Billing.tsx

Sections:
**Current Plan**
- Plan badge (Free/Pro/Team/Enterprise)
- Monthly price
- "Manage Subscription" button (owner only) → calls createPortal → window.location.href = url

**Usage This Period**
- Progress bars for each metric: Evaluations X / Y, Scans X / Y, PDFs X / Y, Members X / Y
- Bar color: <70% green, 70-90% yellow, >90% red
- Reset date shown ("Resets in 12 days")
- AI cost this period (small, info)

**Plans Comparison Table**
- Free / Pro / Team / Enterprise columns with feature checkmarks/quotas
- Highlight current plan
- "Upgrade" / "Downgrade" / "Contact Sales" CTAs (owner only) → checkout

**Invoices**
- List of past invoices (Stripe): date, amount, status, download PDF link (uses Stripe hosted URL)

### 3. Update Settings page

Add "Billing" link to /billing prominently.

### 4. Quota awareness

Update API client (saas/frontend/src/api/client.ts):
- Response interceptor: if 402, capture `error.details.planKey` and show a global modal: "You've hit your {metric} limit on the {plan} plan. Upgrade to continue." with "View Plans" button (links to /billing)
- Read `X-Quota-Warning` header: if present, push a toast "You're at 80% of your {metric} quota this month."

Update NewEvaluation page:
- Before submitting, check useBillingUsage data. If at/over limit, disable submit button with hint text. Otherwise allow.

Update Scanner page: same pattern for scan quota.

### 5. Onboarding integration

Add a final optional step to OnboardingWizard: "Start free" (default) vs "Compare plans". Not pushy.

### 6. Manual test

1. /billing → see Free plan, usage 0/10 evaluations
2. Submit 8 evaluations → bars yellow, warning toast on each new request
3. Submit 10 → bar red. 11th → modal upgrade prompt
4. Click Upgrade Pro → checkout → use Stripe test card
5. After redirect, /billing shows Pro plan, limits expanded
6. Click Manage Subscription → Stripe portal opens
7. Cancel subscription via portal → webhook downgrades to Free → /billing reflects
```

---

## Prompt 31: Multi-Provider AI (OpenAI + Anthropic) + Per-Org Config

```
Read SAAS_TRANSFORMATION_PLAN.md section 7 and 11.3 (Week 21-28).

The AI abstraction was built in Prompt 6 (AIProvider interface + DeepSeekProvider). Now add OpenAI and Anthropic, and a per-org provider config.

### 1. Provider implementations

`saas/src/modules/ai/ai.openai.ts` — OpenAIProvider:
- Uses native fetch against https://api.openai.com/v1/chat/completions
- Default model: 'gpt-4o-mini' (configurable)
- Pricing: gpt-4o-mini ~$0.15/M input, ~$0.60/M output; gpt-4o ~$2.50/M input, ~$10/M output
- Reads OPENAI_API_KEY from env or from `org.settings.ai.openai_api_key` (encrypted)
- Implements evaluate() and generateText() same shape as DeepSeek
- Retry on 429/500 (exponential backoff), 120s timeout

`saas/src/modules/ai/ai.anthropic.ts` — AnthropicProvider:
- Uses native fetch against https://api.anthropic.com/v1/messages
- Header: `x-api-key`, `anthropic-version: 2023-06-01`
- Default model: 'claude-haiku-4-5-20251001' (configurable)
- Pricing: read from a constants map (claude-haiku-4-5 ~$0.80/M in / ~$4/M out; claude-sonnet-4-6 ~$3/M in / ~$15/M out)
- Reads ANTHROPIC_API_KEY from env or org.settings
- Note: Anthropic API uses {system, messages: [{role, content}]} shape — system is top-level, not in messages

### 2. Encrypt org-stored API keys

Add to env: `ENCRYPTION_KEY` (32-byte hex). Use Node's crypto.createCipheriv with aes-256-gcm.

Create `saas/src/shared/crypto.ts`:
- `encrypt(plaintext): string` — returns base64(iv + ciphertext + authTag)
- `decrypt(ciphertext): string`

When persisting per-org provider keys to org.settings, encrypt them. When reading at provider instantiation, decrypt.

### 3. Update ai.router.ts

- `getProvider(orgId, providerName?)` —
  1. Resolve provider name: explicit arg > org.settings.ai.default_provider > env.DEFAULT_AI_PROVIDER ('deepseek')
  2. Resolve API key: org.settings.ai[provider].api_key (decrypted) > env vars
  3. Resolve model: org.settings.ai[provider].model > provider default
  4. Cache per-(orgId, provider) for 5 min
  5. Return provider instance

Plan tier enforcement: Free plan → DeepSeek only. Pro → DeepSeek + Gemini (skip if not implemented, fall through to OpenAI as substitute) + OpenAI. Team/Enterprise → all providers. Enforce in route layer.

### 4. Per-org AI config routes

Add `saas/src/modules/ai/ai-config.routes.ts`:
- `GET /api/v1/ai/config` — requireAuth, requireOrg. Return safe view (provider names, models, has_key boolean per provider, default_provider). Never return raw keys.
- `PUT /api/v1/ai/config` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: `{defaultProvider?, providers?: {[name]: {apiKey?, model?}}}`. Update org.settings.ai. Encrypt keys.
- `POST /api/v1/ai/test` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {provider}. Sends a 1-token ping. Returns {ok, latency, error?}.

### 5. Update workers

Evaluation worker, batch worker, etc. now resolve provider per-org via getProvider(orgId). Cost-tracker logs the actual provider used.

### 6. Tests

`saas/tests/modules/ai-providers.test.ts`:
- Mock OpenAI endpoint → evaluate returns parsed report
- Mock Anthropic endpoint → same
- getProvider resolution priority correct
- Plan tier denies free user from selecting OpenAI

`saas/tests/shared/crypto.test.ts`:
- Encrypt/decrypt round-trip
- Tampered ciphertext fails

Manual:
1. As Pro org owner, PUT /api/v1/ai/config with {defaultProvider: 'openai', providers: {openai: {apiKey: 'sk-...'}}}
2. POST /api/v1/ai/test with provider=openai → ok: true
3. Submit evaluation → worker uses OpenAI
4. /api/v1/admin/ai/usage → breakdown shows openai usage
```

---

## Prompt 32: Prompt Template Management + AI Cost Dashboard

```
Build org-customizable prompt templates and a cost dashboard.

### 1. Prompt template CRUD

`saas/src/modules/ai/prompt-templates.service.ts`:
- `listTemplates(orgId)` — return all templates where org_id IN (null, orgId). System ones marked `isSystem: true`.
- `getTemplate(id, orgId)` — verify accessible (org-owned or system).
- `createTemplate(orgId, data: {name, language, content, basedOnId?})` — org-scoped only. If basedOnId, version = system+1. Else version=1.
- `updateTemplate(id, orgId, data)` — only org-owned. Increment version on content change. Cannot edit system.
- `deleteTemplate(id, orgId)` — only org-owned. Hard delete.
- `setActiveTemplate(orgId, name, language, templateId)` — store in org.settings.prompts[name][language] = templateId. Override system default for this org.
- `getActiveTemplate(orgId, name, language)` — read org override, fallback to system. Used by buildEvalPrompt() — update prompt.registry.ts to consult this.

### 2. Routes — saas/src/modules/ai/prompt-templates.routes.ts

- `GET /api/v1/prompts` — requireAuth, requireOrg. List org + system templates.
- `GET /api/v1/prompts/:id` — requireAuth, requireOrg. Get.
- `POST /api/v1/prompts` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Body: {name, language, content, basedOnId?}. Create.
- `PUT /api/v1/prompts/:id` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Update.
- `DELETE /api/v1/prompts/:id` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Delete.
- `POST /api/v1/prompts/:id/activate` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Set as active for {name, language}.
- `POST /api/v1/prompts/:id/test` — requireAuth, requireOrg. Body: {jdText, cvContent}. Runs a one-off evaluation against this template using current org provider. Returns parsed result + token+cost. Does NOT save to applications/evaluations tables.

### 3. AI cost dashboard backend

Extend `saas/src/modules/admin/admin.routes.ts`:
- `GET /api/v1/admin/ai/usage` — requireAuth, requireRole('admin', 'superadmin'). Query: ?orgId=&from=&to=&groupBy=provider|model|task_type|org|day. Aggregate ai_tasks rows: tokens_in, tokens_out, cost_usd, latency_ms, count. Return list of buckets.
- `GET /api/v1/admin/ai/forecast` — requireAuth, requireRole('admin', 'superadmin'). Project end-of-month spend using last-7-day rate. Return {currentMtdCost, projectedMonthCost, byOrg: [...]}.

Per-org version (non-admin):
- `GET /api/v1/ai/usage` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Same shape but scoped to org. Org owners see their own usage breakdown.

### 4. Frontend — Prompt template UI

API hooks `saas/frontend/src/api/prompts.ts`: CRUD + activate + test.

Page `saas/frontend/src/pages/PromptTemplates.tsx`:
- List grouped by name (shared, oferta, apply, etc.) with language tabs
- Each row: version, last updated, is_active, is_system badge
- Actions: View, Fork (create org copy based on system), Edit, Activate, Delete
- Editor modal: side-by-side Markdown editor (textarea) + rendered preview
- "Test" tab in editor: paste sample JD + CV, run, see parsed score + report + token cost

Add nav item "Prompts" (owner/admin only).

### 5. Frontend — AI cost dashboard

API hooks `saas/frontend/src/api/ai-usage.ts`: useOrgAiUsage(filters), useAdminAiUsage(filters), useAdminAiForecast().

Page `saas/frontend/src/pages/AICostDashboard.tsx` (owner/admin):
- KPI strip: This Month Cost, Projected Cost, Avg Cost per Eval, Total Tokens
- Bar chart: Cost by Provider (stacked by model)
- Line chart: Daily cost over last 30 days (with projection dashed line)
- Table: Top tasks by cost (task_type, count, total cost, avg latency)
- Filter bar: date range, provider, model

Admin variant `saas/frontend/src/pages/AdminAIDashboard.tsx` (superadmin only): same but with `groupBy=org` option to compare orgs.

### 6. Audit + alerts

- Audit log `ai.template_created`, `ai.template_updated`, `ai.template_activated`
- Cost alert: if any org projects > $X/month (configurable), notify org owner via notification

### 7. Tests

- Activate template → buildEvalPrompt for that org uses it; other orgs unaffected
- Test endpoint does NOT touch applications/evaluations tables
- Cost aggregation correct over mocked ai_tasks rows
- Forecast calculation matches simple last-7-day extrapolation

Manual:
1. /prompts → fork the "oferta" template → edit (e.g., emphasize remote-friendliness more) → Activate
2. Submit a fresh evaluation → verify the custom template's bias shows in the report
3. /ai-cost → see breakdown by provider after running several evals across providers
```

---

## Prompt 33: AI Admin Tools (Smart Dedup, Anomaly Detection, Cost Caps)

```
Read SAAS_TRANSFORMATION_PLAN.md sections 7.4, 11.3 (Week 21-28), and 19.5 (Cost Caps).

Final prompt: AI-powered admin tools that operate ON the system's data using AI as a backend tool — not chatbots.

### 1. Smart dedup (embedding-based)

Use the provider's embedding endpoint (DeepSeek doesn't have one — use OpenAI text-embedding-3-small as default for this feature; document the cost: ~$0.02/M tokens).

Add to ai.openai.ts: `embed(texts: string[]): Promise<{vectors: number[][], usage}>`.

`saas/src/modules/admin-ai/dedup.service.ts`:
- `computeApplicationFingerprint(application)` — concatenate company + role + key JD bullets (from evaluation gaps + tldr). Embed.
- `findSimilarApplications(orgId, threshold = 0.92, limit = 50)` —
  1. Fetch all applications for org with their primary evaluation
  2. Compute embeddings (cached in metadata.embedding to avoid recompute)
  3. Pairwise cosine similarity
  4. Return clusters above threshold
- `findSimilarScanResults(orgId, threshold = 0.95)` — same for scan_results titles + company + location
- `acceptDedupSuggestion(orgId, primaryId, duplicateIds)` — mark duplicates: applications → set status='Discarded', notes='Auto-deduped from {primaryId}'; scan_results → status='skipped'
- `rejectDedupSuggestion(orgId, primaryId, duplicateIds)` — mark them as reviewed in metadata so they don't surface again

Routes:
- `GET /api/v1/admin-ai/dedup/applications` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Returns suggestion clusters.
- `GET /api/v1/admin-ai/dedup/scan-results` — same.
- `POST /api/v1/admin-ai/dedup/accept` — Body: {kind: 'applications'|'scan_results', primaryId, duplicateIds}.
- `POST /api/v1/admin-ai/dedup/reject` — same shape.

### 2. Anomaly detection on scan results

`saas/src/modules/admin-ai/anomaly.service.ts`:
- `detectScannerAnomalies(orgId)` — for each portal, compute trailing 7-day vs prior 7-day stats. Flag:
  - Sudden drop in result count (>50% decrease) → "Portal may have changed API or been blocked"
  - Sudden spike (>3x average) → "Possible scraping issue, many duplicates expected"
  - All-zero result for 3 consecutive scans → "Portal likely broken"
  - Suspicious titles (e.g., all listings under "Senior" disappear) → "Filter may be over-restrictive"
- Returns: `{anomalies: [{portalId, portalName, type, severity, evidence: {...}}]}`

Run as a daily cron job. On any anomaly, create notification for org owners + admins.

Route:
- `GET /api/v1/admin-ai/anomalies` — requireAuth, requireOrg, requireOrgRole('owner', 'admin'). Current anomalies for org's portals.

### 3. Cost caps (hard limits beyond plan quotas)

Add to org schema (settings.ai.cost_cap_usd_mo): a per-org monthly USD cap. Default null (no cap; plan quota is the only limit).

Add to `quota.middleware.ts`:
- After plan quota check, also check `usage_records.ai_cost_total >= settings.ai.cost_cap_usd_mo` → return 402 with cap-reached message.
- At 80% of cap, set warning header.

Per-task cap (defense-in-depth): a single evaluation should never cost > $1 (configurable). Add to ai providers: if response usage.cost > maxTaskCost, log critical error, mark task failed.

Route:
- `PUT /api/v1/ai/cost-cap` — requireAuth, requireOrg, requireOrgRole('owner'). Body: {capUsd: number | null}.

### 4. Evaluation quality feedback loop

Track outcomes vs predicted score:
`saas/src/modules/admin-ai/calibration.service.ts`:
- `recordOutcome(applicationId, outcome: 'rejected'|'responded'|'interview'|'offer')` — already implicit via application.status updates. Aggregate.
- `getCalibration(orgId)` — for each 0.5-wide score bucket: count applications, count outcomes by type. Compute "calibration error" = abs(predicted_offer_rate - actual_offer_rate).
- Return `{buckets: [{scoreRange, sampleSize, actualOfferRate, predictedOfferRate, calibrationError}], overallError}`

Route:
- `GET /api/v1/admin-ai/calibration` — requireAuth, requireOrg.

Frontend: small chart on AI cost dashboard showing "Are your scores predictive?" — bar chart of predicted vs actual outcome rates.

### 5. Cost forecasting per org

Extend `/api/v1/billing/usage` response with:
- `projectedMonthEndCost` — extrapolate from last 7 days
- `projectedQuotaExhaustionDate` — at current pace, when evaluations/scans hit plan limit
- `recommendedPlan` — if projected to exceed for 2+ months, suggest the next tier

### 6. Frontend — Admin Tools page

Create `saas/frontend/src/pages/AdminTools.tsx` (owner/admin):
- Tab: **Dedup Suggestions**
  - Two sections: Applications, Scan Results
  - Each shows clusters: primary item highlighted, suggested duplicates with similarity %, "Accept" / "Reject" buttons
- Tab: **Anomalies**
  - Table: Portal, Anomaly Type, Severity, Evidence, Action button
  - Dismiss button per row
- Tab: **Calibration**
  - Chart: predicted vs actual offer rates per score bucket
  - Overall calibration error metric
  - "Last calibrated N applications ago" indicator
- Tab: **Cost Cap**
  - Current cap input (USD/month, blank = no cap)
  - Current spend bar
  - Save button

Add nav "AI Tools" (owner/admin only).

### 7. Cron registrations

In workers/index.ts, add daily cron (BullMQ repeat) for:
- Anomaly detection per org (small orgs daily, large orgs hourly)
- Cost projection refresh

### 8. Tests

- Dedup: two near-identical applications → flagged as cluster. Accept → duplicates marked Discarded.
- Anomaly: simulate portal with 0 results for 3 scans → anomaly raised with severity high.
- Cost cap: org at 100% of cap → next evaluation submission returns 402.
- Calibration: synthetic data with score 4.5 → 70% offers → bucket calibration error reflects accuracy.

Manual:
1. Create two applications for same company / very similar roles → dedup tab surfaces them → accept
2. Disable a portal so it returns nothing for 3 scheduled scans → anomalies tab populates
3. Set cost cap $1 → submit evaluations until cap reached → 11th blocked with cap message
4. /ai-tools → calibration tab → see bucket chart

### 9. Closeout

After this prompt, run a final integration pass:
- All Phase 2 + Phase 3 features documented in saas/README.md (extend the table of contents)
- Update CHANGELOG (or docs/CHANGELOG.md) with version bumps
- Run full test suite: `cd saas && npx vitest run`
- Run build: `npm run build && cd frontend && npm run build`
- Smoke test: docker compose up; complete one full evaluation under the Pro plan with all features touched

The platform is now feature-complete for the Phase 1 + 2 + 3 roadmap.
```

---

## Updated Summary: Prompt Execution Order

| # | Prompt | What It Builds | Estimated Time |
|---|--------|----------------|----------------|
| 1 | Project Scaffolding | Fastify, Docker, configs, health check | 30 min |
| 2 | Database Schema | All 19 tables with Drizzle | 20 min |
| 3 | Auth Module | Register, login, sessions, API keys | 30 min |
| 4 | Users/Orgs/Profiles | User management, orgs, profiles | 25 min |
| 5 | CVs & Applications | CV CRUD, applications CRUD, import | 25 min |
| 6 | AI Provider | DeepSeek integration, prompt registry | 30 min |
| 7 | Evaluations | Full eval flow: queue → worker → report | 40 min |
| 8 | PDF Generation | Playwright PDF worker, S3 upload | 30 min |
| 9 | Pipeline | URL inbox, process items | 20 min |
| 10 | Audit & Usage | Audit log, usage tracking, admin stats | 20 min |
| 11 | React Setup | Vite, auth, layout, routing | 30 min |
| 12 | Dashboard & Apps | KPI cards, applications table | 30 min |
| 13 | Evaluation Pages | Submit eval, view report, PDF download | 35 min |
| 14 | Profile/Pipeline/Settings | Profile editor, pipeline UI, settings | 30 min |
| 15 | Onboarding Wizard | 5-step onboarding flow | 25 min |
| 16 | Business Logic Ports | Port pure functions from existing code | 20 min |
| 17 | Seed & Migration | Demo data, import from CLI files | 20 min |
| 18 | CI/CD & Docker | Dockerfiles, GitHub Actions, production | 20 min |
| 19 | Integration Test | End-to-end MVP test, polish, README | 40 min |
| 20 | Portals Module | CRUD, ATS auto-detection, YAML import | 30 min |
| 21 | Scanner Worker | Greenhouse/Ashby/Lever fetch + dedup | 40 min |
| 22 | Scanner UI + Cron | Portals page, scanner page, schedule | 35 min |
| 23 | Batch Eval + Liveness | Batch endpoint, liveness checker worker | 35 min |
| 24 | Follow-ups | Cadence calculator, follow-up tracking | 25 min |
| 25 | Analytics Backend | Funnel, patterns, score threshold | 30 min |
| 26 | Analytics Frontend | Funnel/patterns/trends charts | 35 min |
| 27 | Invitations + RBAC | Token-based invites, role enforcement | 40 min |
| 28 | Notifications + Activity | In-app bell, activity feed | 30 min |
| 29 | Stripe Billing Backend | Checkout, portal, webhooks, quotas | 45 min |
| 30 | Billing UI | Usage bars, plan comparison, invoices | 30 min |
| 31 | Multi-Provider AI | OpenAI + Anthropic + per-org config | 40 min |
| 32 | Prompts + Cost Dashboard | Template management, AI cost views | 40 min |
| 33 | AI Admin Tools | Dedup, anomalies, cost caps, calibration | 45 min |

**Total estimated: ~17-20 hours of Claude execution time**

---

## What's Beyond Prompt 33

Phase 4 (Scale + Marketplace) work, not included as prompts here:

- SSO (SAML/OIDC) for enterprise
- Webhooks + WebSocket real-time updates
- Public SDK (TS + Python) + OpenAPI spec
- Template marketplace
- Multi-region deployment
- SOC 2 prep

These are documented in `SAAS_TRANSFORMATION_PLAN.md` sections 11.3 (Week 29-36) and 11.4. Open a follow-up planning conversation once Prompt 33 ships.
