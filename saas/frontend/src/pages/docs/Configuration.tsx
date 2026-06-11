import { Layout } from '@/components/layout/Layout';
import { IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

interface EnvVar {
  key: string;
  defaultValue: string;
  description: string;
  required: boolean;
}

const ENV_VARS: EnvVar[] = [
  { key: 'DATABASE_URL', defaultValue: 'postgresql://…', description: 'PostgreSQL connection string', required: true },
  { key: 'REDIS_URL', defaultValue: 'redis://localhost:6379', description: 'Redis connection URL for BullMQ queues', required: true },
  { key: 'SESSION_SECRET', defaultValue: '—', description: 'Secret used to sign Lucia Auth session tokens (min 32 chars)', required: true },
  { key: 'S3_ENDPOINT', defaultValue: 'http://localhost:9000', description: 'S3-compatible storage endpoint (MinIO in dev, AWS/R2 in prod)', required: true },
  { key: 'S3_ACCESS_KEY', defaultValue: 'minioadmin', description: 'S3 access key ID', required: true },
  { key: 'S3_SECRET_KEY', defaultValue: 'minioadmin', description: 'S3 secret access key', required: true },
  { key: 'S3_BUCKET', defaultValue: 'career-ops', description: 'Default S3 bucket name', required: true },
  { key: 'PORT', defaultValue: '3000', description: 'Port the Fastify API server listens on', required: false },
  { key: 'LOG_LEVEL', defaultValue: 'info', description: 'Pino log level: trace | debug | info | warn | error', required: false },
  { key: 'FRONTEND_URL', defaultValue: 'http://localhost:5173', description: 'Frontend origin — used for CORS and email links', required: false },
];

const AI_VARS: EnvVar[] = [
  { key: 'AI_PROVIDER', defaultValue: 'deepseek', description: 'Primary AI provider: deepseek | gemini', required: true },
  { key: 'DEEPSEEK_API_KEY', defaultValue: '—', description: 'DeepSeek API key (required when AI_PROVIDER=deepseek)', required: false },
  { key: 'DEEPSEEK_MODEL', defaultValue: 'deepseek-chat', description: 'DeepSeek model ID to use for evaluations', required: false },
  { key: 'GEMINI_API_KEY', defaultValue: '—', description: 'Google Gemini API key (required when AI_PROVIDER=gemini)', required: false },
  { key: 'GEMINI_MODEL', defaultValue: 'gemini-1.5-flash', description: 'Gemini model ID', required: false },
  { key: 'AI_MAX_TOKENS_OUT', defaultValue: '4096', description: 'Maximum output tokens per AI call', required: false },
  { key: 'AI_TEMPERATURE', defaultValue: '0.3', description: 'Sampling temperature (lower = more deterministic)', required: false },
];

export function ConfigurationPage() {
  return (
    <Layout title="Configuration">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="env-vars" className="docs-anchor mb-3">Environment Variables</h2>
              <p>
                All configuration is driven by environment variables, validated at startup by Zod
                in <code>src/config/env.ts</code>. The API server will refuse to start if any
                required variable is missing or invalid.
              </p>
              <p>
                Copy <code>.env.example</code> to <code>.env</code> and fill in your values.
                Never commit <code>.env</code> to source control.
              </p>

              <div className="table-responsive">
                <table className="table table-sm small mb-0">
                  <thead className="bg-200">
                    <tr>
                      <th>Variable</th>
                      <th>Default</th>
                      <th>Description</th>
                      <th className="text-center">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ENV_VARS.map((v) => (
                      <tr key={v.key}>
                        <td><code>{v.key}</code></td>
                        <td className="text-secondary">{v.defaultValue}</td>
                        <td>{v.description}</td>
                        <td className="text-center">
                          {v.required
                            ? <span className="badge bg-danger">Yes</span>
                            : <span className="badge bg-secondary-lt">No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="ai-configuration" className="docs-anchor mb-3">AI Configuration</h2>
              <p>
                Career-Ops SaaS supports pluggable AI providers via the <code>AIProvider</code>{' '}
                interface. Set <code>AI_PROVIDER</code> to select the active provider at startup.
                Both providers share the same evaluation prompt templates — switching providers
                does not change the scoring logic.
              </p>

              <div className="alert alert-info d-flex gap-2 mb-3">
                <IconInfoCircle size={16} className="mt-1 flex-shrink-0" />
                <div>
                  DeepSeek is the recommended primary provider — it delivers high evaluation
                  quality at a significantly lower cost per token than alternatives.
                  Gemini is the recommended fallback for redundancy.
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-sm small mb-0">
                  <thead className="bg-200">
                    <tr>
                      <th>Variable</th>
                      <th>Default</th>
                      <th>Description</th>
                      <th className="text-center">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AI_VARS.map((v) => (
                      <tr key={v.key}>
                        <td><code>{v.key}</code></td>
                        <td className="text-secondary">{v.defaultValue}</td>
                        <td>{v.description}</td>
                        <td className="text-center">
                          {v.required
                            ? <span className="badge bg-danger">Yes</span>
                            : <span className="badge bg-secondary-lt">No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="storage-configuration" className="docs-anchor mb-3">Storage Configuration</h2>
              <p>
                Career-Ops SaaS uses S3-compatible object storage for PDF reports, CV files, and
                attachments. In local development, MinIO (bundled in <code>docker-compose.yml</code>)
                provides S3-compatible APIs. In production, use AWS S3 or Cloudflare R2.
              </p>

              <h5 className="mt-3">Cloudflare R2 example</h5>
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<r2-access-key-id>
S3_SECRET_KEY=<r2-secret-access-key>
S3_BUCKET=career-ops-prod
S3_REGION=auto`}</code>
              </pre>

              <h5 className="mt-3">AWS S3 example</h5>
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
S3_BUCKET=career-ops-prod
S3_REGION=us-east-1`}</code>
              </pre>

              <div className="alert alert-warning d-flex gap-2 mb-0 mt-3">
                <IconAlertTriangle size={16} className="mt-1 flex-shrink-0" />
                <div>
                  All S3 object keys are prefixed with <code>{'{orgId}/{type}/{filename}'}</code>.
                  Never allow user-supplied values to compose the key path directly — always
                  construct it server-side to prevent path traversal.
                </div>
              </div>
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
                <a className="nav-link py-1 small" href="#env-vars">Environment Variables</a>
                <a className="nav-link py-1 small" href="#ai-configuration">AI Configuration</a>
                <a className="nav-link py-1 small" href="#storage-configuration">Storage Configuration</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
