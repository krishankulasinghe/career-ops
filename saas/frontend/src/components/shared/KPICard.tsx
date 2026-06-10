interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function KPICard({ label, value, sub, color = 'var(--primary)' }: KPICardProps) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
