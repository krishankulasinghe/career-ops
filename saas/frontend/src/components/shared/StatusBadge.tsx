interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  Evaluated: 'info',
  Applied: 'primary',
  Responded: 'success',
  Interview: 'warning',
  Offer: 'success',
  Rejected: 'danger',
  Discarded: 'secondary',
  SKIP: 'secondary',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColors[status] ?? 'secondary';
  return <span className={`badge badge-${color}`}>{status}</span>;
}
