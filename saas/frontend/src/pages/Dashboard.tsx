import ReactECharts from 'echarts-for-react';
import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/shared/KPICard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useDashboardStats } from '@/api/evaluations';
import { useApplications } from '@/api/applications';
import { useFunnel } from '@/api/analytics';
import {
  IconBriefcase,
  IconStar,
  IconChartLine,
  IconLayoutKanban,
  IconChartBar,
  IconChartDonut,
} from '@tabler/icons-react';

const STATUS_ORDER = ['Evaluated', 'Applied', 'Interview', 'Offer', 'Rejected'];

const SCORE_BINS = [
  { name: '0–2', min: 0, max: 2 },
  { name: '2–3', min: 2, max: 3 },
  { name: '3–4', min: 3, max: 4 },
  { name: '4–5', min: 4, max: 5.1 },
];

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: appsData, isLoading: appsLoading } = useApplications({ limit: 10, sort: 'date', order: 'desc' });
  const { data: funnelData } = useFunnel();

  // Build bar chart data from funnel API or fall back to zeros
  const barCounts = STATUS_ORDER.map((s) => {
    const entry = funnelData?.find((f) => f.status === s);
    return entry?.count ?? 0;
  });

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: STATUS_ORDER,
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value' as const },
    series: [
      {
        data: barCounts,
        type: 'bar' as const,
        barWidth: '50%',
        itemStyle: { color: '#2c7be5', borderRadius: [3, 3, 0, 0] },
      },
    ],
  };

  // Build pie/donut chart from recent applications score distribution
  const scoreBinCounts = SCORE_BINS.map((bin) => ({
    name: bin.name,
    value: appsData?.applications.filter((a) => {
      const s = parseFloat(a.score ?? '0');
      return s >= bin.min && s < bin.max;
    }).length ?? 0,
  }));

  const pieOption = {
    tooltip: { trigger: 'item' as const },
    legend: { orient: 'vertical' as const, left: 'left', textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie' as const,
        radius: ['40%', '70%'],
        data: scoreBinCounts,
        label: { fontSize: 11 },
      },
    ],
  };

  const isLoading = statsLoading || appsLoading;

  return (
    <Layout title="Dashboard">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* KPI Row */}
          <div className="row g-3 mb-3">
            <div className="col-sm-6 col-xl-3">
              <KPICard
                title="Total Applications"
                value={stats?.total ?? 0}
                Icon={IconBriefcase}
                color="primary"
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <KPICard
                title="Evaluations Done"
                value={stats?.pendingEvals ?? 0}
                Icon={IconStar}
                color="success"
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <KPICard
                title="Avg Score"
                value={stats?.avgScore ? `${stats.avgScore}/5` : '—'}
                Icon={IconChartLine}
                color="info"
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <KPICard
                title="Active Pipeline"
                value={stats?.conversionRate !== undefined ? `${stats.conversionRate}%` : '—'}
                Icon={IconLayoutKanban}
                color="warning"
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-3 mb-3">
            <div className="col-md-8">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0 fs--1">Applications by Status</h5>
                </div>
                <div className="card-body p-0">
                  {barCounts.every((v) => v === 0) ? (
                    <EmptyState
                      title="No data yet"
                      description="Start evaluating offers to see your pipeline."
                      Icon={IconChartBar}
                    />
                  ) : (
                    <ReactECharts option={barOption} style={{ height: 300 }} />
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0 fs--1">Score Distribution</h5>
                </div>
                <div className="card-body p-0">
                  {scoreBinCounts.every((b) => b.value === 0) ? (
                    <EmptyState
                      title="No scores yet"
                      description="Evaluated applications will appear here."
                      Icon={IconChartDonut}
                    />
                  ) : (
                    <ReactECharts option={pieOption} style={{ height: 300 }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Applications Table */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Recent Applications</h5>
              <a className="btn btn-link btn-sm p-0" href="/applications">View all</a>
            </div>
            <div className="card-body p-0">
              {appsData?.applications.length ? (
                <table className="table table-sm fs--1 mb-0 overflow-hidden">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Company</th>
                      <th scope="col">Role</th>
                      <th scope="col">Score</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appsData.applications.slice(0, 10).map((app) => (
                      <tr key={app.id}>
                        <td className="text-500">{app.seqNumber}</td>
                        <td className="fw-semibold">{app.company}</td>
                        <td className="text-700">{app.role}</td>
                        <td>
                          {app.score ? (
                            <span className="badge bg-primary-lt">{app.score}/5</span>
                          ) : (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="text-secondary">{app.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="No applications yet"
                  description="Paste a job URL to start your first evaluation."
                  Icon={IconBriefcase}
                />
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
