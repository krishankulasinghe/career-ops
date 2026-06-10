import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { useFunnel, useScoreDistribution, usePatterns, useArchetypeStats, useScoreThreshold, useFollowUps } from '@/api/analytics';
import { useCreateFollowUp } from '@/api/followups';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

const URGENCY_COLORS: Record<string, string> = {
  overdue: '#ef4444',
  urgent: '#f97316',
  due: '#eab308',
  scheduled: '#22c55e',
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

  return (
    <Layout title="Analytics">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Funnel */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Application Funnel</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelWithRates} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="status" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Score Distribution */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Score Distribution</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scores ?? []}>
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {threshold && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(93,156,236,0.08)', borderRadius: 4, fontSize: 13 }}>
                Recommended threshold: <strong style={{ color: 'var(--primary)' }}>{threshold.threshold}/5</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({threshold.basis})</span>
              </div>
            )}
          </div>

          {/* Top Blockers */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Top Gap Blockers</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(patterns ?? []).slice(0, 6)} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="blocker" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Archetype Performance */}
        {archetypes && archetypes.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Archetype Performance</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Archetype</th>
                  <th>Count</th>
                  <th>Avg Score</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {archetypes.map((a) => (
                  <tr key={a.archetype}>
                    <td style={{ fontWeight: 600 }}>{a.archetype}</td>
                    <td>{a.count}</td>
                    <td style={{ color: a.avgScore >= 4 ? 'var(--success)' : a.avgScore >= 3 ? 'var(--warning)' : 'var(--danger)' }}>
                      {a.avgScore.toFixed(1)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.minScore.toFixed(1)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.maxScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Follow-ups */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Follow-ups Due</h3>
          {followUpsLoading ? <LoadingSpinner /> : !followUps?.length ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No follow-ups due.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {followUps.map((f) => (
                <div key={f.applicationId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.role} · {f.status}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: URGENCY_COLORS[f.urgency] ?? 'var(--text-muted)',
                    }}>
                      {f.urgency}
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
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

      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Log Follow-up — {logModal.company}</h2>
              <button className="modal-close" onClick={() => setLogModal(null)}>×</button>
            </div>
            <form onSubmit={handleLogFollowUp}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-control" value={logForm.date} onChange={(e) => setLogForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select className="form-control" value={logForm.channel} onChange={(e) => setLogForm((f) => ({ ...f, channel: e.target.value }))}>
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="phone">Phone</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} placeholder="What happened?" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setLogModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createFollowUp.isPending}>
                  {createFollowUp.isPending ? 'Saving…' : 'Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
