import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AuditEntry {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: unknown;
  createdAt: string;
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, action],
    queryFn: async () =>
      (await apiClient.get<AuditEntry[]>('/audit', { params: { page, limit: 50, action: action || undefined } })).data,
  });

  const handleExport = async () => {
    const all = await apiClient.get<AuditEntry[]>('/audit', { params: { limit: 5000 } });
    const csv = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'IP', 'User Agent'].join(','),
      ...all.data.map((e) =>
        [e.createdAt, e.action, e.entityType ?? '', e.entityId ?? '', e.ipAddress ?? '', (e.userAgent ?? '').replace(/,/g, ';')].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <Layout title="Audit Log">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Activity Log</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-control"
              style={{ width: 200 }}
              placeholder="Filter by action…"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>Export CSV</button>
          </div>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <table className="table">
            <thead>
              <tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>IP</th></tr>
            </thead>
            <tbody>
              {data?.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{e.action}</td>
                  <td style={{ fontSize: 12 }}>
                    {e.entityType && <span className="badge badge-secondary" style={{ fontSize: 10 }}>{e.entityType}</span>}
                    {e.entityId && <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{e.entityId.slice(0, 8)}…</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>Page {page}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      </div>
    </Layout>
  );
}
