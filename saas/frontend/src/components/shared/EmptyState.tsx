import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon = 'fas fa-box-open', action }: EmptyStateProps) {
  return (
    <div className="text-center py-6">
      <div className="mb-3">
        <span className={`${icon} fs-2 text-300`}></span>
      </div>
      <h5 className="text-700">{title}</h5>
      {description && <p className="text-500 fs--1 mb-3">{description}</p>}
      {action}
    </div>
  );
}
