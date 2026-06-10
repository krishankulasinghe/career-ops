import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/shared/KPICard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useDashboardStats } from '@/api/evaluations';
import { useApplications } from '@/api/applications';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: appsData } = useApplications({ limit: 10, sort: 'date', order: 'desc' });

  const scoreDistData = appsData?.applications
    ? (() => {
        const bins = [
          { range: '0–2', count: 0 },
          { range: '2–3', count: 0 },
          { range: '3–4', count: 0 },
          { range: '4–5', count: 0 },
        ];
        appsData.applications.forEach((a) => {
          const s = parseFloat(a.score ?? '0');
          if (s < 2) bins[0].count++;
          else if (s < 3) bins[1].count++;
          else if (s < 4) bins[2].count++;
          else bins[3].count++;
        });
        return bins;
      })()
    : [];

  return (
    <Layout title="Dashboard">
      {statsLoading ? (
        <LoadingSpinner label="Loading stats…" />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <KPICard label="Total Applications" value={stats?.total ?? 0} />
            <KPICard label="Avg Score" value={stats?.avgScore ?? '—'} sub="out of 5.0" color="var(--success)" />
            <KPICard label="Pending Evals" value={stats?.pendingEvals ?? 0} color="var(--warning)" />
            <KPICard label="Conversion Rate" value={`${stats?.conversionRate ?? 0}%`} sub="applied → offer" color="var(--info)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Score Distribution</h3>
              {scoreDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scoreDistData}>
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No evaluations yet</div>
              )}
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Recent Applications</h3>
              {appsData?.applications.length ? (
                <table className="table">
                  <tbody>
                    {appsData.applications.slice(0, 8).map((app) => (
                      <tr key={app.id}>
                        <td style={{ width: 48 }}>
                          <ScoreGauge score={app.score} size="sm" />
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{app.company}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.role}</div>
                        </td>
                        <td style={{ width: 90 }}>
                          <StatusBadge status={app.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No applications yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
