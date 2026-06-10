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
      <div className="row justify-content-center">
        <div className="col-lg-7 col-xl-6">
          {!submitted ? (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">New Evaluation</h5>
              </div>
              <div className="card-body">
                <p className="text-600 mb-3">
                  Paste a job posting URL or the full JD text to get an AI-powered evaluation.
                </p>

                {/* Mode toggle */}
                <ul className="nav nav-tabs mb-3">
                  {(['url', 'text'] as const).map((m) => (
                    <li className="nav-item" key={m}>
                      <button
                        className={`nav-link${mode === m ? ' active' : ''}`}
                        onClick={() => setMode(m)}
                        type="button"
                      >
                        {m === 'url' ? 'URL' : 'Paste JD Text'}
                      </button>
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleSubmit}>
                  {mode === 'url' ? (
                    <div className="mb-3">
                      <label className="form-label fw-semi-bold">Job Posting URL</label>
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
                    <div className="mb-3">
                      <label className="form-label fw-semi-bold">Job Description</label>
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

                  <div className="d-grid gap-2 mt-3">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={createEval.isPending}
                    >
                      {createEval.isPending ? 'Starting…' : 'Start Evaluation'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-falcon-default"
                      onClick={() => navigate(-1)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header text-center">
                <h5 className="mb-0">
                  {status?.status === 'completed'
                    ? 'Evaluation Complete!'
                    : status?.status === 'failed'
                    ? 'Evaluation Failed'
                    : 'Evaluating…'}
                </h5>
              </div>
              <div className="card-body text-center">
                {/* Step progress */}
                <div className="d-flex justify-content-center align-items-center gap-1 mb-4 flex-wrap">
                  {STEPS.map((step, i) => {
                    const done = i < currentStepIdx || status?.status === 'completed';
                    const active = STEPS[currentStepIdx]?.key === step.key && status?.status !== 'completed';
                    return (
                      <div key={step.key} className="d-flex align-items-center">
                        <div className="d-flex flex-column align-items-center">
                          <div
                            className={`rounded-circle d-flex align-items-center justify-content-center fw-bold fs--1${
                              done || status?.status === 'completed'
                                ? ' bg-success text-white'
                                : active
                                ? ' bg-primary text-white'
                                : ' bg-200 text-500'
                            }`}
                            style={{ width: 32, height: 32 }}
                          >
                            {done || status?.status === 'completed' ? '✓' : i + 1}
                          </div>
                          <div className={`fs--2 mt-1${active ? ' text-primary fw-semi-bold' : ' text-500'}`}>
                            {step.label}
                          </div>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`mx-1 mb-3${done ? ' bg-success' : ' bg-300'}`}
                            style={{ width: 24, height: 2 }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {status?.status !== 'completed' && status?.status !== 'failed' && (
                  <div className="d-flex justify-content-center mb-3">
                    <div className="spinner-border text-primary" role="status" style={{ width: 32, height: 32 }}>
                      <span className="visually-hidden">Loading…</span>
                    </div>
                  </div>
                )}

                {status?.status === 'completed' && (
                  <p className="text-success mb-0">Redirecting to your evaluation report…</p>
                )}

                {status?.status === 'failed' && (
                  <div className="d-grid gap-2 mt-3">
                    <button
                      className="btn btn-falcon-default"
                      onClick={() => { setSubmitted(false); setTaskId(''); setApplicationId(''); }}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
