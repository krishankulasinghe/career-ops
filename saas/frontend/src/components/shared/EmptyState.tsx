import type { ComponentType, ReactNode } from 'react';
import { IconInbox } from '@tabler/icons-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  Icon?: ComponentType<{ size?: number; stroke?: number; className?: string }>;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  Icon = IconInbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={48} stroke={1} className="text-secondary" />
      </div>
      <p className="empty-title">{title}</p>
      {description && <p className="empty-subtitle text-secondary">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
