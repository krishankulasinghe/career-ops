import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

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

const PAGE_SIZE = 25;

export function AuditPage() {
  const [apiPage, setApiPage] = useState(1);
  const [search, setSearch] = useState('');
  const [localPage, setLocalPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', apiPage, search],
    queryFn: async () =>
      (
        await apiClient.get<AuditEntry[]>('/audit', {
          params: { page: apiPage, limit: 100, action: search || undefined },
        })
      ).data,
  });

  const handleExport = async () => {
    const all = await apiClient.get<AuditEntry[]>('/audit', { params: { limit: 5000 } });
    const csv = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'IP', 'User Agent'].join(','),
      ...all.data.map((e) =>
        [
          e.createdAt,
          e.action,
          e.entityType ?? '',
          e.entityId ?? '',
          e.ipAddress ?? '',
          (e.userAgent ?? '').replace(/,/g, ';'),
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const entries = data ?? [];
  const filtered = search
    ? entries.filter(
        (e) =>
          e.action.toLowerCase().includes(search.toLowerCase()) ||
          (e.entityType ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const total = filtered.length;
  const startItem = localPage * PAGE_SIZE + 1;
  const endItem = Math.min((localPage + 1) * PAGE_SIZE, total);
  const paged = filtered.slice(localPage * PAGE_SIZE, (localPage + 1) * PAGE_SIZE);

  return (
    <Layout title="Audit Log">
      <div className="card mb-3">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0">Activity Log</h5>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="search"
              className="form-control form-control-sm"
              style={{ width: 220 }}
              placeholder="Search action or resource…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setLocalPage(0); }}
            />
            <button className="btn btn-sm btn-falcon-default" onClick={handleExport}>
              <span className="fas fa-download me-1"></span>Export CSV
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4">
              <LoadingSpinner />
            </div>
          ) : total === 0 ? (
            <EmptyState
              icon="🔍"
              title="No audit entries"
              description="Audit events will appear here as actions are performed."
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm fs--1 mb-0 overflow-hidden">
                <thead className="bg-200 text-900">
                  <tr>
                    <th style={{ width: 170 }}>Time</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th style={{ width: 130 }}>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e) => (
                    <tr key={e.id}>
                      <td className="text-500" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <code className="fs--2 text-700">{e.action}</code>
                      </td>
                      <td>
                        {e.entityType && (
                          <span className="badge badge-soft-secondary rounded-pill me-1 fs--2">
                            {e.entityType}
                          </span>
                        )}
                        {e.entityId && (
                          <span className="text-500 fs--2">{e.entityId.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="text-500">{e.ipAddress ?? '—'}</td>
                      <td className="text-500">
                        {e.userId && (
                          <span className="fs--2">uid:{e.userId.slice(0, 8)}…</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="card-footer d-flex justify-content-end align-items-center gap-2">
            <span className="fs--1 text-600">{startItem}–{endItem} of {total}</span>
            <button
              className="btn btn-sm btn-falcon-default"
              disabled={localPage === 0}
              onClick={() => setLocalPage((p) => p - 1)}
            >
              <span className="fas fa-chevron-left"></span>
            </button>
            <button
              className="btn btn-sm btn-falcon-default"
              disabled={endItem >= total}
              onClick={() => setLocalPage((p) => p + 1)}
            >
              <span className="fas fa-chevron-right"></span>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
