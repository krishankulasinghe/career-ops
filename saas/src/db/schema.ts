import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  date,
  jsonb,
  decimal,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 20 }).default('user').notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
});

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

// ─── Organizations ───────────────────────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  settings: jsonb('settings').default({}).notNull(),
  maxMembers: integer('max_members').default(1).notNull(),
  maxEvaluationsMo: integer('max_evaluations_mo').default(20).notNull(),
  maxScansMo: integer('max_scans_mo').default(5).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 8 }).notNull(),
  name: varchar('name', { length: 100 }),
  scopes: text('scopes').array(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;

// ─── Memberships ─────────────────────────────────────────────────────────────

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.orgId)],
);

export type Membership = InferSelectModel<typeof memberships>;
export type NewMembership = InferInsertModel<typeof memberships>;

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }),
  emailContact: varchar('email_contact', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  timezone: varchar('timezone', { length: 50 }),
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  githubUrl: text('github_url'),
  targetRoles: jsonb('target_roles'),
  compensation: jsonb('compensation'),
  narrative: jsonb('narrative'),
  locationPrefs: jsonb('location_prefs'),
  archetypes: jsonb('archetypes'),
  writingStyle: jsonb('writing_style'),
  cvFormat: varchar('cv_format', { length: 20 }).default('html'),
  customConfig: jsonb('custom_config').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

// ─── CVs ─────────────────────────────────────────────────────────────────────

export const cvs = pgTable('cvs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).default('default').notNull(),
  contentMd: text('content_md').notNull(),
  version: integer('version').default(1).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Cv = InferSelectModel<typeof cvs>;
export type NewCv = InferInsertModel<typeof cvs>;

// ─── CV Templates ────────────────────────────────────────────────────────────

export const cvTemplates = pgTable('cv_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  previewUrl: varchar('preview_url', { length: 2048 }),
  contentHtml: text('content_html'),
  contentTex: text('content_tex'),
  isDefault: boolean('is_default').default(false).notNull(),
  visibility: varchar('visibility', { length: 20 }).default('private').notNull(),
  moderationStatus: varchar('moderation_status', { length: 20 }).default('approved').notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  ratingCount: integer('rating_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type CvTemplate = InferSelectModel<typeof cvTemplates>;
export type NewCvTemplate = InferInsertModel<typeof cvTemplates>;

// ─── Applications ────────────────────────────────────────────────────────────

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    seqNumber: integer('seq_number').notNull(),
    date: date('date').notNull(),
    company: varchar('company', { length: 255 }).notNull(),
    role: varchar('role', { length: 255 }).notNull(),
    score: decimal('score', { precision: 3, scale: 1 }),
    status: varchar('status', { length: 20 }).default('Evaluated').notNull(),
    hasPdf: boolean('has_pdf').default(false).notNull(),
    pdfUrl: text('pdf_url'),
    notes: text('notes'),
    jobUrl: text('job_url'),
    source: varchar('source', { length: 50 }),
    archetype: varchar('archetype', { length: 100 }),
    legitimacy: varchar('legitimacy', { length: 50 }),
    metadata: jsonb('metadata').default({}).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.userId, t.company, t.role),
    index('applications_user_status_idx').on(t.userId, t.status),
    index('applications_org_idx').on(t.orgId),
    index('applications_score_idx').on(t.score),
  ],
);

export type Application = InferSelectModel<typeof applications>;
export type NewApplication = InferInsertModel<typeof applications>;

// ─── Evaluations ─────────────────────────────────────────────────────────────

export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    reportNumber: integer('report_number').notNull(),
    reportContent: text('report_content').notNull(),
    jdText: text('jd_text'),
    jdSnapshotUrl: text('jd_snapshot_url'),
    archetype: varchar('archetype', { length: 100 }),
    seniority: varchar('seniority', { length: 50 }),
    remotePolicy: varchar('remote_policy', { length: 100 }),
    teamSize: varchar('team_size', { length: 100 }),
    domain: varchar('domain', { length: 100 }),
    compEstimate: varchar('comp_estimate', { length: 100 }),
    tlDr: text('tl_dr'),
    scoreCvMatch: decimal('score_cv_match', { precision: 3, scale: 1 }),
    scoreNorthStar: decimal('score_north_star', { precision: 3, scale: 1 }),
    scoreComp: decimal('score_comp', { precision: 3, scale: 1 }),
    scoreCultural: decimal('score_cultural', { precision: 3, scale: 1 }),
    scoreRedFlags: decimal('score_red_flags', { precision: 3, scale: 1 }),
    scoreGlobal: decimal('score_global', { precision: 3, scale: 1 }),
    legitimacyTier: varchar('legitimacy_tier', { length: 50 }),
    gaps: jsonb('gaps'),
    aiProvider: varchar('ai_provider', { length: 50 }),
    aiModel: varchar('ai_model', { length: 100 }),
    aiTokensIn: integer('ai_tokens_in'),
    aiTokensOut: integer('ai_tokens_out'),
    aiCostUsd: decimal('ai_cost_usd', { precision: 10, scale: 6 }),
    aiLatencyMs: integer('ai_latency_ms'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('evaluations_application_idx').on(t.applicationId)],
);

export type Evaluation = InferSelectModel<typeof evaluations>;
export type NewEvaluation = InferInsertModel<typeof evaluations>;

// ─── Portals ─────────────────────────────────────────────────────────────────

export const portals = pgTable('portals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  careersUrl: text('careers_url'),
  apiType: varchar('api_type', { length: 20 }),
  apiUrl: text('api_url'),
  enabled: boolean('enabled').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Portal = InferSelectModel<typeof portals>;
export type NewPortal = InferInsertModel<typeof portals>;

// ─── Scan Results ────────────────────────────────────────────────────────────

export const scanResults = pgTable(
  'scan_results',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    portalId: uuid('portal_id').references(() => portals.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    company: varchar('company', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    source: varchar('source', { length: 50 }),
    status: varchar('status', { length: 20 }).default('added').notNull(),
    firstSeen: date('first_seen').notNull(),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.orgId, t.url)],
);

export type ScanResult = InferSelectModel<typeof scanResults>;
export type NewScanResult = InferInsertModel<typeof scanResults>;

// ─── Title Filters ───────────────────────────────────────────────────────────

export const titleFilters = pgTable('title_filters', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 10 }).notNull(),
  keyword: varchar('keyword', { length: 255 }).notNull(),
});

export type TitleFilter = InferSelectModel<typeof titleFilters>;
export type NewTitleFilter = InferInsertModel<typeof titleFilters>;

// ─── Pipeline Items ──────────────────────────────────────────────────────────

export const pipelineItems = pgTable('pipeline_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  company: varchar('company', { length: 255 }),
  title: varchar('title', { length: 500 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  source: varchar('source', { length: 50 }),
  deletedAt: timestamp('deleted_at'),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

export type PipelineItem = InferSelectModel<typeof pipelineItems>;
export type NewPipelineItem = InferInsertModel<typeof pipelineItems>;

// ─── Follow Ups ──────────────────────────────────────────────────────────────

export const followUps = pgTable('follow_ups', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  channel: varchar('channel', { length: 50 }),
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type FollowUp = InferSelectModel<typeof followUps>;
export type NewFollowUp = InferInsertModel<typeof followUps>;

// ─── AI Tasks ────────────────────────────────────────────────────────────────

export const aiTasks = pgTable(
  'ai_tasks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    taskType: varchar('task_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    input: jsonb('input'),
    output: jsonb('output'),
    provider: varchar('provider', { length: 50 }),
    model: varchar('model', { length: 100 }),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costUsd: decimal('cost_usd', { precision: 10, scale: 6 }),
    latencyMs: integer('latency_ms'),
    errorMsg: text('error_msg'),
    retryCount: integer('retry_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (t) => [
    index('ai_tasks_org_status_idx').on(t.orgId, t.status),
    index('ai_tasks_type_idx').on(t.taskType),
  ],
);

export type AiTask = InferSelectModel<typeof aiTasks>;
export type NewAiTask = InferInsertModel<typeof aiTasks>;

// ─── Prompt Templates ────────────────────────────────────────────────────────

export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  version: integer('version').default(1).notNull(),
  language: varchar('language', { length: 10 }).default('en').notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  visibility: varchar('visibility', { length: 20 }).default('private').notNull(),
  moderationStatus: varchar('moderation_status', { length: 20 }).default('approved').notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  ratingCount: integer('rating_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PromptTemplate = InferSelectModel<typeof promptTemplates>;
export type NewPromptTemplate = InferInsertModel<typeof promptTemplates>;

// ─── Interview Prep ───────────────────────────────────────────────────────────

export const storyBank = pgTable('story_bank', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  situation: text('situation').notNull(),
  task: text('task').notNull(),
  action: text('action').notNull(),
  result: text('result').notNull(),
  reflection: text('reflection'),
  tags: jsonb('tags').default([]).notNull(),
  usedInApps: jsonb('used_in_apps').default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type StoryBankEntry = InferSelectModel<typeof storyBank>;
export type NewStoryBankEntry = InferInsertModel<typeof storyBank>;

export const companyIntel = pgTable('company_intel', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  contentMd: text('content_md').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

export type CompanyIntel = InferSelectModel<typeof companyIntel>;
export type NewCompanyIntel = InferInsertModel<typeof companyIntel>;

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: jsonb('events').default([]).notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  active: boolean('active').default(true).notNull(),
  lastDelivery: timestamp('last_delivery'),
  lastStatus: integer('last_status'),
  failureCount: integer('failure_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Webhook = InferSelectModel<typeof webhooks>;
export type NewWebhook = InferInsertModel<typeof webhooks>;

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  webhookId: uuid('webhook_id')
    .notNull()
    .references(() => webhooks.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  attempt: integer('attempt').default(1).notNull(),
  success: boolean('success').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type WebhookDelivery = InferSelectModel<typeof webhookDeliveries>;
export type NewWebhookDelivery = InferInsertModel<typeof webhookDeliveries>;

// ─── Evaluation Modes ────────────────────────────────────────────────────────

export const evaluationModes = pgTable('evaluation_modes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  weights: jsonb('weights').default({}).notNull(),
  customBlocks: jsonb('custom_blocks').default([]).notNull(),
  promptTemplateId: uuid('prompt_template_id').references(() => promptTemplates.id, { onDelete: 'set null' }),
  defaultArchetype: varchar('default_archetype', { length: 100 }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type EvaluationMode = InferSelectModel<typeof evaluationModes>;
export type NewEvaluationMode = InferInsertModel<typeof evaluationModes>;

// ─── SSO Configurations ──────────────────────────────────────────────────────

export const ssoConfigs = pgTable('sso_configs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  protocol: varchar('protocol', { length: 10 }).notNull().default('oidc'),
  idpMetadataUrl: text('idp_metadata_url'),
  entityId: varchar('entity_id', { length: 500 }),
  acsUrl: varchar('acs_url', { length: 500 }),
  clientId: varchar('client_id', { length: 255 }),
  clientSecretEncrypted: text('client_secret_encrypted'),
  issuer: varchar('issuer', { length: 500 }),
  forceSso: boolean('force_sso').default(false).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SsoConfig = InferSelectModel<typeof ssoConfigs>;
export type NewSsoConfig = InferInsertModel<typeof ssoConfigs>;

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').default({}).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('audit_logs_org_created_idx').on(t.orgId, t.createdAt)],
);

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

// ─── Usage Records ───────────────────────────────────────────────────────────

export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    period: date('period').notNull(),
    evaluationsCount: integer('evaluations_count').default(0).notNull(),
    scansCount: integer('scans_count').default(0).notNull(),
    pdfsCount: integer('pdfs_count').default(0).notNull(),
    aiTokensTotal: bigint('ai_tokens_total', { mode: 'number' }).default(0).notNull(),
    aiCostTotal: decimal('ai_cost_total', { precision: 10, scale: 4 }).default('0').notNull(),
    storageBytes: bigint('storage_bytes', { mode: 'number' }).default(0).notNull(),
  },
  (t) => [unique().on(t.orgId, t.period)],
);

export type UsageRecord = InferSelectModel<typeof usageRecords>;
export type NewUsageRecord = InferInsertModel<typeof usageRecords>;

// ─── Org Invitations ─────────────────────────────────────────────────────────

export const orgInvitations = pgTable('org_invitations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('member').notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type OrgInvitation = InferSelectModel<typeof orgInvitations>;
export type NewOrgInvitation = InferInsertModel<typeof orgInvitations>;

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  link: text('link'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

// ─── Template Marketplace ─────────────────────────────────────────────────────

export const templateInstalls = pgTable(
  'template_installs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').notNull(),
    templateType: varchar('template_type', { length: 20 }).notNull(), // 'cv' | 'prompt'
    installedAt: timestamp('installed_at').defaultNow().notNull(),
    rating: integer('rating'), // 1-5 stars user gave after install
    ratedAt: timestamp('rated_at'),
  },
  (t) => [
    unique().on(t.orgId, t.templateId, t.templateType),
    index('template_installs_template_idx').on(t.templateId, t.templateType),
  ],
);

export type TemplateInstall = InferSelectModel<typeof templateInstalls>;
export type NewTemplateInstall = InferInsertModel<typeof templateInstalls>;

export const templateModerationQueue = pgTable('template_moderation_queue', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull(),
  templateType: varchar('template_type', { length: 20 }).notNull(), // 'cv' | 'prompt'
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  decision: varchar('decision', { length: 20 }), // 'approved' | 'rejected'
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TemplateModerationQueue = InferSelectModel<typeof templateModerationQueue>;
export type NewTemplateModerationQueue = InferInsertModel<typeof templateModerationQueue>;
