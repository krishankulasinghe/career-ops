import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { useEvaluation } from '@/api/evaluations';
import { useApplication } from '@/api/applications';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

type Tab = 'report' | 'scores' | 'gaps' | 'metadata';

export function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('report');

  const { data: evaluation, isLoading } = useEvaluation(id ?? '');
  const { data: application } = useApplication(evaluation?.applicationId ?? '');

  if (isLoading) return <Layout><LoadingSpinner label="Loading evaluation…" /></Layout>;
  if (!evaluation) return <Layout><div className="alert alert-warning">Evaluation not found</div></Layout>;

  const radarData = [
    { subject: 'CV Match', value: parseFloat(evaluation.scoreCvMatch ?? '0') },
    { subject: 'North Star', value: parseFloat(evaluation.scoreNorthStar ?? '0') },
    { subject: 'Compensation', value: parseFloat(evaluation.scoreComp ?? '0') },
    { subject: 'Cultural', value: parseFloat(evaluation.scoreCultural ?? '0') },
    { subject: 'Red Flags', value: parseFloat(evaluation.scoreRedFlags ?? '0') },
    { subject: 'Global', value: parseFloat(evaluation.scoreGlobal ?? '0') },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'report', label: 'Report' },
    { key: 'scores', label: 'Scores' },
    { key: 'gaps', label: 'Gaps' },
    { key: 'metadata', label: 'Metadata' },
  ];

  const gapBadgeClass = (severity: string) => {
    if (severity === 'hard' || severity === 'critical') return 'badge badge-soft-danger';
    if (severity === 'soft') return 'badge badge-soft-warning';
    return 'badge badge-soft-secondary';
  };

  return (
    <Layout title="Evaluation">
      <div className="row g-3">
        {/* Left: main content with tabs */}
        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h5 className="mb-0">
                    {application?.company}
                    {application?.role ? <span className="text-600 fw-normal"> — {application.role}</span> : null}
                  </h5>
                  <div className="d-flex gap-2 mt-1 flex-wrap">
                    {evaluation.archetype && (
                      <span className="badge badge-soft-info">{evaluation.archetype}</span>
                    )}
                    {evaluation.legitimacyTier && (
                      <span className="badge badge-soft-secondary">{evaluation.legitimacyTier}</span>
                    )}
                  </div>
                </div>
                {application?.status && <StatusBadge status={application.status} />}
              </div>
            </div>

            {evaluation.tlDr && (
              <div className="card-body border-bottom py-2">
                <p className="text-600 fs--1 mb-0">{evaluation.tlDr}</p>
              </div>
            )}

            <div className="card-body p-0">
              {/* Tab nav */}
              <ul className="nav nav-tabs px-3 pt-2">
                {tabs.map((t) => (
                  <li className="nav-item" key={t.key}>
                    <button
                      className={`nav-link${tab === t.key ? ' active' : ''}`}
                      onClick={() => setTab(t.key)}
                      type="button"
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="tab-content">
                {/* Report tab */}
                <div className={`tab-pane fade${tab === 'report' ? ' show active' : ''} p-3`}>
                  <MarkdownRenderer content={evaluation.reportContent} />
                </div>

                {/* Scores tab */}
                <div className={`tab-pane fade${tab === 'scores' ? ' show active' : ''} p-3`}>
                  <div className="d-flex flex-wrap gap-4 align-items-center">
                    <ResponsiveContainer width={320} height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Radar name="Score" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="row g-3">
                      {radarData.map((d) => (
                        <div key={d.subject} className="col-6 d-flex align-items-center gap-2">
                          <ScoreGauge score={d.value} size="sm" />
                          <span className="fs--1">{d.subject}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gaps tab */}
                <div className={`tab-pane fade${tab === 'gaps' ? ' show active' : ''}`}>
                  {evaluation.gaps?.length ? (
                    <div className="table-responsive">
                      <table className="table table-hover table-sm fs--1 mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Gap</th>
                            <th>Severity</th>
                            <th>Mitigation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evaluation.gaps.map((gap, i) => (
                            <tr key={i}>
                              <td>{gap.description}</td>
                              <td>
                                <span className={gapBadgeClass(gap.severity)}>{gap.severity}</span>
                              </td>
                              <td className="text-600">{gap.mitigation ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">No gaps identified</div>
                  )}
                </div>

                {/* Metadata tab */}
                <div className={`tab-pane fade${tab === 'metadata' ? ' show active' : ''} p-3`}>
                  <dl className="row fs--1 mb-0">
                    <dt className="col-sm-3 text-600">Provider</dt>
                    <dd className="col-sm-9">{evaluation.aiProvider ?? '—'}</dd>
                    <dt className="col-sm-3 text-600">Model</dt>
                    <dd className="col-sm-9">{evaluation.aiModel ?? '—'}</dd>
                    <dt className="col-sm-3 text-600">Tokens In</dt>
                    <dd className="col-sm-9">{evaluation.aiTokensIn?.toLocaleString() ?? '—'}</dd>
                    <dt className="col-sm-3 text-600">Tokens Out</dt>
                    <dd className="col-sm-9">{evaluation.aiTokensOut?.toLocaleString() ?? '—'}</dd>
                    <dt className="col-sm-3 text-600">Cost</dt>
                    <dd className="col-sm-9">{evaluation.aiCostUsd ? `$${parseFloat(evaluation.aiCostUsd).toFixed(4)}` : '—'}</dd>
                    <dt className="col-sm-3 text-600">Latency</dt>
                    <dd className="col-sm-9">{evaluation.aiLatencyMs ? `${evaluation.aiLatencyMs}ms` : '—'}</dd>
                    <dt className="col-sm-3 text-600">Created</dt>
                    <dd className="col-sm-9">{new Date(evaluation.createdAt).toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: score + actions sidebar */}
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body text-center">
              <ScoreGauge score={evaluation.scoreGlobal} size="lg" />
              <p className="text-700 mt-2 mb-0">Match Score</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Actions</h6>
            </div>
            <div className="card-body d-grid gap-2">
              {application?.pdfUrl && (
                <a
                  href={`/api/v1/pdf/${evaluation.applicationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-falcon-default btn-sm"
                >
                  Download PDF
                </a>
              )}
              <a
                href={application?.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-falcon-default btn-sm"
              >
                View Job Posting
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
