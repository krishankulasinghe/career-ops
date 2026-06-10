import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { usePortals, useRunScan, useScanResults } from '@/api/scanner';
import { useAddToPipeline } from '@/api/pipeline';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  added: 'badge-soft-success',
  processed: 'badge-soft-primary',
  discarded: 'badge-soft-secondary',
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
      <div className="d-flex flex-column gap-3">

        {/* Control panel */}
        <div className="card mb-3">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h5 className="mb-0">Run Scan</h5>
                <p className="fs--1 text-500 mb-0 mt-1">
                  Fetch new job postings from all enabled portals or select specific ones.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleRunScan}
                disabled={runScan.isPending}
              >
                <span className={`fas ${runScan.isPending ? 'fa-spinner fa-spin' : 'fa-search'} me-1`} />
                {runScan.isPending ? 'Queueing…' : 'Run Scan Now'}
              </button>
            </div>
          </div>
          {portals && portals.length > 0 && (
            <div className="card-body">
              <p className="fs--1 text-500 mb-2">Select portals to scan (leave unchecked to scan all):</p>
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
                    <label className="form-check-label fs--1" htmlFor={`portal-${p.id}`}>
                      {p.name}
                      {p.apiType && (
                        <span className="badge badge-soft-info ms-1" style={{ fontSize: 10 }}>
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

        {/* Results card */}
        <div className="card mb-3">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">Scan Results</h5>
                <span className="badge badge-soft-info">
                  {results?.length ?? 0}
                </span>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {selectedResults.length > 0 && (
                  <button
                    className="btn btn-sm btn-falcon-primary"
                    onClick={handleSendToPipeline}
                    disabled={addToPipeline.isPending}
                  >
                    <span className="fas fa-paper-plane me-1" />
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
              <div className="text-center p-5 text-500">
                <span className="fas fa-search fs-2 d-block mb-2 text-300" />
                No results yet. Run a scan to discover new job postings.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm fs--1 mb-0">
                  <thead className="bg-light">
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
                        <td className="text-500">{r.location ?? '—'}</td>
                        <td>
                          <span className="badge badge-soft-secondary" style={{ fontSize: 10 }}>
                            {r.source ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-soft-secondary'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="text-500">{r.firstSeen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
