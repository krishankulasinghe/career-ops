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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
              {isLoading ? '…' : (data?.totalRequests ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Total Requests (last {hours}h)
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>
              {isLoading ? '…' : PLAN_LABELS[data?.plan ?? 'free'] ?? data?.plan}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Current Plan Tier</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}>
              {isLoading ? '…' : (data?.rateLimit ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Rate Limit (req/hour)</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          {([6, 24, 72, 168] as const).map((h) => (
            <button
              key={h}
              className={`btn ${hours === h ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => setHours(h)}
            >
              {h === 168 ? '7d' : h === 72 ? '3d' : h === 24 ? '24h' : '6h'}
            </button>
          ))}
        </div>

        {/* Request volume line chart */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Request Volume</h3>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div>
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
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top endpoints */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Top Endpoints</h3>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</div>
          ) : (data?.topEndpoints?.length ?? 0) === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
              No API key requests recorded yet.
            </div>
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
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Rate limit info */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Rate Limit Tiers</h3>
          <table className="table">
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
                <tr key={row.plan} style={row.current ? { background: 'rgba(93,156,236,0.08)' } : undefined}>
                  <td>
                    {row.plan}
                    {row.current && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>← your plan</span>}
                  </td>
                  <td>{row.limit}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    X-RateLimit-Limit · X-RateLimit-Remaining · X-RateLimit-Reset
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            When the limit is exceeded, the API returns <code>429 Too Many Requests</code> with a <code>Retry-After</code> header.
          </div>
        </div>
      </div>
    </Layout>
  );
}
