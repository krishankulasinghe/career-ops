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

## After MVP: What's Next

After completing all 19 prompts, you have a working MVP. The next prompts (not included here) would cover:

- **Prompt 20-22:** Portal Scanner module (port scan.mjs, cron scheduling)
- **Prompt 23-24:** Batch evaluation (submit multiple JDs)
- **Prompt 25-26:** Analytics (funnel, patterns, follow-ups — port from analyze-patterns.mjs)
- **Prompt 27-28:** Team features (invitations, RBAC enforcement)
- **Prompt 29-30:** Billing (Stripe integration, plan limits)
- **Prompt 31-33:** AI admin tools (anomaly detection, smart dedup, cost dashboard)

Want me to write those too? Just ask after the MVP is complete.
