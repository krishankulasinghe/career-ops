interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`d-flex justify-content-center align-items-center py-4 ${className}`}>
      <div
        className={`spinner-border text-primary${size === 'sm' ? ' spinner-border-sm' : ''}`}
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}
