import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDailySpend, useOrgCosts, useProviderBreakdown, useModelBreakdown, useAnomalies } from '@/api/adminCosts';

const PIE_COLORS = ['#5d9cec', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308'];

function fmt$(v: number) {
  return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
}

export function AdminCostsPage() {
  const [days, setDays] = useState(30);
  const { data: daily, isLoading: dailyLoading } = useDailySpend(90);
  const { data: orgs, isLoading: orgsLoading } = useOrgCosts(days);
  const { data: providers } = useProviderBreakdown(days);
  const { data: models } = useModelBreakdown(days);
  const { data: anomalies } = useAnomalies();

  const totalSpend = (orgs ?? []).reduce((s, o) => s + o.costUsd, 0);
  const totalEvals = (orgs ?? []).reduce((s, o) => s + o.evaluations, 0);

  return (
    <Layout title="AI Cost Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Anomaly alerts */}
        {(anomalies ?? []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {anomalies!.map((a) => (
              <div key={a.orgId} style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)',
                fontSize: 13,
              }}>
                <strong style={{ color: 'var(--danger)' }}>⚠ Cost anomaly:</strong>{' '}
                <strong>{a.orgName}</strong> spent {fmt$(a.thisWeekCost)} this week vs {fmt$(a.lastWeekCost)} last week
                ({a.growthFactor === 999 ? '∞' : `${a.growthFactor}×`} growth)
              </div>
            ))}
          </div>
        )}

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Spend', value: fmt$(totalSpend) },
            { label: 'Evaluations', value: totalEvals.toLocaleString() },
            { label: 'Avg $/Eval', value: totalEvals > 0 ? fmt$(totalSpend / totalEvals) : '$0' },
            { label: 'Forecast EOM', value: fmt$(daily?.forecastEOM ?? 0) },
          ].map((k) => (
            <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Daily spend chart */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Daily Spend (last 90 days)</h3>
          {dailyLoading ? <LoadingSpinner /> : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily?.series ?? []}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, 'Cost']} />
                  <Line type="monotone" dataKey="costUsd" stroke="var(--primary)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Provider pie */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Provider Breakdown</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providers ?? []}
                    dataKey="costUsd"
                    nameKey="provider"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {(providers ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt$(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model bar */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Model Breakdown</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(models ?? []).slice(0, 8)} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(3)}`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="model" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmt$(Number(v))} />
                  <Bar dataKey="costUsd" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Per-org table */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Cost by Organization (last {days}d)</h3>
          {orgsLoading ? <LoadingSpinner /> : (
            <table className="table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Plan</th>
                  <th>Evaluations</th>
                  <th>Tokens In</th>
                  <th>Tokens Out</th>
                  <th>Total Cost</th>
                  <th>$/Eval</th>
                </tr>
              </thead>
              <tbody>
                {(orgs ?? []).map((o) => (
                  <tr key={o.orgId}>
                    <td style={{ fontWeight: 600 }}>{o.orgName}</td>
                    <td><span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{o.plan}</span></td>
                    <td>{o.evaluations.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{o.tokensIn.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{o.tokensOut.toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{fmt$(o.costUsd)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmt$(o.costPerEval)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  );
}
