import type { ComponentType } from 'react';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  Icon?: ComponentType<{ size?: number; stroke?: number; className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'green' | 'red' | 'yellow' | 'blue';
}

export function KPICard({ title, value, change, Icon, color = 'primary' }: KPICardProps) {
  return (
    <div className="card card-sm">
      <div className="card-body">
        <div className="row align-items-center">
          <div className="col-auto">
            {Icon && (
              <span className={`avatar bg-${color}-lt text-${color}`}>
                <Icon size={20} stroke={2} />
              </span>
            )}
          </div>
          <div className="col">
            <div className="font-weight-medium">{value}</div>
            <div className="text-secondary">{title}</div>
          </div>
          {change && (
            <div className="col-auto">
              <span className={`text-${change.positive ? 'green' : 'red'} d-inline-flex align-items-center lh-1`}>
                {change.positive
                  ? <IconTrendingUp size={16} stroke={2} className="me-1" />
                  : <IconTrendingDown size={16} stroke={2} className="me-1" />
                }
                {Math.abs(change.value)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
