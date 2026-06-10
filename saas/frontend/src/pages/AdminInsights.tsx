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
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">AI Admin Insights</h5>
                  <p className="text-600 fs--1 mb-0">Scan anomalies, evaluation calibration, and batch optimization</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scan anomalies */}
        {(scanAnomalies ?? []).length > 0 && (
          <div className="col-12">
            <div className="card mb-3 border-danger">
              <div className="card-header bg-soft-danger">
                <h5 className="mb-0 text-danger">⚠ Portal Scan Anomalies</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover table-sm fs--1 mb-0">
                    <thead className="bg-200 text-900">
                      <tr>
                        <th>Portal</th>
                        <th>Today</th>
                        <th>7d Avg</th>
                        <th>Drop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanAnomalies!.map((a) => (
                        <tr key={a.portalId}>
                          <td className="fw-semi-bold align-middle">{a.portalName}</td>
                          <td className="text-danger align-middle">{a.todayCount}</td>
                          <td className="text-600 align-middle">{a.movingAvg}</td>
                          <td className="text-danger fw-semi-bold align-middle">−{a.dropPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dedup suggestions */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Smart Dedup Suggestions</h5>
              <p className="text-600 fs--2 mb-0">Applications with ≥85% company+role similarity</p>
            </div>
            <div className="card-body p-0">
              {dedupLoading ? (
                <div className="p-3"><LoadingSpinner /></div>
              ) : !(dedup ?? []).length ? (
                <div className="text-center text-600 py-4 fs--1">No duplicates detected.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm fs--1 mb-0">
                    <thead className="bg-200 text-900">
                      <tr>
                        <th>Application 1</th>
                        <th>Application 2</th>
                        <th>Similarity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dedup!.map((d, i) => (
                        <tr key={i}>
                          <td className="align-middle">
                            <div className="fw-semi-bold">{d.company1}</div>
                            <div className="text-600 fs--2">{d.role1}</div>
                          </td>
                          <td className="align-middle">
                            <div className="fw-semi-bold">{d.company2}</div>
                            <div className="text-600 fs--2">{d.role2}</div>
                          </td>
                          <td className="align-middle">
                            <span className={`badge ${d.similarity >= 0.95 ? 'badge-soft-danger' : 'badge-soft-warning'}`}>
                              {(d.similarity * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Archetype calibration */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Evaluation Quality Calibration</h5>
              <p className="text-600 fs--2 mb-0">
                Correlation between AI scores and actual interview/offer outcomes. Flagged = calibration score &lt; 70%.
              </p>
            </div>
            <div className="card-body p-0">
              {calLoading ? (
                <div className="p-3"><LoadingSpinner /></div>
              ) : !(calibration ?? []).length ? (
                <div className="text-center text-600 py-4 fs--1">
                  Not enough data yet (need ≥3 evaluations per archetype with outcomes).
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm fs--1 mb-0">
                    <thead className="bg-200 text-900">
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
                          <td className="fw-semi-bold align-middle">
                            {c.flag && <span className="text-danger me-1">⚑</span>}
                            {c.archetype}
                          </td>
                          <td className="align-middle">{c.evaluations}</td>
                          <td className="align-middle">{c.avgScore}/5</td>
                          <td className="align-middle">{c.interviewRate}%</td>
                          <td className="align-middle">{c.offerRate}%</td>
                          <td className={`align-middle fw-semi-bold ${c.calibrationScore >= 0.7 ? 'text-success' : 'text-danger'}`}>
                            {(c.calibrationScore * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Batch optimization */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Batch Size Recommendations</h5>
            </div>
            <div className="card-body p-0">
              {!(batchOpt ?? []).length ? (
                <div className="text-600 fs--1 p-3">No historical task data yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm fs--1 mb-0">
                    <thead className="bg-200 text-900">
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
                          <td className="fw-semi-bold align-middle">{b.provider}</td>
                          <td className="fw-bold text-primary align-middle">{b.recommendedBatchSize}</td>
                          <td className="align-middle">{b.observedAvgLatencyMs.toLocaleString()}ms</td>
                          <td className="text-600 align-middle">{b.observedP95LatencyMs.toLocaleString()}ms</td>
                          <td className="align-middle">{b.estimatedTPM}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
