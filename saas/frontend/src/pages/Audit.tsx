import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { IconSearch, IconDownload, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

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
          <h5 className="card-title mb-0">Activity Log</h5>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="search"
              className="form-control form-control-sm"
              style={{ width: 220 }}
              placeholder="Search action or resource…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setLocalPage(0); }}
            />
            <button className="btn btn-sm btn-outline-secondary" onClick={handleExport}>
              <IconDownload size={14} className="me-1" />Export CSV
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
              Icon={IconSearch}
              title="No audit entries"
              description="Audit events will appear here as actions are performed."
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-vcenter card-table table-hover table-sm small mb-0">
                <thead>
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
                      <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <code className="small text-body">{e.action}</code>
                      </td>
                      <td>
                        {e.entityType && (
                          <span className="badge bg-secondary-lt rounded-pill me-1 small">
                            {e.entityType}
                          </span>
                        )}
                        {e.entityId && (
                          <span className="text-secondary small">{e.entityId.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="text-secondary">{e.ipAddress ?? '—'}</td>
                      <td className="text-secondary">
                        {e.userId && (
                          <span className="small">uid:{e.userId.slice(0, 8)}…</span>
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
            <span className="small text-secondary">{startItem}–{endItem} of {total}</span>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={localPage === 0}
              onClick={() => setLocalPage((p) => p - 1)}
            >
              <IconChevronLeft size={14} />
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={endItem >= total}
              onClick={() => setLocalPage((p) => p + 1)}
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
