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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card" style={{ width: 460, maxWidth: '90vw' }}>
        <h3 style={{ marginTop: 0 }}>
          {INTEGRATION_ICONS[name] ?? '🔌'} Configure {name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </h3>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status indicators */}
            {cfg?.apiKeyConfigured && (
              <div style={{ fontSize: 12, color: 'var(--success)' }}>✓ API key configured</div>
            )}
            {cfg?.oauthConnected && (
              <div style={{ fontSize: 12, color: 'var(--success)' }}>✓ OAuth connected</div>
            )}

            {/* OAuth connect button */}
            {OAUTH_INTEGRATIONS.has(name) ? (
              <div>
                <a
                  href={`/api/v1/integrations/${name}/connect`}
                  className="btn btn-primary"
                  style={{ display: 'inline-block', textDecoration: 'none', fontSize: 13 }}
                >
                  {cfg?.oauthConnected ? 'Reconnect via OAuth' : 'Connect via OAuth'}
                </a>
              </div>
            ) : (
              <>
                {/* Webhook URL for Slack and ATS */}
                {['slack', 'greenhouse', 'lever', 'ashby'].includes(name) && (
                  <div className="form-group">
                    <label className="form-label">
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

                {/* API Key for ATS and email providers */}
                {['greenhouse', 'lever', 'ashby', 'sendgrid', 'resend'].includes(name) && (
                  <div className="form-group">
                    <label className="form-label">API Key</label>
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

                {/* Slack channel */}
                {name === 'slack' && (
                  <div className="form-group">
                    <label className="form-label">Channel ID (optional)</label>
                    <input
                      className="form-control"
                      placeholder="C1234567890"
                      value={form.channelId ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
                    />
                  </div>
                )}

                {/* ATS board token */}
                {['greenhouse', 'lever', 'ashby'].includes(name) && (
                  <div className="form-group">
                    <label className="form-label">Board Token</label>
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

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              {!OAUTH_INTEGRATIONS.has(name) && (
                <button
                  className="btn btn-primary"
                  onClick={() => save.mutate(form)}
                  disabled={save.isPending}
                >
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {CATEGORIES.map((cat) => {
          const items = (data ?? []).filter((i) => i.category === cat.id);
          if (items.length === 0) return null;

          return (
            <div key={cat.id}>
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {cat.label}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {items.map((item) => (
                  <div
                    key={item.name}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                    }}
                  >
                    <div style={{ fontSize: 28, flexShrink: 0 }}>{INTEGRATION_ICONS[item.name] ?? '🔌'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {item.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                        {item.description}
                      </div>
                      {item.configured && (
                        <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Configured</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => setConfiguring(item.name)}
                      >
                        Configure
                      </button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => toggle.mutate({ name: item.name, enabled: e.target.checked })}
                        />
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading integrations…</div>
        )}
      </div>
    </Layout>
  );
}
