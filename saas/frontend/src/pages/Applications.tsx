import { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useApplications, useDeleteApplication, useImportApplications, useCreateApplication } from '@/api/applications';
import toast from 'react-hot-toast';

const STATUSES = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];

export function ApplicationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [importText, setImportText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useApplications({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
    sort,
    order,
  });

  const deleteApp = useDeleteApplication();
  const importApps = useImportApplications();
  const createApp = useCreateApplication();

  const toggleSort = useCallback((col: string) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(col); setOrder('desc'); }
  }, [sort]);

  const handleImport = async () => {
    if (!importText.trim()) return;
    const result = await importApps.mutateAsync(importText);
    toast.success(`Imported ${result.created} applications (${result.skipped} skipped)`);
    setShowImport(false);
    setImportText('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    await deleteApp.mutateAsync(id);
    toast.success('Application deleted');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} application(s)?`)) return;
    await Promise.all([...selected].map((id) => deleteApp.mutateAsync(id)));
    setSelected(new Set());
    toast.success(`Deleted ${selected.size} applications`);
  };

  const [newApp, setNewApp] = useState({ company: '', role: '', date: new Date().toISOString().split('T')[0], status: 'Evaluated' });

  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.company || !newApp.role) return;
    await createApp.mutateAsync(newApp);
    toast.success('Application added');
    setShowAdd(false);
    setNewApp({ company: '', role: '', date: new Date().toISOString().split('T')[0], status: 'Evaluated' });
  };

  return (
    <Layout title="Applications">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="form-control"
          placeholder="Search company or role…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 220 }}
        />
        <select
          className="form-control"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ maxWidth: 160 }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
              Delete ({selected.size})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>Import</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading applications…" />
      ) : data?.applications.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No applications yet"
          description="Start by evaluating a job posting or importing your existing data."
          action={<button className="btn btn-primary" onClick={() => setShowImport(true)}>Import applications.md</button>}
        />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(data?.applications.map((a) => a.id) ?? []));
                    else setSelected(new Set());
                  }} />
                </th>
                <th style={{ width: 36 }}>#</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>Date {sort === 'date' && (order === 'asc' ? '↑' : '↓')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('company')}>Company {sort === 'company' && (order === 'asc' ? '↑' : '↓')}</th>
                <th>Role</th>
                <th style={{ cursor: 'pointer', width: 80 }} onClick={() => toggleSort('score')}>Score {sort === 'score' && (order === 'asc' ? '↑' : '↓')}</th>
                <th style={{ cursor: 'pointer', width: 110 }} onClick={() => toggleSort('status')}>Status {sort === 'status' && (order === 'asc' ? '↑' : '↓')}</th>
                <th style={{ width: 50 }}>PDF</th>
                <th style={{ width: 60 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(app.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(app.id);
                        else next.delete(app.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{app.seqNumber}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.date}</td>
                  <td style={{ fontWeight: 500 }}>{app.company}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{app.role}</td>
                  <td><ScoreGauge score={app.score} size="sm" /></td>
                  <td><StatusBadge status={app.status} /></td>
                  <td style={{ textAlign: 'center' }}>{app.hasPdf ? '✅' : '—'}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(app.id)}
                      style={{ padding: '2px 8px' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(data?.pagination.hasMore || page > 1) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--card-border)' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>Page {page}</span>
              <button className="btn btn-secondary btn-sm" disabled={!data?.pagination.hasMore} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Import applications.md</h2>
              <button className="modal-close" onClick={() => setShowImport(false)}>×</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Paste the contents of your applications.md file:</p>
            <textarea
              className="form-control"
              rows={12}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="| # | Date | Company | Role | Score | Status | ..."
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importApps.isPending}>
                {importApps.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Application</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAddApp}>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-control" value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-control" value={newApp.role} onChange={(e) => setNewApp({ ...newApp, role: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-control" value={newApp.date} onChange={(e) => setNewApp({ ...newApp, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={newApp.status} onChange={(e) => setNewApp({ ...newApp, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createApp.isPending}>
                  {createApp.isPending ? 'Adding…' : 'Add Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
