import { NavLink, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
  IconChartPie,
  IconList,
  IconCirclePlus,
  IconLayoutKanban,
  IconUserCircle,
  IconBuilding,
  IconSearch,
  IconShoppingBag,
  IconChartBar,
  IconKey,
  IconBrain,
  IconCurrencyDollar,
  IconUser,
  IconSettings,
  IconRobot,
  IconShieldLock,
  IconAdjustments,
  IconPlug,
  IconPalette,
  IconPuzzle,
  IconDatabase,
  IconUsers,
  IconHistory,
  IconLock,
  IconBook,
  IconMessageCircle,
} from '@tabler/icons-react';

interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType<{ size?: number; stroke?: number }>;
  end?: boolean;
}

interface NavSection {
  header: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    header: 'Applications',
    items: [
      { to: '/applications', label: 'Applications', Icon: IconList },
      { to: '/evaluations/new', label: 'New Evaluation', Icon: IconCirclePlus },
      { to: '/pipeline', label: 'Pipeline', Icon: IconLayoutKanban },
      { to: '/interview-prep', label: 'Interview Prep', Icon: IconUserCircle },
    ],
  },
  {
    header: 'Discovery',
    items: [
      { to: '/portals', label: 'Portals', Icon: IconBuilding },
      { to: '/scanner', label: 'Scanner', Icon: IconSearch },
      { to: '/marketplace', label: 'Marketplace', Icon: IconShoppingBag },
    ],
  },
  {
    header: 'Analytics',
    items: [
      { to: '/analytics', label: 'Analytics', Icon: IconChartBar },
      { to: '/api-keys/analytics', label: 'API Analytics', Icon: IconKey },
      { to: '/admin/insights', label: 'AI Insights', Icon: IconBrain },
      { to: '/admin/ai-costs', label: 'AI Costs', Icon: IconCurrencyDollar },
    ],
  },
  {
    header: 'Settings',
    items: [
      { to: '/profile', label: 'Profile', Icon: IconUser },
      { to: '/settings', label: 'Settings', Icon: IconSettings },
      { to: '/settings/ai', label: 'AI Settings', Icon: IconRobot },
      { to: '/settings/prompts', label: 'Prompts', Icon: IconMessageCircle },
      { to: '/settings/sso', label: 'SSO', Icon: IconShieldLock },
      { to: '/settings/evaluation-modes', label: 'Eval Modes', Icon: IconAdjustments },
      { to: '/settings/webhooks', label: 'Webhooks', Icon: IconPlug },
      { to: '/settings/branding', label: 'Branding', Icon: IconPalette },
      { to: '/settings/integrations', label: 'Integrations', Icon: IconPuzzle },
      { to: '/settings/data-residency', label: 'Data Residency', Icon: IconDatabase },
    ],
  },
  {
    header: 'Team & Trust',
    items: [
      { to: '/team', label: 'Team', Icon: IconUsers },
      { to: '/audit', label: 'Audit Log', Icon: IconHistory },
      { to: '/trust', label: 'Trust Center', Icon: IconLock },
    ],
  },
  {
    header: 'Documentation',
    items: [
      { to: '/docs/getting-started', label: 'Getting Started', Icon: IconBook },
      { to: '/docs', label: 'User Guide', Icon: IconBook },
      { to: '/docs/faq', label: 'FAQ', Icon: IconBook },
      { to: '/docs/changelog', label: 'Changelog', Icon: IconBook },
    ],
  },
];

function isDropdownActive(section: NavSection, pathname: string): boolean {
  return section.items.some((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to)
  );
}

export function TopNav() {
  const { pathname } = useLocation();

  return (
    <div className="navbar-expand-md">
      <div className="collapse navbar-collapse" id="navbar-menu">
        <div className="navbar">
          <div className="container-xl">
            <ul className="navbar-nav">
              <li className="nav-item">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block">
                    <IconChartPie size={16} stroke={2} />
                  </span>
                  <span className="nav-link-title">Dashboard</span>
                </NavLink>
              </li>
              {navSections.map((section) => (
                <li
                  key={section.header}
                  className={`nav-item dropdown${isDropdownActive(section, pathname) ? ' active' : ''}`}
                >
                  <a
                    className="nav-link dropdown-toggle"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="outside"
                    role="button"
                    aria-expanded="false"
                    href="#"
                    onClick={(e) => e.preventDefault()}
                  >
                    <span className="nav-link-title">{section.header}</span>
                  </a>
                  <div className="dropdown-menu">
                    <div className="dropdown-menu-columns">
                      <div className="dropdown-menu-column">
                        {section.items.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                              `dropdown-item${isActive ? ' active' : ''}`
                            }
                          >
                            <span className="me-2 text-secondary">
                              <item.Icon size={16} stroke={2} />
                            </span>
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
