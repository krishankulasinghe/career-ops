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
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <Link to="/" className="navbar-brand navbar-brand-autodark app-brand fs-3">
            Career-Ops
          </Link>
        </div>
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">Create new account</h2>
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Full name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <div className="form-hint">Must be at least 8 characters.</div>
              </div>
              <div className="form-footer">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={register.isPending}
                >
                  {register.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Creating account…
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="text-center text-secondary mt-3">
          Already have account?{' '}
          <Link to="/login" tabIndex={-1}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
