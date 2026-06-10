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

const STATUS_BADGE: Record<string, string> = {
  implemented: 'badge-soft-success',
  'in-progress': 'badge-soft-warning',
  planned: 'badge-soft-secondary',
};

const STATUS_ICONS: Record<string, string> = {
  implemented: '✅',
  'in-progress': '🔄',
  planned: '📋',
};

function ControlStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] ?? 'badge-soft-secondary'} text-capitalize`}>
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
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      {/* Hero header */}
      <div className="bg-dark text-white text-center py-6 px-4">
        <div className="fs-1 mb-3">🔒</div>
        <h1 className="fw-bold mb-3" style={{ fontSize: '2.25rem' }}>Career-Ops Trust Center</h1>
        <p className="text-200 mb-0 mx-auto" style={{ maxWidth: 600, lineHeight: 1.6, fontSize: 16 }}>
          We take security, privacy, and compliance seriously. This page documents our controls,
          subprocessors, and certifications so you can make informed decisions about your data.
        </p>
        <div className="mt-3 text-500 fs--1">Last updated: {data?.lastUpdated ?? '—'}</div>
      </div>

      <div className="container py-5" style={{ maxWidth: 1000 }}>

        {/* Certifications */}
        <section className="mb-5">
          <h2 className="mb-4">Certifications &amp; Compliance</h2>
          <div className="row g-3">
            {(data?.certifications ?? []).map((cert) => (
              <div key={cert.name} className="col-md-4">
                <div className="card text-center h-100">
                  <div className="card-body py-4">
                    <div className="fs-1 mb-3">
                      {cert.status === 'implemented' ? '✅' : cert.status === 'in-progress' ? '🔄' : '📋'}
                    </div>
                    <h5 className="fw-bold mb-2">{cert.name}</h5>
                    <ControlStatusBadge status={cert.status} />
                    {cert.eta && <div className="text-600 fs--2 mt-2">ETA: {cert.eta}</div>}
                    {cert.detail && <div className="text-600 fs--2 mt-2">{cert.detail}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security Controls */}
        <section className="mb-5">
          <h2 className="mb-4">Security Controls (SOC 2)</h2>
          {(data?.controls ?? []).map((cat) => (
            <div key={cat.category} className="mb-4">
              <h6 className="text-600 text-uppercase mb-3" style={{ letterSpacing: 1 }}>{cat.category}</h6>
              <div className="card mb-0">
                <div className="card-body p-0">
                  <table className="table table-hover table-sm fs--1 mb-0">
                    <tbody>
                      {cat.items.map((item) => (
                        <tr key={item.name}>
                          <td className="fw-semi-bold py-3 px-3" style={{ width: '38%' }}>{item.name}</td>
                          <td className="py-3 px-2" style={{ width: 140 }}>
                            <ControlStatusBadge status={item.status} />
                          </td>
                          <td className="text-600 py-3 px-3">{item.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Encryption */}
        <section className="mb-5">
          <h2 className="mb-4">Encryption</h2>
          <div className="card">
            <div className="card-body p-0">
              <table className="table table-sm fs--1 mb-0">
                <tbody>
                  {Object.entries(data?.encryption ?? {}).map(([key, val]) => (
                    <tr key={key}>
                      <td className="text-600 fw-semi-bold py-3 px-3 text-capitalize" style={{ width: 200 }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                      </td>
                      <td className="py-3 px-3 fw-semi-bold">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Audit Log Retention */}
        <section className="mb-5">
          <h2 className="mb-4">Audit Log Retention</h2>
          <div className="card">
            <div className="card-body">
              <p className="text-600 fs--1 mb-3">
                All user and system actions are logged to an immutable audit log. Retention period depends on your plan.
              </p>
              <table className="table table-hover table-sm fs--1 mb-0">
                <thead className="bg-200 text-900">
                  <tr>
                    <th>Plan</th>
                    <th>Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data?.auditLog.retentionPolicy ?? {}).map(([plan, retention]) => (
                    <tr key={plan}>
                      <td className="text-capitalize fw-semi-bold align-middle">{plan}</td>
                      <td className={`align-middle ${plan === 'enterprise' ? 'text-success fw-bold' : ''}`}>
                        {retention} {plan === 'enterprise' ? '(SOC 2 compliant)' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Subprocessors */}
        <section className="mb-5">
          <h2 className="mb-2">Subprocessors</h2>
          <p className="text-600 fs--1 mb-4">
            These third-party services may process data on our behalf. We notify customers of any changes with 30 days notice.
          </p>
          <div className="card">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-sm fs--1 mb-0">
                  <thead className="bg-200 text-900">
                    <tr>
                      <th>Vendor</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.subprocessors ?? []).map((sp) => (
                      <tr key={sp.name}>
                        <td className="fw-semi-bold align-middle">
                          <a href={sp.link} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">
                            {sp.name} ↗
                          </a>
                        </td>
                        <td className="align-middle">
                          <span className="badge badge-soft-primary">{sp.category}</span>
                        </td>
                        <td className="text-600 align-middle">{sp.country}</td>
                        <td className="text-600 align-middle">{sp.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* DPA */}
        <section id="dpa" className="mb-5">
          <h2 className="mb-4">Data Processing Agreement (DPA)</h2>
          <div className="card">
            <div className="card-body">
              <p className="fs--1 mb-4">
                We offer a Data Processing Agreement (DPA) for customers subject to GDPR, CCPA, or other data protection regulations.
                The DPA describes how we process personal data on your behalf as a data processor.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <a
                  href="/docs/career-ops-dpa-template.pdf"
                  className="btn btn-primary"
                >
                  📄 Download DPA Template (PDF)
                </a>
                <a
                  href={`mailto:${data?.contact.privacy ?? 'privacy@career-ops.io'}?subject=DPA%20Request`}
                  className="btn btn-falcon-default"
                >
                  ✉ Request Signed DPA
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-5">
          <h2 className="mb-4">Security Contact</h2>
          <div className="card">
            <div className="card-body">
              <p className="text-600 fs--1 mb-2">
                To report a security vulnerability, please email us at{' '}
                <a href={`mailto:${data?.contact.security}`} className="text-primary">
                  {data?.contact.security}
                </a>
                . We follow responsible disclosure and will acknowledge your report within 48 hours.
              </p>
              <p className="text-600 fs--1 mb-0">
                For privacy and GDPR inquiries:{' '}
                <a href={`mailto:${data?.contact.privacy}`} className="text-primary">
                  {data?.contact.privacy}
                </a>
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
