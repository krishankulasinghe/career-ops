import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

interface ApiAnalytics {
  totalRequests: number;
  windows: Array<{ hour: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  plan: string;
  rateLimit: number;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  return res.json();
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free — 100 req/h',
  pro: 'Pro — 1,000 req/h',
  team: 'Team — 10,000 req/h',
  enterprise: 'Enterprise — 100,000 req/h',
};

export function ApiKeyAnalyticsPage() {
  const [hours, setHours] = useState(24);

  const { data, isLoading } = useQuery({
    queryKey: ['api-analytics', hours],
    queryFn: () => apiFetch<ApiAnalytics>(`/api/v1/api-keys/analytics?hours=${hours}`),
  });

  return (
    <Layout title="API Key Analytics">
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="card-title mb-0">API Key Analytics</h5>
                  <p className="text-secondary small mb-0">Monitor API usage, request volume, and rate limits</p>
                </div>
                <div className="col-auto">
                  <div className="btn-group btn-group-sm" role="group">
                    {([6, 24, 72, 168] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`btn ${hours === h ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setHours(h)}
                      >
                        {h === 168 ? '7d' : h === 72 ? '3d' : h === 24 ? '24h' : '6h'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="col-md-4">
          <div className="card mb-3 text-center">
            <div className="card-body">
              <div className="fs-2 fw-bold text-primary mb-1">
                {isLoading ? '…' : (data?.totalRequests ?? 0).toLocaleString()}
              </div>
              <div className="text-secondary small">Total Requests (last {hours}h)</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card mb-3 text-center">
            <div className="card-body">
              <div className="small fw-bold text-success mb-1">
                {isLoading ? '…' : PLAN_LABELS[data?.plan ?? 'free'] ?? data?.plan}
              </div>
              <div className="text-secondary small">Current Plan Tier</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card mb-3 text-center">
            <div className="card-body">
              <div className="fs-2 fw-bold text-warning mb-1">
                {isLoading ? '…' : (data?.rateLimit ?? 0).toLocaleString()}
              </div>
              <div className="text-secondary small">Rate Limit (req/hour)</div>
            </div>
          </div>
        </div>

        {/* Request volume line chart */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title mb-0">Request Volume</h5>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center text-secondary py-5">Loading…</div>
              ) : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.windows ?? []}>
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => v.slice(11)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => [v, 'Requests']}
                        labelFormatter={(l) => l}
                      />
                      <Line type="monotone" dataKey="count" stroke="var(--tblr-primary)" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top endpoints */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title mb-0">Top Endpoints</h5>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center text-secondary py-5">Loading…</div>
              ) : (data?.topEndpoints?.length ?? 0) === 0 ? (
                <div className="text-center text-secondary py-5">No API key requests recorded yet.</div>
              ) : (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.topEndpoints ?? []}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="endpoint"
                        width={220}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip formatter={(v) => [v, 'Requests']} />
                      <Bar dataKey="count" fill="var(--tblr-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rate limit info */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title mb-0">Rate Limit Tiers</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-vcenter card-table table-hover table-sm small mb-0">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Hourly Limit</th>
                      <th>Response Headers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { plan: 'Free', limit: '100 req/h', current: data?.plan === 'free' },
                      { plan: 'Pro', limit: '1,000 req/h', current: data?.plan === 'pro' },
                      { plan: 'Team', limit: '10,000 req/h', current: data?.plan === 'team' },
                      { plan: 'Enterprise', limit: '100,000 req/h', current: data?.plan === 'enterprise' },
                    ].map((row) => (
                      <tr key={row.plan} className={row.current ? 'bg-primary-lt' : ''}>
                        <td className="align-middle">
                          {row.plan}
                          {row.current && (
                            <span className="ms-2 badge bg-primary-lt small">← your plan</span>
                          )}
                        </td>
                        <td className="align-middle">{row.limit}</td>
                        <td className="align-middle font-monospace text-secondary small">
                          X-RateLimit-Limit · X-RateLimit-Remaining · X-RateLimit-Reset
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-top small text-secondary">
                When the limit is exceeded, the API returns <code>429 Too Many Requests</code> with a <code>Retry-After</code> header.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
