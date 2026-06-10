import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useDedupSuggestions, useScanAnomalies, useCalibration, useBatchOptimization } from '@/api/adminOps';

export function AdminInsightsPage() {
  const { data: dedup, isLoading: dedupLoading } = useDedupSuggestions();
  const { data: scanAnomalies } = useScanAnomalies();
  const { data: calibration, isLoading: calLoading } = useCalibration();
  const { data: batchOpt } = useBatchOptimization();

  return (
    <Layout title="AI Admin Insights">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Scan anomalies */}
        {(scanAnomalies ?? []).length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0, color: 'var(--danger)' }}>⚠ Portal Scan Anomalies</h3>
            <table className="table">
              <thead><tr><th>Portal</th><th>Today</th><th>7d Avg</th><th>Drop</th></tr></thead>
              <tbody>
                {scanAnomalies!.map((a) => (
                  <tr key={a.portalId}>
                    <td style={{ fontWeight: 600 }}>{a.portalName}</td>
                    <td style={{ color: 'var(--danger)' }}>{a.todayCount}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.movingAvg}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>−{a.dropPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dedup suggestions */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Smart Dedup Suggestions</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Applications with ≥85% company+role similarity
          </div>
          {dedupLoading ? <LoadingSpinner /> : !(dedup ?? []).length ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24, fontSize: 13 }}>
              No duplicates detected.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Application 1</th>
                  <th>Application 2</th>
                  <th>Similarity</th>
                </tr>
              </thead>
              <tbody>
                {dedup!.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.company1}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.role1}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.company2}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.role2}</div>
                    </td>
                    <td>
                      <div style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12,
                        background: d.similarity >= 0.95 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                        color: d.similarity >= 0.95 ? 'var(--danger)' : 'var(--warning)',
                      }}>
                        {(d.similarity * 100).toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Archetype calibration */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Evaluation Quality Calibration</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Correlation between AI scores and actual interview/offer outcomes.
            Flagged = calibration score &lt; 70%.
          </div>
          {calLoading ? <LoadingSpinner /> : !(calibration ?? []).length ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24, fontSize: 13 }}>
              Not enough data yet (need ≥3 evaluations per archetype with outcomes).
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Archetype</th>
                  <th>Evals</th>
                  <th>Avg Score</th>
                  <th>Interview Rate</th>
                  <th>Offer Rate</th>
                  <th>Calibration</th>
                </tr>
              </thead>
              <tbody>
                {calibration!.map((c) => (
                  <tr key={c.archetype}>
                    <td style={{ fontWeight: 600 }}>
                      {c.flag && <span style={{ marginRight: 6, color: 'var(--danger)' }}>⚑</span>}
                      {c.archetype}
                    </td>
                    <td>{c.evaluations}</td>
                    <td>{c.avgScore}/5</td>
                    <td>{c.interviewRate}%</td>
                    <td>{c.offerRate}%</td>
                    <td style={{ color: c.calibrationScore >= 0.7 ? 'var(--success)' : 'var(--danger)' }}>
                      {(c.calibrationScore * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Batch optimization */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Batch Size Recommendations</h3>
          {!(batchOpt ?? []).length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No historical task data yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Recommended Batch</th>
                  <th>Avg Latency</th>
                  <th>P95 Latency</th>
                  <th>Est. TPM</th>
                </tr>
              </thead>
              <tbody>
                {batchOpt!.map((b) => (
                  <tr key={b.provider}>
                    <td style={{ fontWeight: 600 }}>{b.provider}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{b.recommendedBatchSize}</td>
                    <td>{b.observedAvgLatencyMs.toLocaleString()}ms</td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.observedP95LatencyMs.toLocaleString()}ms</td>
                    <td>{b.estimatedTPM}</td>
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
