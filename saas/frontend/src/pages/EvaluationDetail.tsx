import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
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
  if (!evaluation) return <Layout><div>Evaluation not found</div></Layout>;

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

  return (
    <Layout title="Evaluation">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <ScoreGauge score={evaluation.scoreGlobal} size="lg" />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{application?.company}</h2>
              <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{application?.role}</div>
              {evaluation.archetype && (
                <span className="badge badge-info" style={{ marginTop: 8 }}>{evaluation.archetype}</span>
              )}
              {evaluation.legitimacyTier && (
                <span className="badge badge-secondary" style={{ marginLeft: 6, marginTop: 8 }}>{evaluation.legitimacyTier}</span>
              )}
            </div>

            {application?.pdfUrl && (
              <a
                href={`/api/v1/pdf/${evaluation.applicationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                📄 Download PDF
              </a>
            )}
          </div>

          {evaluation.tlDr && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--body-bg)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 14 }}>
              {evaluation.tlDr}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderBottomLeftRadius: tab === t.key ? 0 : undefined, borderBottomRightRadius: tab === t.key ? 0 : undefined }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ borderTopLeftRadius: 0, minHeight: 400 }}>
          {tab === 'report' && (
            <MarkdownRenderer content={evaluation.reportContent} />
          )}

          {tab === 'scores' && (
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
              <ResponsiveContainer width={320} height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Radar name="Score" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {radarData.map((d) => (
                  <div key={d.subject} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ScoreGauge score={d.value} size="sm" />
                    <span style={{ fontSize: 13 }}>{d.subject}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'gaps' && (
            evaluation.gaps?.length ? (
              <table className="table">
                <thead>
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
                        <span className={`badge badge-${gap.severity === 'hard' || gap.severity === 'critical' ? 'danger' : gap.severity === 'soft' ? 'warning' : 'secondary'}`}>
                          {gap.severity}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{gap.mitigation ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No gaps identified</div>
            )
          )}

          {tab === 'metadata' && (
            <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', fontSize: 14 }}>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Provider</dt>
              <dd style={{ margin: 0 }}>{evaluation.aiProvider ?? '—'}</dd>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Model</dt>
              <dd style={{ margin: 0 }}>{evaluation.aiModel ?? '—'}</dd>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Tokens In</dt>
              <dd style={{ margin: 0 }}>{evaluation.aiTokensIn?.toLocaleString() ?? '—'}</dd>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Tokens Out</dt>
              <dd style={{ margin: 0 }}>{evaluation.aiTokensOut?.toLocaleString() ?? '—'}</dd>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Cost</dt>
              <dd style={{ margin: 0 }}>{evaluation.aiCostUsd ? `$${parseFloat(evaluation.aiCostUsd).toFixed(4)}` : '—'}</dd>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Latency</dt>
              <dd style={{ margin: 0 }}>{evaluation.aiLatencyMs ? `${evaluation.aiLatencyMs}ms` : '—'}</dd>
              <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Created</dt>
              <dd style={{ margin: 0 }}>{new Date(evaluation.createdAt).toLocaleString()}</dd>
            </dl>
          )}
        </div>
      </div>
    </Layout>
  );
}
