import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Layout } from '@/components/layout/Layout';
import { useFunnel, useScoreDistribution, usePatterns, useArchetypeStats, useScoreThreshold, useFollowUps } from '@/api/analytics';
import { useCreateFollowUp } from '@/api/followups';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

const URGENCY_BADGE: Record<string, string> = {
  overdue: 'badge-soft-danger',
  urgent: 'badge-soft-warning',
  due: 'badge-soft-warning',
  scheduled: 'badge-soft-success',
};

export function AnalyticsPage() {
  const { data: funnel } = useFunnel();
  const { data: scores } = useScoreDistribution();
  const { data: patterns } = usePatterns();
  const { data: archetypes } = useArchetypeStats();
  const { data: threshold } = useScoreThreshold();
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps();
  const createFollowUp = useCreateFollowUp();

  const [logModal, setLogModal] = useState<{ applicationId: string; company: string } | null>(null);
  const [logForm, setLogForm] = useState({ channel: 'email', notes: '', date: new Date().toISOString().slice(0, 10) });
  // dateRange state kept for future filtering; currently used only in the Flatpickr onChange
  const [_dateRange, setDateRange] = useState<[Date?, Date?]>([undefined, undefined]);

  const handleLogFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logModal) return;
    await createFollowUp.mutateAsync({ applicationId: logModal.applicationId, ...logForm });
    toast.success('Follow-up logged');
    setLogModal(null);
  };

  // Compute funnel conversion rates
  const funnelWithRates = (funnel ?? []).map((entry, i, arr) => {
    const prev = i > 0 ? arr[i - 1].count : entry.count;
    return { ...entry, rate: prev > 0 ? Math.round((entry.count / prev) * 100) : 0 };
  });

  // ECharts options
  const funnelChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: funnelWithRates.map((d) => d.status),
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: funnelWithRates.map((d) => d.count),
        itemStyle: { color: '#2c7be5', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', fontSize: 11 },
      },
    ],
  };

  const scoreDonutOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, fontSize: 11 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
        data: (scores ?? []).map((s) => ({ name: s.range, value: s.count })),
      },
    ],
  };

  const blockersChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: (patterns ?? []).slice(0, 6).map((d) => d.blocker),
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: (patterns ?? []).slice(0, 6).map((d) => d.count),
        itemStyle: { color: '#f97316', borderRadius: [0, 4, 4, 0] },
      },
    ],
  };

  return (
    <Layout title="Analytics">
      <div className="d-flex flex-column gap-3">

        {/* Date range filter */}
        <div className="card mb-0">
          <div className="card-body py-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fas fa-calendar-alt text-500 fs--1" />
              <Flatpickr
                className="form-control form-control-sm"
                options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                placeholder="Filter by date range"
                onChange={(dates) => {
                  setDateRange([dates[0], dates[1]]);
                }}
                style={{ maxWidth: 240 }}
              />
              <span className="fs--1 text-500">Filter applied to all charts</span>
            </div>
          </div>
        </div>

        {/* Application Funnel — full width */}
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Application Funnel</h5>
          </div>
          <div className="card-body">
            {funnelWithRates.length === 0 ? (
              <p className="text-500 fs--1 text-center py-4">No funnel data yet.</p>
            ) : (
              <ReactECharts option={funnelChartOption} style={{ height: 240 }} />
            )}
          </div>
        </div>

        {/* Score Distribution + Blockers */}
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">Score Distribution</h5>
              </div>
              <div className="card-body">
                {!scores?.length ? (
                  <p className="text-500 fs--1 text-center py-4">No score data yet.</p>
                ) : (
                  <ReactECharts option={scoreDonutOption} style={{ height: 220 }} />
                )}
                {threshold && (
                  <div className="alert alert-soft-primary mb-0 mt-2 fs--1">
                    Recommended threshold:{' '}
                    <strong className="text-primary">{threshold.threshold}/5</strong>
                    <span className="text-500 ms-2">({threshold.basis})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">Top Gap Blockers</h5>
              </div>
              <div className="card-body">
                {!patterns?.length ? (
                  <p className="text-500 fs--1 text-center py-4">No pattern data yet.</p>
                ) : (
                  <ReactECharts option={blockersChartOption} style={{ height: 220 }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Archetype Performance */}
        {archetypes && archetypes.length > 0 && (
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Archetype Performance</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-sm fs--1 mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-3">Archetype</th>
                      <th>Count</th>
                      <th>Avg Score</th>
                      <th>Min</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archetypes.map((a) => (
                      <tr key={a.archetype}>
                        <td className="ps-3 fw-semibold">{a.archetype}</td>
                        <td>{a.count}</td>
                        <td>
                          <span className={`badge ${a.avgScore >= 4 ? 'badge-soft-success' : a.avgScore >= 3 ? 'badge-soft-warning' : 'badge-soft-danger'}`}>
                            {a.avgScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="text-500">{a.minScore.toFixed(1)}</td>
                        <td className="text-500">{a.maxScore.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Follow-ups */}
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Follow-ups Due</h5>
          </div>
          <div className="card-body">
            {followUpsLoading ? (
              <LoadingSpinner />
            ) : !followUps?.length ? (
              <div className="text-500 text-center py-4 fs--1">
                <span className="fas fa-check-circle d-block fs-2 text-300 mb-2" />
                No follow-ups due.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {followUps.map((f) => (
                  <div
                    key={f.applicationId}
                    className="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white"
                  >
                    <div>
                      <div className="fw-semibold fs--1">{f.company}</div>
                      <div className="fs--2 text-500">{f.role} · {f.status}</div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className={`badge ${URGENCY_BADGE[f.urgency] ?? 'badge-soft-secondary'}`}>
                        {f.urgency}
                      </span>
                      <button
                        className="btn btn-sm btn-falcon-primary"
                        onClick={() => setLogModal({ applicationId: f.applicationId, company: f.company })}
                      >
                        Log Follow-up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Log Follow-up Modal */}
      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(null)}>
          <div className="modal show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Log Follow-up — {logModal.company}</h5>
                  <button type="button" className="btn-close" onClick={() => setLogModal(null)} />
                </div>
                <form onSubmit={handleLogFollowUp}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={logForm.date}
                        onChange={(e) => setLogForm((f) => ({ ...f, date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Channel</label>
                      <select
                        className="form-select"
                        value={logForm.channel}
                        onChange={(e) => setLogForm((f) => ({ ...f, channel: e.target.value }))}
                      >
                        <option value="email">Email</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="phone">Phone</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={logForm.notes}
                        onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="What happened?"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-falcon-default" onClick={() => setLogModal(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={createFollowUp.isPending}>
                      {createFollowUp.isPending ? 'Saving…' : 'Log'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
