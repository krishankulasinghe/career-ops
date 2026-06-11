import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface OrgBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customDomain?: string;
  loginBackground?: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  return res.json();
}

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Source Sans Pro', 'DM Sans'];

export function BrandingSettingsPage() {
  const qc = useQueryClient();
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: () => apiFetch<OrgBranding>('/api/v1/settings/branding'),
  });

  const save = useMutation({
    mutationFn: (body: OrgBranding) => apiFetch<OrgBranding>('/api/v1/settings/branding', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branding'] }); toast.success('Branding saved'); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<OrgBranding>({
    primaryColor: '#5d9cec',
    secondaryColor: '#2b2d42',
    fontFamily: 'Inter',
  });

  useEffect(() => {
    if (branding) setForm({ primaryColor: '#5d9cec', secondaryColor: '#2b2d42', fontFamily: 'Inter', ...branding });
  }, [branding]);

  return (
    <Layout title="White-Label Branding">
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">White-Label Branding</h5>
                  <p className="text-secondary small mb-0">Customize the look and feel of your Career-Ops instance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings form */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Brand Identity</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-warning mb-4" role="alert">
                ⚠ Requires Enterprise plan. Settings save but only apply on Enterprise.
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Logo URL</label>
                <input
                  className="form-control"
                  type="url"
                  value={form.logoUrl ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://yourcompany.com/logo.png"
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium">Primary Color</label>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={form.primaryColor ?? '#5d9cec'}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      title="Primary color"
                    />
                    <input
                      className="form-control font-monospace"
                      value={form.primaryColor ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium">Secondary Color</label>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={form.secondaryColor ?? '#2b2d42'}
                      onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                      title="Secondary color"
                    />
                    <input
                      className="form-control font-monospace"
                      value={form.secondaryColor ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Font Family</label>
                <select
                  className="form-select"
                  value={form.fontFamily ?? 'Inter'}
                  onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))}
                >
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Login Background URL</label>
                <input
                  className="form-control"
                  type="url"
                  value={form.loginBackground ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, loginBackground: e.target.value }))}
                  placeholder="https://yourcompany.com/bg.jpg"
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Custom Domain</label>
                <input
                  className="form-control"
                  value={form.customDomain ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
                  placeholder="careers.yourcompany.com"
                />
                <small className="form-hint">
                  Add a CNAME record pointing to your Career-Ops instance. Let's Encrypt TLS auto-provisioned.
                </small>
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button className="btn btn-primary" onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save Branding'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0 text-secondary">Live Preview</h6>
            </div>
            <div
              className="card-body p-0 overflow-hidden"
              style={{
                background: form.secondaryColor ?? '#2b2d42',
                minHeight: 300,
                fontFamily: form.fontFamily ? `'${form.fontFamily}', sans-serif` : undefined,
              }}
            >
              <div className="p-4">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    style={{ height: 32, objectFit: 'contain', marginBottom: 20, display: 'block' }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="fw-bold text-white mb-4" style={{ fontSize: 18 }}>Your Logo</div>
                )}
                <div className="mb-3" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Dashboard Preview</div>
                <div className="rounded p-3 mb-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-white fw-medium mb-2">Applications</div>
                  <div className="d-flex gap-2 flex-wrap">
                    {['Evaluated', 'Applied', 'Interview'].map((s) => (
                      <span
                        key={s}
                        className="badge"
                        style={{ background: form.primaryColor ?? '#5d9cec', color: '#fff', fontSize: 11 }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  style={{
                    background: form.primaryColor ?? '#5d9cec',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Primary Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
