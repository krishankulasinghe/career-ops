import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Integration {
  name: string;
  enabled: boolean;
  category: string;
  description: string;
  configured: boolean;
}

interface IntegrationConfig {
  enabled?: boolean;
  webhookUrl?: string;
  channelId?: string;
  boardToken?: string;
  calendarId?: string;
  apiKeyConfigured?: boolean;
  oauthConnected?: boolean;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  return res.json();
}

const INTEGRATION_ICONS: Record<string, string> = {
  slack: '💬',
  greenhouse: '🌿',
  lever: '⚙',
  ashby: '📋',
  google_calendar: '📅',
  outlook_calendar: '📆',
  sendgrid: '✉',
  resend: '📨',
};

const OAUTH_INTEGRATIONS = new Set(['google_calendar', 'outlook_calendar']);

function IntegrationModal({
  name, onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['integration-config', name],
    queryFn: () => apiFetch<IntegrationConfig>(`/api/v1/integrations/${name}`),
  });

  const save = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/api/v1/integrations/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Integration configured');
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['integration-config', name] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const displayName = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="modal modal-blur fade show d-block" tabIndex={-1} role="dialog" onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }} role="document" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {INTEGRATION_ICONS[name] ?? '🔌'} Configure {displayName}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-5 text-secondary">Loading…</div>
            ) : (
              <>
                {cfg?.apiKeyConfigured && (
                  <div className="alert alert-success small mb-3" role="alert">✓ API key configured</div>
                )}
                {cfg?.oauthConnected && (
                  <div className="alert alert-success small mb-3" role="alert">✓ OAuth connected</div>
                )}

                {OAUTH_INTEGRATIONS.has(name) ? (
                  <div className="mb-3">
                    <a
                      href={`/api/v1/integrations/${name}/connect`}
                      className="btn btn-primary"
                    >
                      {cfg?.oauthConnected ? 'Reconnect via OAuth' : 'Connect via OAuth'}
                    </a>
                  </div>
                ) : (
                  <>
                    {['slack', 'greenhouse', 'lever', 'ashby'].includes(name) && (
                      <div className="mb-3">
                        <label className="form-label fw-medium">
                          {name === 'slack' ? 'Webhook URL' : 'Webhook URL (receive events)'}
                        </label>
                        <input
                          className="form-control"
                          type="url"
                          placeholder="https://hooks.slack.com/..."
                          value={form.webhookUrl ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                        />
                      </div>
                    )}

                    {['greenhouse', 'lever', 'ashby', 'sendgrid', 'resend'].includes(name) && (
                      <div className="mb-3">
                        <label className="form-label fw-medium">API Key</label>
                        <input
                          className="form-control"
                          type="password"
                          placeholder={cfg?.apiKeyConfigured ? '••••••••••••••••' : 'Enter API key'}
                          value={form.apiKey ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                          autoComplete="off"
                        />
                      </div>
                    )}

                    {name === 'slack' && (
                      <div className="mb-3">
                        <label className="form-label fw-medium">Channel ID (optional)</label>
                        <input
                          className="form-control"
                          placeholder="C1234567890"
                          value={form.channelId ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
                        />
                      </div>
                    )}

                    {['greenhouse', 'lever', 'ashby'].includes(name) && (
                      <div className="mb-3">
                        <label className="form-label fw-medium">Board Token</label>
                        <input
                          className="form-control"
                          placeholder="Your job board token"
                          value={form.boardToken ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, boardToken: e.target.value }))}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            {!OAUTH_INTEGRATIONS.has(name) && (
              <button
                className="btn btn-primary"
                onClick={() => save.mutate(form)}
                disabled={save.isPending || isLoading}
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { id: 'ats', label: 'ATS / Job Boards' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'email', label: 'Email' },
];

export function IntegrationsPage() {
  const [configuring, setConfiguring] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiFetch<Integration[]>('/api/v1/integrations'),
  });

  const toggle = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      apiFetch(`/api/v1/integrations/${name}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <Layout title="Integrations">
      {configuring && (
        <IntegrationModal name={configuring} onClose={() => setConfiguring(null)} />
      )}

      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Integrations</h5>
                  <p className="text-secondary small mb-0">Connect Career-Ops with your existing tools and workflows</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="col-12 text-center text-secondary py-5">Loading integrations…</div>
        )}

        {CATEGORIES.map((cat) => {
          const items = (data ?? []).filter((i) => i.category === cat.id);
          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="col-12">
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0 text-secondary text-uppercase" style={{ letterSpacing: 1 }}>{cat.label}</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {items.map((item) => {
                      const displayName = item.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                      return (
                        <div key={item.name} className="col-md-6 col-xl-4">
                          <div className="card border h-100">
                            <div className="card-body d-flex align-items-start gap-3 p-3">
                              <div className="fs-2 flex-shrink-0">{INTEGRATION_ICONS[item.name] ?? '🔌'}</div>
                              <div className="flex-1 min-w-0">
                                <div className="fw-medium small">{displayName}</div>
                                <div className="text-secondary small mt-1" style={{ lineHeight: 1.4 }}>{item.description}</div>
                                {item.configured && (
                                  <div className="text-success small mt-2">✓ Configured</div>
                                )}
                              </div>
                              <div className="d-flex flex-column gap-2 align-items-end flex-shrink-0">
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => setConfiguring(item.name)}
                                >
                                  Configure
                                </button>
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`toggle-${item.name}`}
                                    checked={item.enabled}
                                    onChange={(e) => toggle.mutate({ name: item.name, enabled: e.target.checked })}
                                  />
                                  <label className="form-check-label small" htmlFor={`toggle-${item.name}`}>
                                    {item.enabled ? 'On' : 'Off'}
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
