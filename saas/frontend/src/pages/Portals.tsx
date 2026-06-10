import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { usePortals, useCreatePortal, useUpdatePortal, useDeletePortal, useImportPortals, useTitleFilters, useUpsertTitleFilters } from '@/api/scanner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';

const API_TYPE_COLORS: Record<string, string> = {
  greenhouse: 'badge-success',
  ashby: 'badge-primary',
  lever: 'badge-warning',
  workday: 'badge-secondary',
  custom: 'badge-secondary',
};

export function PortalsPage() {
  const { data: portals, isLoading } = usePortals();
  const { data: titleFilters } = useTitleFilters();
  const createPortal = useCreatePortal();
  const updatePortal = useUpdatePortal();
  const deletePortal = useDeletePortal();
  const importPortals = useImportPortals();
  const upsertFilters = useUpsertTitleFilters();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [newPortal, setNewPortal] = useState({ name: '', careersUrl: '', apiType: '' });

  const [positiveInput, setPositiveInput] = useState(
    titleFilters?.filter((f) => f.type === 'positive').map((f) => f.keyword).join(', ') ?? '',
  );
  const [negativeInput, setNegativeInput] = useState(
    titleFilters?.filter((f) => f.type === 'negative').map((f) => f.keyword).join(', ') ?? '',
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPortal.mutateAsync({
      name: newPortal.name,
      careersUrl: newPortal.careersUrl || undefined,
      apiType: (newPortal.apiType as 'greenhouse' | 'ashby' | 'lever' | 'workday' | 'custom') || undefined,
      enabled: true,
    });
    toast.success('Portal added');
    setShowAddModal(false);
    setNewPortal({ name: '', careersUrl: '', apiType: '' });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lines = importText.trim().split('\n').filter(Boolean);
      const entries = lines.map((line) => {
        const [name, careers_url] = line.split('\t');
        return { name: name.trim(), careers_url: careers_url?.trim() };
      });
      const result = await importPortals.mutateAsync(entries);
      toast.success(`Imported: +${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);
      setShowImportModal(false);
      setImportText('');
    } catch {
      toast.error('Import failed');
    }
  };

  const handleSaveFilters = async () => {
    const positive = positiveInput.split(',').map((s) => s.trim()).filter(Boolean).map((k) => ({ type: 'positive' as const, keyword: k }));
    const negative = negativeInput.split(',').map((s) => s.trim()).filter(Boolean).map((k) => ({ type: 'negative' as const, keyword: k }));
    await upsertFilters.mutateAsync([...positive, ...negative]);
    toast.success('Filters saved');
  };

  if (isLoading) return <Layout title="Portals"><LoadingSpinner label="Loading portals…" /></Layout>;

  return (
    <Layout title="Portals">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Job Portals ({portals?.length ?? 0})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)}>Import YAML</button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add Portal</button>
            </div>
          </div>

          {!portals?.length ? (
            <EmptyState
              title="No portals configured"
              description="Add company career pages to scan for new job postings."
              action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Portal</button>}
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ATS</th>
                  <th>Enabled</th>
                  <th>Careers URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {portals.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      {p.apiType ? (
                        <span className={`badge ${API_TYPE_COLORS[p.apiType] ?? 'badge-secondary'}`}>{p.apiType}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => updatePortal.mutateAsync({ id: p.id, enabled: e.target.checked })}
                      />
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.careersUrl ? (
                        <a href={p.careersUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                          {p.careersUrl}
                        </a>
                      ) : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { if (confirm(`Delete ${p.name}?`)) deletePortal.mutateAsync(p.id); }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Title Filters</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Comma-separated keywords. Jobs must match at least one positive keyword (if any) and none of the negative keywords.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Positive keywords (include)</label>
              <input
                className="form-control"
                value={positiveInput}
                onChange={(e) => setPositiveInput(e.target.value)}
                placeholder="e.g. engineer, developer, ai, machine learning"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Negative keywords (exclude)</label>
              <input
                className="form-control"
                value={negativeInput}
                onChange={(e) => setNegativeInput(e.target.value)}
                placeholder="e.g. intern, junior, manager"
              />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleSaveFilters} disabled={upsertFilters.isPending}>
              {upsertFilters.isPending ? 'Saving…' : 'Save Filters'}
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Portal</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input required className="form-control" value={newPortal.name} onChange={(e) => setNewPortal((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="form-group">
                <label className="form-label">Careers URL</label>
                <input className="form-control" value={newPortal.careersUrl} onChange={(e) => setNewPortal((p) => ({ ...p, careersUrl: e.target.value }))} placeholder="https://jobs.ashbyhq.com/acme" />
              </div>
              <div className="form-group">
                <label className="form-label">Override ATS Type (optional)</label>
                <select className="form-control" value={newPortal.apiType} onChange={(e) => setNewPortal((p) => ({ ...p, apiType: e.target.value }))}>
                  <option value="">Auto-detect</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="ashby">Ashby</option>
                  <option value="lever">Lever</option>
                  <option value="workday">Workday</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createPortal.isPending}>
                  {createPortal.isPending ? 'Adding…' : 'Add Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Import Portals</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
              Paste tab-separated lines: <code>Company Name\tCareers URL</code>
            </p>
            <form onSubmit={handleImport}>
              <textarea
                className="form-control"
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"Acme\thttps://jobs.ashbyhq.com/acme\nBeta Corp\thttps://jobs.lever.co/betacorp"}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={importPortals.isPending}>
                  {importPortals.isPending ? 'Importing…' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
