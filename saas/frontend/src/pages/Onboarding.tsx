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

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

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
    <div style={{ minHeight: '100vh', background: 'var(--body-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Welcome to Career-Ops!</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Let's get you set up in a few steps</div>
        </div>

        <div style={{ height: 6, background: 'var(--card-border)', borderRadius: 3, marginBottom: 28 }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              Step {step} of {TOTAL_STEPS}
            </div>
            {step < TOTAL_STEPS && step > 2 && (
              <button className="btn btn-secondary btn-sm" onClick={nextStep} style={{ color: 'var(--text-muted)' }}>
                Skip this step →
              </button>
            )}
          </div>

          {step === 1 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Account Confirmed</h3>
              <p style={{ color: 'var(--text-secondary)' }}>You're registered as <strong>{user?.email}</strong>.</p>
              <p style={{ color: 'var(--text-secondary)' }}>Career-Ops will help you evaluate job opportunities, generate tailored CVs, and track your applications — all in one place.</p>
              <button className="btn btn-primary" onClick={nextStep}>Get Started →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Profile Basics</h3>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Location (city, country)</label>
                <input className="form-control" placeholder="e.g. New York, US" value={profileData.location} onChange={(e) => setProfileData({ ...profileData, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL (optional)</label>
                <input type="url" className="form-control" placeholder="https://linkedin.com/in/…" value={profileData.linkedinUrl} onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                <button className="btn btn-primary" onClick={handleProfileSave} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Saving…' : 'Save & Continue →'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Upload Your CV</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Paste your CV in Markdown format:</p>
              <textarea
                className="form-control"
                rows={12}
                value={cvContent}
                onChange={(e) => setCvContent(e.target.value)}
                placeholder="# Your Name&#10;## Summary&#10;Experienced engineer with…&#10;&#10;## Experience&#10;**Company** — Role (2020–present)&#10;- Achievement 1"
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                <button className="btn btn-primary" onClick={handleCvSave} disabled={createCv.isPending}>
                  {createCv.isPending ? 'Saving…' : cvContent.trim() ? 'Save CV & Continue →' : 'Skip →'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Target Roles & Compensation</h3>
              <div className="form-group">
                <label className="form-label">Target Roles (one per line)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={roles}
                  onChange={(e) => setRoles(e.target.value)}
                  placeholder="Senior Software Engineer&#10;Staff Engineer&#10;Engineering Manager"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Minimum Salary Target (USD/year)</label>
                <input type="number" className="form-control" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="150000" style={{ maxWidth: 200 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                <button className="btn btn-primary" onClick={handleRolesSave}>Save & Continue →</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Archetypes (Optional)</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Archetypes help classify job offers. The defaults work great:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {['IC Technical', 'Tech Lead', 'Engineering Manager', 'Product Engineer', 'AI/ML Engineer'].map((a) => (
                  <span key={a} className="badge badge-info" style={{ fontSize: 13 }}>{a}</span>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>You can customize these anytime from your Profile page.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
                <button className="btn btn-primary" onClick={nextStep}>Use Defaults & Continue →</button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h3 style={{ marginTop: 0 }}>Your First Evaluation</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Paste a job URL to see Career-Ops in action!</p>
              <div className="form-group">
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <div className="spinner" />
                  <span>Evaluating job posting…</span>
                </div>
              )}

              {evalDone && (
                <div style={{ color: 'var(--success)', marginBottom: 12, fontWeight: 500 }}>
                  ✅ Evaluation complete! View your results on the dashboard.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
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
  );
}
