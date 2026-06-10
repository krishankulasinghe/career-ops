interface KPICardProps {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export function KPICard({ title, value, change, icon, color = 'primary' }: KPICardProps) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="row align-items-center g-0">
          <div className="col">
            <h6 className="text-700 mb-1">{title}</h6>
            <h4 className="fw-bold mb-2">{value}</h4>
            {change && (
              <span className={`badge badge-soft-${change.positive ? 'success' : 'danger'} rounded-pill`}>
                <span className={`fas fa-caret-${change.positive ? 'up' : 'down'} me-1`}></span>
                {Math.abs(change.value)}%
              </span>
            )}
          </div>
          {icon && (
            <div className="col-auto ps-3">
              <div className={`icon-circle icon-circle-${color}`}>
                <span className={`${icon} text-${color}`}></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
