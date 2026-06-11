import { Link } from 'react-router-dom';
import { IconBell } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/api/auth';

export function Header() {
  const { user, org } = useAuthStore();
  const logout = useLogout();

  return (
    <header className="navbar navbar-expand-md d-print-none">
      <div className="container-xl">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbar-menu"
          aria-controls="navbar-menu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
          <Link to="/" className="app-brand">
            Career-Ops
          </Link>
          {org && (
            <span className="ms-2 text-secondary small fw-normal">
              {org.name}
            </span>
          )}
        </div>

        <div className="navbar-nav flex-row order-md-last">
          {/* Notifications */}
          <div className="nav-item dropdown d-none d-md-flex me-3">
            <a
              href="#"
              className="nav-link px-0"
              data-bs-toggle="dropdown"
              aria-label="Show notifications"
              onClick={(e) => e.preventDefault()}
            >
              <IconBell size={20} />
            </a>
            <div className="dropdown-menu dropdown-menu-arrow dropdown-menu-end dropdown-menu-card">
              <div className="card-body">
                <p className="text-secondary text-center mb-0 small">No notifications</p>
              </div>
            </div>
          </div>

          {/* User menu */}
          <div className="nav-item dropdown">
            <a
              href="#"
              className="nav-link d-flex lh-1 text-reset p-0"
              data-bs-toggle="dropdown"
              aria-label="Open user menu"
              onClick={(e) => e.preventDefault()}
            >
              <span className="avatar avatar-sm">
                {user?.fullName
                  ? user.fullName.charAt(0).toUpperCase()
                  : '?'}
              </span>
              <div className="d-none d-xl-block ps-2">
                <div>{user?.fullName ?? 'User'}</div>
                <div className="mt-1 small text-secondary">{user?.email}</div>
              </div>
            </a>
            <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
              <Link to="/profile" className="dropdown-item">Profile</Link>
              <Link to="/settings" className="dropdown-item">Settings</Link>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item"
                onClick={() => logout.mutate()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
