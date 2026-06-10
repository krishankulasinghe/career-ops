import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 48 }}>{icon}</div>
      <h3>{title}</h3>
      {description && <p style={{ color: 'var(--text-muted)' }}>{description}</p>}
      {action}
    </div>
  );
}
