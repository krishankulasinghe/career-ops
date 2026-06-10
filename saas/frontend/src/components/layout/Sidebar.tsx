import { NavLink } from 'react-router-dom';
import { useLogout } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

interface NavSection {
  header?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: 'fas fa-chart-pie', end: true },
    ],
  },
  {
    header: 'Applications',
    items: [
      { to: '/applications', label: 'Applications', icon: 'fas fa-list-alt' },
      { to: '/evaluations/new', label: 'New Evaluation', icon: 'fas fa-plus-circle' },
      { to: '/pipeline', label: 'Pipeline', icon: 'fas fa-stream' },
      { to: '/interview-prep', label: 'Interview Prep', icon: 'fas fa-user-tie' },
    ],
  },
  {
    header: 'Discovery',
    items: [
      { to: '/portals', label: 'Portals', icon: 'fas fa-building' },
      { to: '/scanner', label: 'Scanner', icon: 'fas fa-search' },
      { to: '/marketplace', label: 'Marketplace', icon: 'fas fa-store' },
    ],
  },
  {
    header: 'Analytics',
    items: [
      { to: '/analytics', label: 'Analytics', icon: 'fas fa-chart-bar' },
      { to: '/api-keys/analytics', label: 'API Analytics', icon: 'fas fa-key' },
      { to: '/admin/insights', label: 'AI Insights', icon: 'fas fa-brain' },
      { to: '/admin/ai-costs', label: 'AI Costs', icon: 'fas fa-dollar-sign' },
    ],
  },
  {
    header: 'Settings',
    items: [
      { to: '/profile', label: 'Profile', icon: 'fas fa-user' },
      { to: '/settings', label: 'Settings', icon: 'fas fa-cog' },
      { to: '/settings/ai', label: 'AI Settings', icon: 'fas fa-robot' },
      { to: '/settings/prompts', label: 'Prompts', icon: 'fas fa-comment-dots' },
      { to: '/settings/sso', label: 'SSO', icon: 'fas fa-shield-alt' },
      { to: '/settings/evaluation-modes', label: 'Eval Modes', icon: 'fas fa-sliders-h' },
      { to: '/settings/webhooks', label: 'Webhooks', icon: 'fas fa-plug' },
      { to: '/settings/branding', label: 'Branding', icon: 'fas fa-paint-brush' },
      { to: '/settings/integrations', label: 'Integrations', icon: 'fas fa-puzzle-piece' },
      { to: '/settings/data-residency', label: 'Data Residency', icon: 'fas fa-database' },
    ],
  },
  {
    header: 'Team & Trust',
    items: [
      { to: '/team', label: 'Team', icon: 'fas fa-users' },
      { to: '/audit', label: 'Audit Log', icon: 'fas fa-history' },
      { to: '/trust', label: 'Trust Center', icon: 'fas fa-lock' },
    ],
  },
  {
    header: 'Documentation',
    items: [
      { to: '/docs/getting-started', label: 'Getting Started', icon: 'fas fa-book' },
      { to: '/docs', label: 'User Guide', icon: 'fas fa-book' },
      { to: '/docs/faq', label: 'FAQ', icon: 'fas fa-book' },
      { to: '/docs/changelog', label: 'Changelog', icon: 'fas fa-book' },
    ],
  },
];

export function Sidebar() {
  const { org } = useAuthStore();
  const logout = useLogout();

  return (
    <nav className="navbar navbar-light navbar-vertical navbar-expand-xl">
      <div className="d-flex align-items-center">
        <div className="toggle-icon-wrapper">
          <button
            className="btn navbar-toggler-humburger-icon navbar-vertical-toggle"
            data-bs-toggle="tooltip"
            data-bs-placement="left"
            title="Toggle Navigation"
          >
            <span className="navbar-toggle-icon">
              <span className="toggle-line"></span>
            </span>
          </button>
        </div>
        <a className="navbar-brand" href="/">
          <div className="d-flex align-items-center py-3">
            <span className="font-sans-serif text-primary fw-bold fs-4">Career-Ops</span>
            {org && <span className="ms-2 fs--2 text-500 fw-normal">{org.name}</span>}
          </div>
        </a>
      </div>

      <div className="collapse navbar-collapse" id="navbarVerticalCollapse">
        <div className="navbar-vertical-content scrollbar">
          <ul className="navbar-nav flex-column mb-3" id="navbarVerticalNav">
            {navSections.map((section, sectionIdx) => (
              <li className="nav-item" key={sectionIdx}>
                {section.header && (
                  <div className="row navbar-vertical-label-wrapper mt-3 mb-2">
                    <div className="col-auto navbar-vertical-label">{section.header}</div>
                    <div className="col ps-0">
                      <hr className="mb-0 navbar-vertical-divider" />
                    </div>
                  </div>
                )}
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    role="button"
                  >
                    <div className="d-flex align-items-center">
                      <span className="nav-link-icon">
                        <span className={item.icon}></span>
                      </span>
                      <span className="nav-link-text ps-1">{item.label}</span>
                    </div>
                  </NavLink>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="navbar-vertical-footer py-3">
        <ul className="navbar-vertical-footer-list">
          <li className="nav-item">
            <button
              className="btn btn-link nav-link p-0"
              onClick={() => logout.mutate()}
            >
              <div className="d-flex align-items-center">
                <span className="nav-link-icon">
                  <span className="fas fa-sign-out-alt"></span>
                </span>
                <span className="nav-link-text ps-1">Sign out</span>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
