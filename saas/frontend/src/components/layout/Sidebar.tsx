import { NavLink } from 'react-router-dom';
import { useLogout } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/applications', label: 'Applications', icon: '☰' },
  { to: '/evaluations/new', label: 'New Evaluation', icon: '✦' },
  { to: '/pipeline', label: 'Pipeline', icon: '⟳' },
  { to: '/portals', label: 'Portals', icon: '⊕' },
  { to: '/scanner', label: 'Scanner', icon: '⊙' },
  { to: '/analytics', label: 'Analytics', icon: '◈' },
  { to: '/team', label: 'Team', icon: '⊗' },
  { to: '/audit', label: 'Audit Log', icon: '⊘' },
  { to: '/profile', label: 'Profile', icon: '◉' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/settings/ai', label: 'AI Settings', icon: '⬡' },
  { to: '/admin/ai-costs', label: 'AI Costs', icon: '◑' },
  { to: '/settings/prompts', label: 'Prompts', icon: '◪' },
  { to: '/admin/insights', label: 'AI Insights', icon: '◬' },
  { to: '/settings/sso', label: 'SSO', icon: '⊠' },
  { to: '/settings/evaluation-modes', label: 'Eval Modes', icon: '⬣' },
  { to: '/settings/webhooks', label: 'Webhooks', icon: '⊳' },
  { to: '/interview-prep', label: 'Interview Prep', icon: '⊡' },
  { to: '/settings/branding', label: 'Branding', icon: '◧' },
  { to: '/api-keys/analytics', label: 'API Analytics', icon: '◫' },
  { to: '/marketplace', label: 'Marketplace', icon: '◩' },
  { to: '/settings/integrations', label: 'Integrations', icon: '⊟' },
  { to: '/settings/data-residency', label: 'Data Residency', icon: '◨' },
];

export function Sidebar() {
  const { org } = useAuthStore();
  const logout = useLogout();

  return (
    <nav style={{
      width: 'var(--sidebar-width)',
      background: 'var(--sidebar-bg)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Career-Ops</div>
        {org && <div style={{ color: 'var(--sidebar-text)', fontSize: 12, marginTop: 4, opacity: 0.7 }}>{org.name}</div>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
              borderRadius: 4,
              margin: '1px 8px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              transition: 'background 0.15s',
            })}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => logout.mutate()}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--sidebar-text)',
            padding: '8px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
