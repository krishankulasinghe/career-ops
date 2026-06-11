import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile } from '@/api/profile';
import { useCreateCv } from '@/api/profile';
import { useCreateEvaluation } from '@/api/evaluations';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';

const TOTAL_STEPS = 6;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const updateProfile = useUpdateProfile();
  const createCv = useCreateCv();
  const createEval = useCreateEvaluation();

  const [profileData, setProfileData] = useState({ fullName: user?.fullName ?? '', location: '', timezone: '', linkedinUrl: '' });
  const [cvContent, setCvContent] = useState('');
  const [roles, setRoles] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [evalUrl, setEvalUrl] = useState('');
  const [evalTaskId, setEvalTaskId] = useState('');
  const [evalDone, setEvalDone] = useState(false);

  const handleFinish = async () => {
    await apiClient.put('/users/me/profile', { customConfig: { onboarded: true } });
    navigate('/');
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleProfileSave = async () => {
    await updateProfile.mutateAsync(profileData);
    nextStep();
  };

  const handleCvSave = async () => {
    if (cvContent.trim()) {
      await createCv.mutateAsync({ name: 'My CV', contentMd: cvContent, isPrimary: true });
    }
    nextStep();
  };

  const handleRolesSave = async () => {
    const roleList = roles.split('\n').map((r) => r.trim()).filter(Boolean).map((title) => ({ title, fit: 'primary' }));
    await updateProfile.mutateAsync({
      targetRoles: roleList,
      compensation: { min: parseInt(salaryMin) || undefined },
    });
    nextStep();
  };

  const handleStartEval = async () => {
    if (!evalUrl.trim()) { nextStep(); return; }
    try {
      const result = await createEval.mutateAsync({ url: evalUrl });
      setEvalTaskId(result.taskId);
      // Poll for completion
      const poll = setInterval(async () => {
        const res = await apiClient.get(`/evaluations/${result.taskId}/status`);
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(poll);
          setEvalDone(true);
        }
      }, 3000);
    } catch {
      toast.error('Failed to start evaluation');
    }
  };

  return (
    <div className="page page-center">
      <div className="container-tight py-4">
        <div className="text-center mb-4">
          <h3 className="fw-bold">Career-Ops</h3>
          <p className="text-secondary">Let's get you set up in a few steps</p>
        </div>

        {/* Tabler steps indicator */}
        <ul className="steps steps-green mb-4">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <li key={i} className={`step-item${i + 1 <= step ? ' active' : ''}`}>
              Step {i + 1}
            </li>
          ))}
        </ul>

        <div className="card">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="fw-semibold">Step {step} of {TOTAL_STEPS}</span>
              {step < TOTAL_STEPS && step > 2 && (
                <button className="btn btn-secondary btn-sm" onClick={nextStep}>
                  Skip this step →
                </button>
              )}
            </div>

            {step === 1 && (
              <div>
                <h5 className="mb-3">Account Confirmed</h5>
                <p className="text-body">You're registered as <strong>{user?.email}</strong>.</p>
                <p className="text-body">Career-Ops will help you evaluate job opportunities, generate tailored CVs, and track your applications — all in one place.</p>
                <button className="btn btn-primary" onClick={nextStep}>Get Started →</button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h5 className="mb-3">Profile Basics</h5>
                <div className="form-group mb-3">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">Location (city, country)</label>
                  <input className="form-control" placeholder="e.g. New York, US" value={profileData.location} onChange={(e) => setProfileData({ ...profileData, location: e.target.value })} />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">LinkedIn URL (optional)</label>
                  <input type="url" className="form-control" placeholder="https://linkedin.com/in/…" value={profileData.linkedinUrl} onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })} />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                  <button className="btn btn-primary" onClick={handleProfileSave} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? 'Saving…' : 'Save & Continue →'}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h5 className="mb-3">Upload Your CV</h5>
                <p className="text-body mb-3">Paste your CV in Markdown format:</p>
                <textarea
                  className="form-control font-monospace small"
                  rows={12}
                  value={cvContent}
                  onChange={(e) => setCvContent(e.target.value)}
                  placeholder={'# Your Name\n## Summary\nExperienced engineer with…\n\n## Experience\n**Company** — Role (2020–present)\n- Achievement 1'}
                />
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                  <button className="btn btn-primary" onClick={handleCvSave} disabled={createCv.isPending}>
                    {createCv.isPending ? 'Saving…' : cvContent.trim() ? 'Save CV & Continue →' : 'Skip →'}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h5 className="mb-3">Target Roles & Compensation</h5>
                <div className="form-group mb-3">
                  <label className="form-label">Target Roles (one per line)</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={roles}
                    onChange={(e) => setRoles(e.target.value)}
                    placeholder={'Senior Software Engineer\nStaff Engineer\nEngineering Manager'}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">Minimum Salary Target (USD/year)</label>
                  <input type="number" className="form-control" style={{ maxWidth: 200 }} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="150000" />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                  <button className="btn btn-primary" onClick={handleRolesSave}>Save & Continue →</button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h5 className="mb-3">Archetypes (Optional)</h5>
                <p className="text-body">Archetypes help classify job offers. The defaults work great:</p>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {['IC Technical', 'Tech Lead', 'Engineering Manager', 'Product Engineer', 'AI/ML Engineer'].map((a) => (
                    <span key={a} className="badge bg-azure-lt text-azure">{a}</span>
                  ))}
                </div>
                <p className="text-secondary small">You can customize these anytime from your Profile page.</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                  <button className="btn btn-primary" onClick={nextStep}>Use Defaults & Continue →</button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <h5 className="mb-3">Your First Evaluation</h5>
                <p className="text-body">Paste a job URL to see Career-Ops in action!</p>
                <div className="form-group mb-3">
                  <label className="form-label">Job Posting URL (optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={evalUrl}
                    onChange={(e) => setEvalUrl(e.target.value)}
                    placeholder="https://jobs.ashbyhq.com/…"
                  />
                </div>

                {evalTaskId && !evalDone && (
                  <div className="d-flex align-items-center gap-3 text-body mb-3">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading…</span>
                    </div>
                    <span>Evaluating job posting…</span>
                  </div>
                )}

                {evalDone && (
                  <div className="alert alert-success py-2 mb-3 fw-semibold">
                    Evaluation complete! View your results on the dashboard.
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                  {!evalTaskId ? (
                    <button className="btn btn-primary" onClick={handleStartEval} disabled={createEval.isPending}>
                      {createEval.isPending ? 'Starting…' : evalUrl.trim() ? '▶ Run Evaluation' : 'Skip →'}
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleFinish}>
                      {evalDone ? 'Go to Dashboard →' : 'Continue to Dashboard →'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

