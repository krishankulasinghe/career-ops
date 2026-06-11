import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { usePortals, useRunScan, useScanResults } from '@/api/scanner';
import { useAddToPipeline } from '@/api/pipeline';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import { IconSearch, IconLoader, IconSend } from '@tabler/icons-react';

const STATUS_BADGE: Record<string, string> = {
  added: 'bg-success-lt',
  processed: 'bg-primary-lt',
  discarded: 'bg-secondary-lt',
};

export function ScannerPage() {
  const { data: portals } = usePortals();
  const { data: results, isLoading, refetch } = useScanResults();
  const runScan = useRunScan();
  const addToPipeline = useAddToPipeline();

  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [portalFilter, setPortalFilter] = useState('');

  const handleRunScan = async () => {
    await runScan.mutateAsync(selectedPortals.length > 0 ? selectedPortals : undefined);
    toast.success('Scan queued — results will appear shortly');
    setTimeout(() => refetch(), 3000);
  };

  const handleSendToPipeline = async () => {
    const urls = (results ?? []).filter((r) => selectedResults.includes(r.id)).map((r) => r.url);
    if (!urls.length) return;
    await addToPipeline.mutateAsync(urls);
    toast.success(`${urls.length} URL(s) sent to pipeline`);
    setSelectedResults([]);
  };

  const filteredResults = portalFilter
    ? (results ?? []).filter((r) => r.id.startsWith(portalFilter))
    : results ?? [];

  return (
    <Layout title="Scanner">
      <div className="row row-deck row-cards">

        {/* Control panel */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 w-100">
                <div>
                  <h5 className="card-title mb-0">Run Scan</h5>
                  <p className="small text-secondary mb-0 mt-1">
                    Fetch new job postings from all enabled portals or select specific ones.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleRunScan}
                  disabled={runScan.isPending}
                >
                  {runScan.isPending
                    ? <><IconLoader size={14} className="me-1" />Queueing…</>
                    : <><IconSearch size={14} className="me-1" />Run Scan Now</>
                  }
                </button>
              </div>
            </div>
            {portals && portals.length > 0 && (
              <div className="card-body">
                <p className="small text-secondary mb-2">Select portals to scan (leave unchecked to scan all):</p>
                <div className="d-flex flex-wrap gap-3">
                  {portals.filter((p) => p.enabled).map((p) => (
                    <div key={p.id} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`portal-${p.id}`}
                        checked={selectedPortals.includes(p.id)}
                        onChange={(e) => {
                          setSelectedPortals((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                          );
                        }}
                      />
                      <label className="form-check-label small" htmlFor={`portal-${p.id}`}>
                        {p.name}
                        {p.apiType && (
                          <span className="badge bg-info-lt ms-1" style={{ fontSize: 10 }}>
                            {p.apiType}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results card */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 w-100">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="card-title mb-0">Scan Results</h5>
                  <span className="badge bg-info-lt">
                    {results?.length ?? 0}
                  </span>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  {selectedResults.length > 0 && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleSendToPipeline}
                      disabled={addToPipeline.isPending}
                    >
                      <IconSend size={14} className="me-1" />
                      Send {selectedResults.length} to Pipeline
                    </button>
                  )}
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={portalFilter}
                    onChange={(e) => setPortalFilter(e.target.value)}
                  >
                    <option value="">All portals</option>
                    {portals?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              {isLoading ? (
                <div className="p-4">
                  <LoadingSpinner />
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center p-5 text-secondary">
                  <IconSearch size={32} className="d-block mx-auto mb-2 text-muted" />
                  No results yet. Run a scan to discover new job postings.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table card-table table-vcenter table-hover mb-0">
                    <thead>
                      <tr>
                        <th className="ps-3" style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            onChange={(e) =>
                              setSelectedResults(e.target.checked ? filteredResults.map((r) => r.id) : [])
                            }
                            checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                          />
                        </th>
                        <th>Title</th>
                        <th>Company</th>
                        <th>Location</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>First Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((r) => (
                        <tr key={r.id}>
                          <td className="ps-3">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedResults.includes(r.id)}
                              onChange={(e) =>
                                setSelectedResults((prev) =>
                                  e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                                )
                              }
                            />
                          </td>
                          <td>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="fw-semibold text-truncate d-inline-block"
                              style={{ maxWidth: 240 }}
                            >
                              {r.title}
                            </a>
                          </td>
                          <td>{r.company}</td>
                          <td className="text-secondary">{r.location ?? '—'}</td>
                          <td>
                            <span className="badge bg-secondary-lt" style={{ fontSize: 10 }}>
                              {r.source ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[r.status] ?? 'bg-secondary-lt'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="text-secondary">{r.firstSeen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
