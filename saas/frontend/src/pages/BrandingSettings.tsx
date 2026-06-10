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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Settings form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Brand Identity</h3>
            <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 16 }}>
              ⚠ Requires Enterprise plan. Settings save but only apply on Enterprise.
            </div>

            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input className="form-control" type="url" value={form.logoUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://yourcompany.com/logo.png" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Primary Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={form.primaryColor ?? '#5d9cec'} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} style={{ width: 40, height: 36, cursor: 'pointer', border: 'none', background: 'none' }} />
                  <input className="form-control" value={form.primaryColor ?? ''} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Secondary Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={form.secondaryColor ?? '#2b2d42'} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} style={{ width: 40, height: 36, cursor: 'pointer', border: 'none', background: 'none' }} />
                  <input className="form-control" value={form.secondaryColor ?? ''} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Font Family</label>
              <select className="form-control" value={form.fontFamily ?? 'Inter'} onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Login Background URL</label>
              <input className="form-control" type="url" value={form.loginBackground ?? ''} onChange={(e) => setForm((f) => ({ ...f, loginBackground: e.target.value }))} placeholder="https://yourcompany.com/bg.jpg" />
            </div>

            <div className="form-group">
              <label className="form-label">Custom Domain</label>
              <input className="form-control" value={form.customDomain ?? ''} onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))} placeholder="careers.yourcompany.com" />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Add a CNAME record pointing to your Career-Ops instance. Let's Encrypt TLS auto-provisioned.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save Branding'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', fontSize: 12, color: 'var(--text-muted)' }}>
              Live Preview
            </div>
            <div style={{
              background: form.secondaryColor ?? '#2b2d42',
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              fontFamily: form.fontFamily ? `'${form.fontFamily}', sans-serif` : undefined,
            }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" style={{ height: 32, objectFit: 'contain', marginBottom: 20, alignSelf: 'flex-start' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Your Logo</div>
              )}
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 }}>Dashboard Preview</div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 16 }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Applications</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Evaluated', 'Applied', 'Interview'].map((s) => (
                    <span key={s} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 4,
                      background: form.primaryColor ?? '#5d9cec',
                      color: '#fff',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
              <button style={{
                marginTop: 16,
                background: form.primaryColor ?? '#5d9cec',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                alignSelf: 'flex-start',
              }}>
                Primary Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
