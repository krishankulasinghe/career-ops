import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/api/auth';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();
  const logout = useLogout();

  return (
    <>
      <nav
        className="navbar navbar-light navbar-glass fs--1 navbar-top sticky-kit navbar-expand"
        id="navbarDefault"
      >
        <button
          className="btn navbar-toggler-humburger-icon me-1 mb-1 mt-1"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarVerticalCollapse"
          aria-controls="navbarVerticalCollapse"
          aria-expanded="false"
          aria-label="Toggle Navigation"
        >
          <span className="navbar-toggle-icon">
            <span className="toggle-line"></span>
          </span>
        </button>

        <a className="navbar-brand me-1 me-sm-3" href="/">
          <div className="d-flex align-items-center">
            <span className="font-sans-serif">Career-Ops</span>
          </div>
        </a>

        <div className="collapse navbar-collapse scrollbar" id="navbarTopCollapse">
          <ul className="navbar-nav scrollbar"></ul>

          <ul className="navbar-nav navbar-nav-icons ms-auto flex-row align-items-center">
            {/* Dark mode toggle */}
            <li className="nav-item">
              <div className="theme-control-toggle fa-icon-wait px-2">
                <input
                  className="form-check-input ms-0 theme-control-toggle-input"
                  id="themeControlToggle"
                  type="checkbox"
                  data-theme-control="theme"
                  value="dark"
                />
                <label
                  className="mb-0 theme-control-toggle-label theme-control-toggle-light"
                  htmlFor="themeControlToggle"
                  data-bs-toggle="tooltip"
                  data-bs-placement="left"
                  title="Switch to dark theme"
                >
                  <span className="fas fa-sun fs-0"></span>
                </label>
                <label
                  className="mb-0 theme-control-toggle-label theme-control-toggle-dark"
                  htmlFor="themeControlToggle"
                  data-bs-toggle="tooltip"
                  data-bs-placement="left"
                  title="Switch to light theme"
                >
                  <span className="fas fa-moon fs-0"></span>
                </label>
              </div>
            </li>

            {/* Notification bell */}
            <li className="nav-item dropdown">
              <a
                className="nav-link notification-indicator notification-indicator-primary px-0 fa-icon-wait"
                id="navbarDropdownNotification"
                role="button"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <span
                  className="fas fa-bell"
                  data-fa-transform="shrink-6"
                  style={{ fontSize: '1.667em' }}
                ></span>
              </a>
              <div
                className="dropdown-menu dropdown-caret dropdown-menu-end dropdown-menu-card"
                aria-labelledby="navbarDropdownNotification"
              >
                <div className="card card-body shadow-none">
                  <p className="text-center mb-0">No notifications</p>
                </div>
              </div>
            </li>

            {/* User avatar dropdown */}
            <li className="nav-item dropdown">
              <a
                className="nav-link pe-0 ps-2"
                id="navbarDropdownUser"
                role="button"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <div className="avatar avatar-xl">
                  <img
                    className="rounded-circle"
                    src="/falcon/assets/img/team/avatar.png"
                    alt={user?.fullName ?? 'User avatar'}
                  />
                </div>
              </a>
              <div
                className="dropdown-menu dropdown-caret dropdown-menu-end py-0"
                aria-labelledby="navbarDropdownUser"
              >
                <div className="bg-white dark__bg-1000 rounded-2 py-2">
                  {user && (
                    <div className="dropdown-item text-muted small">
                      {user.fullName || user.email}
                    </div>
                  )}
                  <a className="dropdown-item" href="/profile">
                    Profile
                  </a>
                  <a className="dropdown-item" href="/settings">
                    Settings
                  </a>
                  <div className="dropdown-divider"></div>
                  <button
                    className="dropdown-item"
                    onClick={() => logout.mutate()}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </nav>

      {title && (
        <div className="row g-3 mb-3">
          <div className="col">
            <h5 className="mb-0">{title}</h5>
          </div>
        </div>
      )}
    </>
  );
}
