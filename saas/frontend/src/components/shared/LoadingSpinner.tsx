interface LoadingSpinnerProps {
  size?: number;
  label?: string;
}

export function LoadingSpinner({ size = 24, label }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24 }}>
      <div className="spinner" style={{ width: size, height: size }} />
      {label && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{label}</div>}
    </div>
  );
}
