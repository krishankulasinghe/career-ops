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
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-100">
      <div className="card w-100" style={{ maxWidth: 400 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h3 className="font-sans-serif text-primary fw-bold">Career-Ops</h3>
            <p className="text-500">AI-powered job search pipeline</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2 mb-3 fs--1">{error}</div>
            )}

            <div className="form-group mb-3">
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

            <div className="form-group mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mt-3"
              disabled={login.isPending}
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="fs--1 text-center mt-3">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
      <p className="mt-3 text-center text-500 fs--1">
        © {new Date().getFullYear()} Career-Ops
      </p>
    </div>
  );
}
