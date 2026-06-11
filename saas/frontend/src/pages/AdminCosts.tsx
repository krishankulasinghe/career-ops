import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { KPICard } from '@/components/shared/KPICard';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useDailySpend, useOrgCosts, useProviderBreakdown, useModelBreakdown, useAnomalies } from '@/api/adminCosts';
import {
  IconCurrencyDollar,
  IconRobot,
  IconCpu,
  IconChartLine,
  IconCoins,
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';

const PIE_COLORS = ['#5d9cec', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308'];
const PAGE_SIZE = 25;

function fmt$(v: number) {
  return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
}

export function AdminCostsPage() {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [localPage, setLocalPage] = useState(0);

  const { data: daily, isLoading: dailyLoading } = useDailySpend(90);
  const { data: orgs, isLoading: orgsLoading } = useOrgCosts(days);
  const { data: providers } = useProviderBreakdown(days);
  const { data: models } = useModelBreakdown(days);
  const { data: anomalies } = useAnomalies();

  const totalSpend = (orgs ?? []).reduce((s, o) => s + o.costUsd, 0);
  const totalEvals = (orgs ?? []).reduce((s, o) => s + o.evaluations, 0);
  const totalTokensIn = (orgs ?? []).reduce((s, o) => s + o.tokensIn, 0);
  const totalTokensOut = (orgs ?? []).reduce((s, o) => s + o.tokensOut, 0);

  const filteredOrgs = search
    ? (orgs ?? []).filter(
        (o) =>
          o.orgName.toLowerCase().includes(search.toLowerCase()) ||
          o.plan.toLowerCase().includes(search.toLowerCase()),
      )
    : (orgs ?? []);

  const total = filteredOrgs.length;
  const startItem = localPage * PAGE_SIZE + 1;
  const endItem = Math.min((localPage + 1) * PAGE_SIZE, total);
  const paged = filteredOrgs.slice(localPage * PAGE_SIZE, (localPage + 1) * PAGE_SIZE);

  return (
    <Layout title="AI Cost Dashboard">
      <div className="d-flex flex-column gap-4">

        {/* Anomaly alerts */}
        {(anomalies ?? []).length > 0 && (
          <div className="d-flex flex-column gap-2">
            {anomalies!.map((a) => (
              <div
                key={a.orgId}
                className="alert alert-danger d-flex align-items-center gap-2 mb-0"
                role="alert"
              >
                <IconAlertTriangle size={16} className="text-danger flex-shrink-0" />
                <span className="small">
                  <strong>Cost anomaly:</strong>{' '}
                  <strong>{a.orgName}</strong> spent {fmt$(a.thisWeekCost)} this week vs{' '}
                  {fmt$(a.lastWeekCost)} last week (
                  {a.growthFactor === 999 ? '∞' : `${a.growthFactor}×`} growth)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Summary KPI cards */}
        <div className="row g-3">
          <div className="col-sm-6 col-xl-3">
            <KPICard
              title="Total Spend"
              value={fmt$(totalSpend)}
              Icon={IconCurrencyDollar}
              color="danger"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <KPICard
              title="Evaluations"
              value={totalEvals.toLocaleString()}
              Icon={IconRobot}
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <KPICard
              title="Total Tokens"
              value={(totalTokensIn + totalTokensOut).toLocaleString()}
              Icon={IconCpu}
              color="info"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <KPICard
              title="Forecast EOM"
              value={fmt$(daily?.forecastEOM ?? 0)}
              Icon={IconChartLine}
              color="warning"
            />
          </div>
        </div>

        {/* Range selector */}
        <div className="d-flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Daily spend chart */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Daily Spend (last 90 days)</h5>
          </div>
          <div className="card-body">
            {dailyLoading ? (
              <LoadingSpinner />
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily?.series ?? []}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, 'Cost']} />
                    <Line type="monotone" dataKey="costUsd" stroke="var(--tblr-primary)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="row g-3">
          {/* Provider pie */}
          <div className="col-lg-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">Provider Breakdown</h5>
              </div>
              <div className="card-body">
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
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
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
            </div>
          </div>

          {/* Model bar */}
          <div className="col-lg-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">Model Breakdown</h5>
              </div>
              <div className="card-body">
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(models ?? []).slice(0, 8)} layout="vertical">
                      <XAxis type="number" tickFormatter={(v: number) => `$${v.toFixed(3)}`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="model" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => fmt$(Number(v))} />
                      <Bar dataKey="costUsd" fill="var(--tblr-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Per-org table */}
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 className="card-title mb-0">Cost by Organization (last {days}d)</h5>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search org or plan…"
              style={{ width: 200 }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setLocalPage(0); }}
            />
          </div>
          <div className="card-body p-0">
            {orgsLoading ? (
              <div className="p-4">
                <LoadingSpinner />
              </div>
            ) : total === 0 ? (
              <EmptyState
                Icon={IconCoins}
                title="No cost data"
                description="AI usage costs will appear here once evaluations are run."
              />
            ) : (
              <div className="table-responsive">
                <table className="table table-vcenter card-table table-hover table-sm small mb-0">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Plan</th>
                      <th className="text-end">Evaluations</th>
                      <th className="text-end">Tokens In</th>
                      <th className="text-end">Tokens Out</th>
                      <th className="text-end">Total Cost</th>
                      <th className="text-end">$/Eval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((o) => (
                      <tr key={o.orgId}>
                        <td className="fw-semibold">{o.orgName}</td>
                        <td>
                          <span className="badge bg-secondary-lt text-uppercase small">
                            {o.plan}
                          </span>
                        </td>
                        <td className="text-end">{o.evaluations.toLocaleString()}</td>
                        <td className="text-end text-secondary">{o.tokensIn.toLocaleString()}</td>
                        <td className="text-end text-secondary">{o.tokensOut.toLocaleString()}</td>
                        <td className="text-end fw-semibold">{fmt$(o.costUsd)}</td>
                        <td className="text-end text-secondary">{fmt$(o.costPerEval)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="fw-bold">
                    <tr>
                      <td colSpan={2}>Total</td>
                      <td className="text-end">{totalEvals.toLocaleString()}</td>
                      <td className="text-end">{totalTokensIn.toLocaleString()}</td>
                      <td className="text-end">{totalTokensOut.toLocaleString()}</td>
                      <td className="text-end">{fmt$(totalSpend)}</td>
                      <td className="text-end">
                        {totalEvals > 0 ? fmt$(totalSpend / totalEvals) : '$0'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="card-footer d-flex justify-content-end align-items-center gap-2">
              <span className="small text-secondary">{startItem}–{endItem} of {total}</span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={localPage === 0}
                onClick={() => setLocalPage((p) => p - 1)}
              >
                <IconChevronLeft size={14} />
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={endItem >= total}
                onClick={() => setLocalPage((p) => p + 1)}
              >
                <IconChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
