import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface SsoConfig {
  id?: string;
  protocol: string;
  idpMetadataUrl?: string;
  entityId?: string;
  clientId?: string;
  issuer?: string;
  forceSso: boolean;
  isActive: boolean;
  hasClientSecret?: boolean;
  acsUrl?: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Request failed');
  }
  return res.json();
}

export function SSOSettingsPage() {
  const qc = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['sso-config'],
    queryFn: () => apiFetch<SsoConfig | null>('/api/v1/sso/config'),
  });

  const save = useMutation({
    mutationFn: (body: object) => apiFetch<SsoConfig>('/api/v1/sso/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sso-config'] }); toast.success('SSO config saved'); },
  });

  const activate = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/api/v1/sso/activate', { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sso-config'] }); toast.success('SSO activated'); },
  });

  const [form, setForm] = useState({
    protocol: 'oidc',
    issuer: '',
    clientId: '',
    clientSecret: '',
    idpMetadataUrl: '',
    entityId: '',
    forceSso: false,
  });

  useEffect(() => {
    if (config) {
      setForm({
        protocol: config.protocol ?? 'oidc',
        issuer: config.issuer ?? '',
        clientId: config.clientId ?? '',
        clientSecret: '',
        idpMetadataUrl: config.idpMetadataUrl ?? '',
        entityId: config.entityId ?? '',
        forceSso: config.forceSso ?? false,
      });
    }
  }, [config]);

  const handleSave = () => {
    const body: Record<string, unknown> = {
      protocol: form.protocol,
      forceSso: form.forceSso,
    };
    if (form.protocol === 'oidc') {
      body['issuer'] = form.issuer;
      body['clientId'] = form.clientId;
      if (form.clientSecret) body['clientSecret'] = form.clientSecret;
    } else {
      body['idpMetadataUrl'] = form.idpMetadataUrl;
      body['entityId'] = form.entityId;
    }
    save.mutate(body);
  };

  return (
    <Layout title="SSO Configuration">
      <div style={{ maxWidth: 600 }}>

        {config?.isActive && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', fontSize: 13, marginBottom: 16 }}>
            ✓ SSO is active. Users with your domain will be redirected to the IdP on login.
            {config.forceSso && <span style={{ marginLeft: 8, color: 'var(--warning)' }}>Force SSO is ON — password login is blocked for org members.</span>}
          </div>
        )}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>SSO Configuration</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Gated to Team and Enterprise plans. Supports OIDC (Okta, Auth0, Google Workspace) and SAML 2.0.
          </div>

          {/* Protocol */}
          <div className="form-group">
            <label className="form-label">Protocol</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['oidc', 'saml'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, protocol: p }))}
                  style={{
                    padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                    border: `2px solid ${form.protocol === p ? 'var(--primary)' : 'var(--card-border)'}`,
                    background: form.protocol === p ? 'rgba(93,156,236,0.15)' : 'transparent',
                    color: 'var(--text)', fontWeight: form.protocol === p ? 600 : 400, fontSize: 13,
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {form.protocol === 'oidc' ? (
            <>
              <div className="form-group">
                <label className="form-label">Issuer URL</label>
                <input className="form-control" value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} placeholder="https://your-idp.example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Client ID</label>
                <input className="form-control" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Client Secret</label>
                <input type="password" className="form-control" value={form.clientSecret} onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                  placeholder={config?.hasClientSecret ? '(saved — leave blank to keep)' : 'Enter client secret'} autoComplete="new-password" />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">IdP Metadata URL</label>
                <input className="form-control" value={form.idpMetadataUrl} onChange={(e) => setForm((f) => ({ ...f, idpMetadataUrl: e.target.value }))} placeholder="https://your-idp.example.com/metadata.xml" />
              </div>
              <div className="form-group">
                <label className="form-label">SP Entity ID</label>
                <input className="form-control" value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} />
              </div>
            </>
          )}

          {config?.acsUrl && (
            <div className="form-group">
              <label className="form-label">ACS / Callback URL (configure in your IdP)</label>
              <input className="form-control" readOnly value={config.acsUrl} style={{ color: 'var(--text-muted)' }} />
            </div>
          )}

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.forceSso} onChange={(e) => setForm((f) => ({ ...f, forceSso: e.target.checked }))} />
              Force SSO — block password login for all org members
            </label>
            <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>
              Warning: if SSO breaks, org members won't be able to log in. Keep at least one admin with a working session.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save Config'}
            </button>
            {config && !config.isActive && (
              <button className="btn btn-primary" onClick={() => activate.mutate()} disabled={activate.isPending}>
                {activate.isPending ? 'Activating…' : 'Activate SSO'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
