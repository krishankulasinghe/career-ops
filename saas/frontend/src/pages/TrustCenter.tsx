import { useQuery } from '@tanstack/react-query';

interface Control {
  name: string;
  status: 'implemented' | 'in-progress' | 'planned';
  detail: string;
}

interface ControlCategory {
  category: string;
  items: Control[];
}

interface Subprocessor {
  name: string;
  category: string;
  country: string;
  purpose: string;
  link: string;
}

interface Certification {
  name: string;
  status: string;
  eta?: string;
  detail?: string;
}

interface TrustData {
  lastUpdated: string;
  controls: ControlCategory[];
  subprocessors: Subprocessor[];
  certifications: Certification[];
  auditLog: { retentionPolicy: Record<string, string>; totalEntries: number; oldestEntry: string | null };
  encryption: { atRest: string; inTransit: string; keyRotation: string };
  contact: { security: string; privacy: string; dpa: string };
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  implemented: 'var(--success)',
  'in-progress': 'var(--warning)',
  planned: 'var(--text-muted)',
};

const STATUS_ICONS: Record<string, string> = {
  implemented: '✅',
  'in-progress': '🔄',
  planned: '📋',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 10,
      background: `color-mix(in srgb, ${STATUS_COLORS[status] ?? 'gray'} 15%, transparent)`,
      color: STATUS_COLORS[status] ?? 'var(--text-muted)',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {STATUS_ICONS[status] ?? '○'} {status}
    </span>
  );
}

export function TrustCenterPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trust'],
    queryFn: () => apiFetch<TrustData>('/api/v1/trust'),
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--body-bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--body-bg)', minHeight: '100vh', fontFamily: 'var(--font-family)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--sidebar-bg)',
        color: '#fff',
        padding: '60px 40px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700 }}>Career-Ops Trust Center</h1>
        <p style={{ margin: '16px auto 0', maxWidth: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontSize: 16 }}>
          We take security, privacy, and compliance seriously. This page documents our controls,
          subprocessors, and certifications so you can make informed decisions about your data.
        </p>
        <div style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Last updated: {data?.lastUpdated ?? '—'}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>

        {/* Certifications */}
        <section>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Certifications & Compliance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {(data?.certifications ?? []).map((cert) => (
              <div key={cert.name} className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {cert.status === 'implemented' ? '✅' : cert.status === 'in-progress' ? '🔄' : '📋'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{cert.name}</div>
                <StatusBadge status={cert.status} />
                {cert.eta && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>ETA: {cert.eta}</div>}
                {cert.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{cert.detail}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Security Controls */}
        <section>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Security Controls (SOC 2)</h2>
          {(data?.controls ?? []).map((cat) => (
            <div key={cat.category} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                {cat.category}
              </h3>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {cat.items.map((item, i) => (
                      <tr key={item.name} style={{ borderBottom: i < cat.items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 500, width: '40%', fontSize: 14 }}>{item.name}</td>
                        <td style={{ padding: '12px 8px', width: 140 }}><StatusBadge status={item.status} /></td>
                        <td style={{ padding: '12px 20px 12px 8px', fontSize: 13, color: 'var(--text-muted)' }}>{item.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Encryption */}
        <section>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Encryption</h2>
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {Object.entries(data?.encryption ?? {}).map(([key, val], i, arr) => (
                  <tr key={key} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)', width: 180, textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </td>
                    <td style={{ padding: '12px 0', fontWeight: 500 }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Log Retention */}
        <section>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Audit Log Retention</h2>
          <div className="card">
            <p style={{ marginTop: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              All user and system actions are logged to an immutable audit log. Retention period depends on your plan.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)', fontWeight: 600 }}>Plan</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)', fontWeight: 600 }}>Retention</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data?.auditLog.retentionPolicy ?? {}).map(([plan, retention]) => (
                  <tr key={plan} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 0', textTransform: 'capitalize', fontWeight: 500 }}>{plan}</td>
                    <td style={{ padding: '10px 0', color: plan === 'enterprise' ? 'var(--success)' : undefined, fontWeight: plan === 'enterprise' ? 700 : undefined }}>
                      {retention} {plan === 'enterprise' ? '(SOC 2 compliant)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Subprocessors */}
        <section>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Subprocessors</h2>
          <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>
            These third-party services may process data on our behalf. We notify customers of any changes with 30 days notice.
          </p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '2px solid var(--border-color)' }}>
                  {['Vendor', 'Category', 'Location', 'Purpose'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.subprocessors ?? []).map((sp, i) => (
                  <tr key={sp.name} style={{ borderBottom: i < (data?.subprocessors.length ?? 0) - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>
                      <a href={sp.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {sp.name} ↗
                      </a>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 13 }}>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(93,156,236,0.12)', color: 'var(--primary)' }}>
                        {sp.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text-muted)' }}>{sp.country}</td>
                    <td style={{ padding: '12px 16px 12px 8px', fontSize: 13, color: 'var(--text-muted)' }}>{sp.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* DPA */}
        <section id="dpa">
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Data Processing Agreement (DPA)</h2>
          <div className="card">
            <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>
              We offer a Data Processing Agreement (DPA) for customers subject to GDPR, CCPA, or other data protection regulations.
              The DPA describes how we process personal data on your behalf as a data processor.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="/docs/career-ops-dpa-template.pdf"
                className="btn btn-primary"
                style={{ fontSize: 13, textDecoration: 'none', display: 'inline-block' }}
              >
                📄 Download DPA Template (PDF)
              </a>
              <a
                href={`mailto:${data?.contact.privacy ?? 'privacy@career-ops.io'}?subject=DPA%20Request`}
                className="btn btn-secondary"
                style={{ fontSize: 13, textDecoration: 'none', display: 'inline-block' }}
              >
                ✉ Request Signed DPA
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Security Contact</h2>
          <div className="card">
            <p style={{ marginTop: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              To report a security vulnerability, please email us at{' '}
              <a href={`mailto:${data?.contact.security}`} style={{ color: 'var(--primary)' }}>
                {data?.contact.security}
              </a>
              . We follow responsible disclosure and will acknowledge your report within 48 hours.
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              For privacy and GDPR inquiries:{' '}
              <a href={`mailto:${data?.contact.privacy}`} style={{ color: 'var(--primary)' }}>
                {data?.contact.privacy}
              </a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
