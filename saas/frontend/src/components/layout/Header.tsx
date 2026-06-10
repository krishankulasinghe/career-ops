import { useAuthStore } from '@/stores/auth.store';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, org } = useAuthStore();

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--topbar-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
    }}>
      {title && <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>{title}</h1>}
      {!title && <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {org && (
          <span style={{
            background: 'rgba(93,156,236,0.1)',
            color: 'var(--primary)',
            padding: '2px 10px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
          }}>
            {org.plan}
          </span>
        )}
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {user?.fullName || user?.email}
        </div>
      </div>
    </header>
  );
}
