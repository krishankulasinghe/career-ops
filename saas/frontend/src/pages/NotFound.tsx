import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

export function NotFoundPage() {
  return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--card-border)' }}>404</div>
        <h2 style={{ color: 'var(--text-secondary)' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)' }}>The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary">← Back to Dashboard</Link>
      </div>
    </Layout>
  );
}
