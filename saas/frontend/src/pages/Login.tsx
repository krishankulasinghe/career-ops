import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import axios from 'axios';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login.mutateAsync({ email, password });
      setAuth(data.user, data.org);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid email or password.');
      } else if (axios.isAxiosError(err) && !err.response) {
        setError('Cannot reach the server. Make sure the API is running.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="page page-center">
      <div className="container py-4">
        <div className="row align-items-center g-4">

          {/* Left column: form */}
          <div className="col-lg">
            <div className="container-tight">
              <div className="text-center mb-4">
                <Link to="/" className="navbar-brand navbar-brand-autodark app-brand fs-3">
                  Career-Ops
                </Link>
              </div>

              <div className="card card-md">
                <div className="card-body">
                  <h2 className="h2 text-center mb-4">Sign in to your account</h2>

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} autoComplete="on" noValidate>
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
                        autoComplete="email"
                      />
                    </div>

                    <div className="mb-2">
                      <label className="form-label">
                        Password
                        <span className="form-label-description">
                          <Link to="/forgot-password" tabIndex={-1}>I forgot my password</Link>
                        </span>
                      </label>
                      <div className="input-group input-group-flat">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control"
                          placeholder="Your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                        <span className="input-group-text">
                          <button
                            type="button"
                            className="link-secondary"
                            title={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((v) => !v)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                          </button>
                        </span>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-check">
                        <input type="checkbox" className="form-check-input" />
                        <span className="form-check-label">Remember me on this device</span>
                      </label>
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

              <div className="text-center text-secondary mt-3">
                Don't have an account yet?{' '}
                <Link to="/register" tabIndex={-1}>Sign up</Link>
              </div>
            </div>
          </div>

          {/* Right column: illustration */}
          <div className="col-lg d-none d-lg-block">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 400"
              className="d-block mx-auto"
              style={{ maxHeight: 400 }}
              aria-hidden="true"
            >
              {/* Background circle */}
              <circle cx="250" cy="200" r="180" fill="var(--tblr-primary)" opacity="0.08" />

              {/* Document / resume */}
              <rect x="155" y="90" width="130" height="170" rx="8" fill="var(--tblr-bg-surface)" stroke="var(--tblr-border-color)" strokeWidth="2" />
              <rect x="170" y="110" width="70" height="8" rx="4" fill="var(--tblr-primary)" opacity="0.6" />
              <rect x="170" y="127" width="100" height="5" rx="2.5" fill="var(--tblr-secondary)" opacity="0.3" />
              <rect x="170" y="140" width="90" height="5" rx="2.5" fill="var(--tblr-secondary)" opacity="0.3" />
              <rect x="170" y="153" width="95" height="5" rx="2.5" fill="var(--tblr-secondary)" opacity="0.3" />
              <line x1="170" y1="170" x2="265" y2="170" stroke="var(--tblr-border-color)" strokeWidth="1" />
              <rect x="170" y="182" width="55" height="5" rx="2.5" fill="var(--tblr-primary)" opacity="0.4" />
              <rect x="170" y="195" width="100" height="5" rx="2.5" fill="var(--tblr-secondary)" opacity="0.25" />
              <rect x="170" y="208" width="85" height="5" rx="2.5" fill="var(--tblr-secondary)" opacity="0.25" />
              <rect x="170" y="221" width="95" height="5" rx="2.5" fill="var(--tblr-secondary)" opacity="0.25" />

              {/* Green checkmark badge */}
              <circle cx="285" cy="90" r="26" fill="var(--tblr-primary)" />
              <polyline points="273,90 281,98 297,82" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Star rating */}
              <g transform="translate(180, 268)" fill="var(--tblr-primary)" opacity="0.8">
                {[0, 18, 36, 54, 72].map((x) => (
                  <polygon key={x} points="7,0 8.5,5 14,5 9.5,8 11,13 7,10 3,13 4.5,8 0,5 5.5,5" transform={`translate(${x}, 0)`} />
                ))}
              </g>

              {/* Floating tag: "4.8 / 5" */}
              <rect x="305" y="160" width="72" height="30" rx="6" fill="var(--tblr-primary)" opacity="0.12" />
              <text x="341" y="180" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--tblr-primary)" fontFamily="inherit">4.8 / 5</text>

              {/* Person silhouette */}
              <circle cx="355" cy="280" r="20" fill="var(--tblr-primary)" opacity="0.15" />
              <circle cx="355" cy="274" r="9" fill="var(--tblr-primary)" opacity="0.5" />
              <path d="M338,300 Q338,286 355,286 Q372,286 372,300" fill="var(--tblr-primary)" opacity="0.5" />

              {/* Dotted connection line */}
              <line x1="290" y1="220" x2="340" y2="260" stroke="var(--tblr-primary)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.4" />
            </svg>
          </div>

        </div>
      </div>
    </div>
  );
}
