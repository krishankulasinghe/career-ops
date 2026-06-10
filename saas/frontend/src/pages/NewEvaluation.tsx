import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useCreateEvaluation, useEvaluationStatus } from '@/api/evaluations';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'pending', label: 'Queued' },
  { key: 'processing', label: 'Fetching JD' },
  { key: 'evaluating', label: 'Calling AI' },
  { key: 'generating_pdf', label: 'Generating PDF' },
  { key: 'completed', label: 'Done' },
];

export function NewEvaluationPage() {
  const navigate = useNavigate();
  const createEval = useCreateEvaluation();

  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [taskId, setTaskId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: status } = useEvaluationStatus(taskId, submitted);

  useEffect(() => {
    if (status?.status === 'completed' && applicationId) {
      setTimeout(() => navigate(`/evaluations/${applicationId}`), 1000);
    }
    if (status?.status === 'failed') {
      toast.error(`Evaluation failed: ${status.error ?? 'Unknown error'}`);
    }
  }, [status, applicationId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createEval.mutateAsync(
        mode === 'url' ? { url } : { jdText },
      );
      setTaskId(result.taskId);
      setApplicationId(result.applicationId);
      setSubmitted(true);
    } catch {
      toast.error('Failed to start evaluation');
    }
  };

  const currentStepIdx = STEPS.findIndex((s) => s.key === status?.status);

  return (
    <Layout title="New Evaluation">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {!submitted ? (
          <div className="card">
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Paste a job posting URL or the full JD text to get an AI-powered evaluation.
            </p>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {(['url', 'text'] as const).map((m) => (
                <button
                  key={m}
                  className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode(m)}
                  type="button"
                >
                  {m === 'url' ? '🔗 URL' : '📄 Paste JD Text'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'url' ? (
                <div className="form-group">
                  <label className="form-label">Job Posting URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://jobs.ashbyhq.com/company/job-id"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Job Description</label>
                  <textarea
                    className="form-control"
                    rows={14}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the full job description here…"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={createEval.isPending}
              >
                {createEval.isPending ? 'Starting…' : '▶ Start Evaluation'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: 24 }}>
              {status?.status === 'completed' ? '✅ Evaluation Complete!' :
               status?.status === 'failed' ? '❌ Evaluation Failed' :
               '⏳ Evaluating…'}
            </h3>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
              {STEPS.map((step, i) => {
                const done = i < currentStepIdx || status?.status === 'completed';
                const active = STEPS[currentStepIdx]?.key === step.key && status?.status !== 'completed';
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: done || status?.status === 'completed' ? 'var(--success)' : active ? 'var(--primary)' : 'var(--card-border)',
                      color: (done || active || status?.status === 'completed') ? '#fff' : 'var(--text-muted)',
                      fontSize: 14,
                      fontWeight: 600,
                    }}>
                      {done || status?.status === 'completed' ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 11, color: active ? 'var(--primary)' : 'var(--text-muted)', marginLeft: 4, marginRight: i < STEPS.length - 1 ? 8 : 0 }}>
                      {step.label}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ width: 20, height: 2, background: done ? 'var(--success)' : 'var(--card-border)', margin: '0 4px' }} />}
                  </div>
                );
              })}
            </div>

            {status?.status !== 'completed' && status?.status !== 'failed' && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 32, height: 32 }} />
              </div>
            )}

            {status?.status === 'completed' && (
              <p style={{ color: 'var(--success)' }}>Redirecting to your evaluation report…</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
