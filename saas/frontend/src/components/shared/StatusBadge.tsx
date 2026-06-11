type ApplicationStatus =
  | 'Evaluated' | 'Applied' | 'Responded' | 'Interview'
  | 'Offer' | 'Rejected' | 'Discarded' | 'SKIP';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
}

const statusBadgeClasses: Record<string, string> = {
  Evaluated:  'bg-secondary-lt',
  Applied:    'bg-blue-lt text-blue',
  Responded:  'bg-teal-lt text-teal',
  Interview:  'bg-yellow-lt text-yellow',
  Offer:      'bg-green-lt text-green',
  Rejected:   'bg-red-lt text-red',
  Discarded:  'bg-secondary-lt',
  SKIP:       'bg-secondary-lt',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const badgeClass = statusBadgeClasses[status] ?? 'bg-secondary-lt';
  return <span className={`badge ${badgeClass}`}>{status}</span>;
}
