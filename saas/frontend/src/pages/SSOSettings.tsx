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
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">SSO Configuration</h5>
                  <p className="text-600 fs--1 mb-0">Configure Single Sign-On for your organization</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {config?.isActive && (
            <div className="alert alert-success mb-3" role="alert">
              ✓ SSO is active. Users with your domain will be redirected to the IdP on login.
              {config.forceSso && (
                <span className="text-warning ms-2">Force SSO is ON — password login is blocked for org members.</span>
              )}
            </div>
          )}

          {/* Protocol selection */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Protocol</h5>
            </div>
            <div className="card-body">
              <p className="text-600 fs--1 mb-3">
                Gated to Team and Enterprise plans. Supports OIDC (Okta, Auth0, Google Workspace) and SAML 2.0.
              </p>
              <div className="d-flex gap-2">
                {(['oidc', 'saml'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn ${form.protocol === p ? 'btn-primary' : 'btn-falcon-default'}`}
                    onClick={() => setForm((f) => ({ ...f, protocol: p }))}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* OIDC settings */}
          {form.protocol === 'oidc' && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">OIDC Settings</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semi-bold">Issuer URL</label>
                  <input
                    className="form-control"
                    value={form.issuer}
                    onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                    placeholder="https://your-idp.example.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semi-bold">Client ID</label>
                  <input
                    className="form-control"
                    value={form.clientId}
                    onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semi-bold">Client Secret</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.clientSecret}
                    onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                    placeholder={config?.hasClientSecret ? '(saved — leave blank to keep)' : 'Enter client secret'}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SAML settings */}
          {form.protocol === 'saml' && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">SAML 2.0 Settings</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semi-bold">IdP Metadata URL</label>
                  <input
                    className="form-control"
                    value={form.idpMetadataUrl}
                    onChange={(e) => setForm((f) => ({ ...f, idpMetadataUrl: e.target.value }))}
                    placeholder="https://your-idp.example.com/metadata.xml"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semi-bold">SP Entity ID</label>
                  <input
                    className="form-control"
                    value={form.entityId}
                    onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ACS URL */}
          {config?.acsUrl && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">Callback URL</h5>
              </div>
              <div className="card-body">
                <label className="form-label fw-semi-bold">ACS / Callback URL (configure in your IdP)</label>
                <input className="form-control text-600" readOnly value={config.acsUrl} />
              </div>
            </div>
          )}

          {/* Force SSO */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Security Options</h5>
            </div>
            <div className="card-body">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="forceSso"
                  checked={form.forceSso}
                  onChange={(e) => setForm((f) => ({ ...f, forceSso: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="forceSso">
                  Force SSO — block password login for all org members
                </label>
              </div>
              <small className="text-warning">
                Warning: if SSO breaks, org members won't be able to log in. Keep at least one admin with a working session.
              </small>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-2">
            <button className="btn btn-falcon-default" onClick={handleSave} disabled={save.isPending}>
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
