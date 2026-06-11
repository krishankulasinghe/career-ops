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
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <Link to="/" className="navbar-brand navbar-brand-autodark app-brand fs-3">
            Career-Ops
          </Link>
        </div>
        <div className="card card-md">
          <div className="row g-0">
            {/* Left column: illustration */}
            <div className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center p-4 bg-primary-lt rounded-start">
              <div className="text-center">
                <div className="display-1 mb-3">🎯</div>
                <h3 className="fw-bold">Land your next role</h3>
                <p className="text-secondary mb-0">AI-powered job search pipeline with evaluation scoring, CV generation, and portal scanning.</p>
              </div>
            </div>
            {/* Right column: form */}
            <div className="col-lg-6 d-flex align-items-center">
              <div className="card-body">
                <h2 className="h2 text-center mb-4">Sign in to your account</h2>
                <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Email address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Password</label>
                    <div className="input-group input-group-flat">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                  <div className="form-footer">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={login.isPending}
                    >
                      {login.isPending ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          Signing in…
                        </>
                      ) : (
                        'Sign in'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center text-secondary mt-3">
          Don't have an account?{' '}
          <Link to="/register" tabIndex={-1}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
