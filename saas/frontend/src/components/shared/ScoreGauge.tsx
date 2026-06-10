interface ScoreGaugeProps {
  score?: number | string | null;
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number): string {
  if (score >= 4.0) return '#48cfad';
  if (score >= 3.0) return '#ffce54';
  if (score >= 2.0) return '#fc6e51';
  return '#ed5565';
}

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const numScore = score != null ? parseFloat(String(score)) : null;

  const sizes = { sm: { w: 40, h: 40, font: 11 }, md: { w: 56, h: 56, font: 14 }, lg: { w: 72, h: 72, font: 18 } };
  const { w, h, font } = sizes[size];

  if (numScore == null || isNaN(numScore)) {
    return <span style={{ color: '#aab2bd', fontSize: font }}>—</span>;
  }

  const color = getColor(numScore);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: w,
      height: h,
      borderRadius: '50%',
      background: `${color}20`,
      border: `2px solid ${color}`,
      color,
      fontWeight: 700,
      fontSize: font,
    }}>
      {numScore.toFixed(1)}
    </span>
  );
}
