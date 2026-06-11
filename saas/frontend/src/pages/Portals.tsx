import { useState, useEffect, useRef } from 'react';
import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.min.css';
import { Layout } from '@/components/layout/Layout';
import { usePortals, useCreatePortal, useUpdatePortal, useDeletePortal, useImportPortals, useTitleFilters, useUpsertTitleFilters } from '@/api/scanner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import {
  IconFileImport,
  IconPlus,
  IconTrash,
  IconCircleCheck,
  IconCircleX,
  IconDeviceFloppy,
} from '@tabler/icons-react';

const API_TYPE_BADGE: Record<string, string> = {
  greenhouse: 'bg-success-lt',
  ashby: 'bg-primary-lt',
  lever: 'bg-warning-lt',
  workday: 'bg-secondary-lt',
  custom: 'bg-secondary-lt',
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
  const [apiTypeFilter, setApiTypeFilter] = useState<string[]>([]);

  const [positiveInput, setPositiveInput] = useState(
    titleFilters?.filter((f) => f.type === 'positive').map((f) => f.keyword).join(', ') ?? '',
  );
  const [negativeInput, setNegativeInput] = useState(
    titleFilters?.filter((f) => f.type === 'negative').map((f) => f.keyword).join(', ') ?? '',
  );

  // choices.js multi-select for ATS type filter
  const choicesRef = useRef<HTMLSelectElement>(null);
  const choicesInstance = useRef<Choices | null>(null);

  useEffect(() => {
    if (choicesRef.current && !choicesInstance.current) {
      choicesInstance.current = new Choices(choicesRef.current, {
        removeItemButton: true,
        placeholder: true,
        placeholderValue: 'Filter by ATS type…',
        searchEnabled: false,
      });
      choicesRef.current.addEventListener('change', () => {
        const values = Array.from(choicesRef.current?.selectedOptions ?? []).map((o) => o.value);
        setApiTypeFilter(values);
      });
    }
    return () => {
      choicesInstance.current?.destroy();
      choicesInstance.current = null;
    };
  }, []);

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

  if (isLoading) return <Layout title="Portals"><LoadingSpinner /></Layout>;

  const filteredPortals = apiTypeFilter.length > 0
    ? (portals ?? []).filter((p) => p.apiType && apiTypeFilter.includes(p.apiType))
    : portals ?? [];

  const enabledCount = (portals ?? []).filter((p) => p.enabled).length;

  return (
    <Layout title="Portals">
      <div className="row row-deck row-cards">

        {/* Portals card */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 w-100">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="card-title mb-0">Job Portals</h5>
                  <span className="badge bg-info-lt">{portals?.length ?? 0} total</span>
                  <span className="badge bg-success-lt">{enabledCount} enabled</span>
                </div>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  {/* choices.js multi-select */}
                  <select ref={choicesRef} multiple style={{ display: 'none' }}>
                    <option value="greenhouse">Greenhouse</option>
                    <option value="ashby">Ashby</option>
                    <option value="lever">Lever</option>
                    <option value="workday">Workday</option>
                    <option value="custom">Custom</option>
                  </select>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowImportModal(true)}>
                    <IconFileImport size={14} className="me-1" />
                    Import YAML
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => setShowAddModal(true)}>
                    <IconPlus size={14} className="me-1" />
                    Add Portal
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              {!portals?.length ? (
                <div className="p-4">
                  <EmptyState
                    title="No portals configured"
                    description="Add company career pages to scan for new job postings."
                    action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Portal</button>}
                  />
                </div>
              ) : filteredPortals.length === 0 ? (
                <div className="text-center p-4 text-secondary small">No portals match the selected filter.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table card-table table-vcenter table-hover mb-0">
                    <thead>
                      <tr>
                        <th className="ps-3">Name</th>
                        <th>ATS</th>
                        <th>Enabled</th>
                        <th>Careers URL</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPortals.map((p) => (
                        <tr key={p.id}>
                          <td className="ps-3 fw-semibold">{p.name}</td>
                          <td>
                            {p.apiType ? (
                              <span className={`badge ${API_TYPE_BADGE[p.apiType] ?? 'bg-secondary-lt'}`}>
                                {p.apiType}
                              </span>
                            ) : (
                              <span className="text-secondary">—</span>
                            )}
                          </td>
                          <td>
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={p.enabled}
                                onChange={(e) => updatePortal.mutateAsync({ id: p.id, enabled: e.target.checked })}
                              />
                            </div>
                          </td>
                          <td className="text-truncate" style={{ maxWidth: 260 }}>
                            {p.careersUrl ? (
                              <a href={p.careersUrl} target="_blank" rel="noopener noreferrer" className="small">
                                {p.careersUrl}
                              </a>
                            ) : (
                              <span className="text-secondary">—</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                if (confirm(`Delete ${p.name}?`)) deletePortal.mutateAsync(p.id);
                              }}
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title Filters card */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Title Filters</h5>
            </div>
            <div className="card-body">
              <p className="small text-secondary mb-3">
                Comma-separated keywords. Jobs must match at least one positive keyword (if any) and none of the negative keywords.
              </p>
              <div className="mb-3">
                <label className="form-label">
                  <IconCircleCheck size={14} className="text-success me-1" />
                  Positive keywords (include)
                </label>
                <input
                  className="form-control"
                  value={positiveInput}
                  onChange={(e) => setPositiveInput(e.target.value)}
                  placeholder="e.g. engineer, developer, ai, machine learning"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  <IconCircleX size={14} className="text-danger me-1" />
                  Negative keywords (exclude)
                </label>
                <input
                  className="form-control"
                  value={negativeInput}
                  onChange={(e) => setNegativeInput(e.target.value)}
                  placeholder="e.g. intern, junior, manager"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveFilters}
                disabled={upsertFilters.isPending}
              >
                <IconDeviceFloppy size={14} className="me-1" />
                {upsertFilters.isPending ? 'Saving…' : 'Save Filters'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Add Portal Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Portal</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
              </div>
              <form onSubmit={handleAdd}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Company Name <span className="text-danger">*</span></label>
                    <input
                      required
                      className="form-control"
                      value={newPortal.name}
                      onChange={(e) => setNewPortal((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Careers URL</label>
                    <input
                      className="form-control"
                      value={newPortal.careersUrl}
                      onChange={(e) => setNewPortal((p) => ({ ...p, careersUrl: e.target.value }))}
                      placeholder="https://jobs.ashbyhq.com/acme"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Override ATS Type (optional)</label>
                    <select
                      className="form-select"
                      value={newPortal.apiType}
                      onChange={(e) => setNewPortal((p) => ({ ...p, apiType: e.target.value }))}
                    >
                      <option value="">Auto-detect</option>
                      <option value="greenhouse">Greenhouse</option>
                      <option value="ashby">Ashby</option>
                      <option value="lever">Lever</option>
                      <option value="workday">Workday</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createPortal.isPending}>
                    {createPortal.isPending ? 'Adding…' : 'Add Portal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Import Portals</h5>
                <button type="button" className="btn-close" onClick={() => setShowImportModal(false)} />
              </div>
              <form onSubmit={handleImport}>
                <div className="modal-body">
                  <p className="small text-secondary mb-3">
                    Paste tab-separated lines: <code>Company Name{'\t'}Careers URL</code>
                  </p>
                  <textarea
                    className="form-control font-monospace small"
                    rows={8}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={'Acme\thttps://jobs.ashbyhq.com/acme\nBeta Corp\thttps://jobs.lever.co/betacorp'}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={importPortals.isPending}>
                    {importPortals.isPending ? 'Importing…' : 'Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
