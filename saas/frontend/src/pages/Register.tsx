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
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-100">
      <div className="card w-100" style={{ maxWidth: 400 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h3 className="font-sans-serif text-primary fw-bold">Career-Ops</h3>
            <p className="text-500">Create your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2 mb-3 fs--1">{error}</div>
            )}

            <div className="form-group mb-3">
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

            <div className="form-group mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                minLength={8}
              />
              <div className="form-text text-500 fs--1">Minimum 8 characters</div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mt-3"
              disabled={register.isPending}
            >
              {register.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="fs--1 text-center mt-3">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
      <p className="mt-3 text-center text-500 fs--1">
        © {new Date().getFullYear()} Career-Ops
      </p>
    </div>
  );
}
