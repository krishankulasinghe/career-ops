import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login.mutateAsync({ email, password });
      setAuth(data.user, data.org);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--body-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Career-Ops</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>Sign in to your account</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
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
              />
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
