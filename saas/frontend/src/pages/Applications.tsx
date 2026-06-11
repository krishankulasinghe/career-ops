import { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useApplications, useDeleteApplication, useImportApplications, useCreateApplication } from '@/api/applications';
import toast from 'react-hot-toast';
import { IconList } from '@tabler/icons-react';

const STATUSES = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Rejected', 'Discarded', 'SKIP'];
const PAGE_SIZE = 25;

export function ApplicationsPage() {
  const [apiPage, setApiPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [localPage, setLocalPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [importText, setImportText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useApplications({
    page: apiPage,
    limit: 100,
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

  const [newApp, setNewApp] = useState({
    company: '',
    role: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Evaluated',
  });

  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.company || !newApp.role) return;
    await createApp.mutateAsync(newApp);
    toast.success('Application added');
    setShowAdd(false);
    setNewApp({ company: '', role: '', date: new Date().toISOString().split('T')[0], status: 'Evaluated' });
  };

  const allApps = data?.applications ?? [];
  const total = allApps.length;
  const startItem = localPage * PAGE_SIZE + 1;
  const endItem = Math.min((localPage + 1) * PAGE_SIZE, total);
  const paged = allApps.slice(localPage * PAGE_SIZE, (localPage + 1) * PAGE_SIZE);

  const SortIcon = ({ col }: { col: string }) =>
    sort === col ? <span className={`fas fa-sort-${order === 'asc' ? 'up' : 'down'} ms-1 text-500`}></span> : null;

  return (
    <Layout title="Applications">
      {isLoading ? (
        <LoadingSpinner />
      ) : total === 0 && !search && !status ? (
        <EmptyState
          Icon={IconList}
          title="No applications yet"
          description="Start by evaluating a job posting or importing your existing data."
          action={<button className="btn btn-primary" onClick={() => setShowImport(true)}>Import applications.md</button>}
        />
      ) : (
        <div className="card mb-3">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 className="mb-0">Applications</h5>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              {selected.size > 0 && (
                <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
                  Delete ({selected.size})
                </button>
              )}
              <select
                className="form-select form-select-sm"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setLocalPage(0); setApiPage(1); }}
                style={{ width: 150 }}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Search company or role…"
                style={{ width: 200 }}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setLocalPage(0); setApiPage(1); }}
              />
              <button className="btn btn-sm btn-falcon-default" onClick={() => setShowImport(true)}>
                <span className="fas fa-file-import me-1"></span>Import
              </button>
              <button className="btn btn-sm btn-falcon-primary" onClick={() => setShowAdd(true)}>
                <span className="fas fa-plus me-1"></span>Add
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            {total === 0 ? (
              <div className="py-4 text-center text-500 fs--1">No applications match your search.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm fs--1 mb-0 overflow-hidden">
                  <thead className="bg-200 text-900">
                    <tr>
                      <th style={{ width: 32 }}>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) setSelected(new Set(allApps.map((a) => a.id)));
                            else setSelected(new Set());
                          }}
                          checked={selected.size === allApps.length && allApps.length > 0}
                        />
                      </th>
                      <th style={{ width: 36 }}>#</th>
                      <th
                        className="cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleSort('date')}
                      >
                        Date <SortIcon col="date" />
                      </th>
                      <th
                        className="cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleSort('company')}
                      >
                        Company <SortIcon col="company" />
                      </th>
                      <th>Role</th>
                      <th
                        className="cursor-pointer"
                        style={{ cursor: 'pointer', width: 90 }}
                        onClick={() => toggleSort('score')}
                      >
                        Score <SortIcon col="score" />
                      </th>
                      <th
                        className="cursor-pointer"
                        style={{ cursor: 'pointer', width: 120 }}
                        onClick={() => toggleSort('status')}
                      >
                        Status <SortIcon col="status" />
                      </th>
                      <th style={{ width: 50 }}>PDF</th>
                      <th style={{ width: 90 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((app) => (
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
                        <td className="text-500">{app.seqNumber}</td>
                        <td className="text-500">{app.date}</td>
                        <td className="fw-semi-bold">{app.company}</td>
                        <td className="text-700">{app.role}</td>
                        <td><ScoreGauge score={app.score} size="sm" /></td>
                        <td><StatusBadge status={app.status} /></td>
                        <td className="text-center">{app.hasPdf ? '✅' : '—'}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <a
                              className="btn btn-sm btn-falcon-default"
                              href={`/evaluations/${app.id}`}
                            >
                              View
                            </a>
                            <button
                              className="btn btn-sm btn-falcon-danger"
                              onClick={() => handleDelete(app.id)}
                              title="Delete"
                            >
                              <span className="fas fa-times"></span>
                            </button>
                          </div>
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

          {data?.pagination.hasMore && (
            <div className="card-footer text-center">
              <button
                className="btn btn-sm btn-falcon-default"
                onClick={() => setApiPage((p) => p + 1)}
              >
                Load more
              </button>
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
                <input
                  className="form-control"
                  value={newApp.company}
                  onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  className="form-control"
                  value={newApp.role}
                  onChange={(e) => setNewApp({ ...newApp, role: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newApp.date}
                  onChange={(e) => setNewApp({ ...newApp, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={newApp.status}
                  onChange={(e) => setNewApp({ ...newApp, status: e.target.value })}
                >
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
