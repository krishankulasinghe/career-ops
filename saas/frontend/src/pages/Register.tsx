import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      const data = await register.mutateAsync({ email, password, fullName });
      setAuth(data.user, data.org);
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--body-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Career-Ops</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>Create your account</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <div className="form-error" style={{ color: 'var(--text-muted)' }}>Minimum 8 characters</div>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={register.isPending}>
              {register.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
