interface StatusBadgeProps {
  status: string;
}

const statusBadgeClasses: Record<string, string> = {
  Evaluated: 'badge-soft-secondary',
  Applied: 'badge-soft-info',
  Responded: 'badge-soft-primary',
  Interview: 'badge-soft-warning',
  Offer: 'badge-soft-success',
  Rejected: 'badge-soft-danger',
  Discarded: 'badge-soft-secondary',
  SKIP: 'badge-soft-light',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const badgeClass = statusBadgeClasses[status] ?? 'badge-soft-secondary';
  return <span className={`badge rounded-pill ${badgeClass}`}>{status}</span>;
}
