import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { usePortals, useRunScan, useScanResults } from '@/api/scanner';
import { useAddToPipeline } from '@/api/pipeline';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  added: 'badge-success',
  processed: 'badge-primary',
  discarded: 'badge-secondary',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px' }}>Run Scan</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Fetch new job postings from all enabled portals or select specific ones.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleRunScan}
              disabled={runScan.isPending}
            >
              {runScan.isPending ? 'Queueing…' : 'Run Scan Now'}
            </button>
          </div>

          {portals && portals.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {portals.filter((p) => p.enabled).map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedPortals.includes(p.id)}
                    onChange={(e) => {
                      setSelectedPortals((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                      );
                    }}
                  />
                  {p.name}
                  {p.apiType && <span className="badge badge-secondary" style={{ fontSize: 10 }}>{p.apiType}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Scan Results ({results?.length ?? 0})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedResults.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSendToPipeline}
                  disabled={addToPipeline.isPending}
                >
                  Send {selectedResults.length} to Pipeline
                </button>
              )}
              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
              >
                <option value="">All portals</option>
                {portals?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner label="Loading results…" />
          ) : filteredResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No results yet. Run a scan to discover new job postings.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => setSelectedResults(e.target.checked ? filteredResults.map((r) => r.id) : [])}
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
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedResults.includes(r.id)}
                        onChange={(e) => setSelectedResults((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                        )}
                      />
                    </td>
                    <td>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {r.title}
                      </a>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.company}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.location ?? '—'}</td>
                    <td><span className="badge badge-secondary" style={{ fontSize: 10 }}>{r.source ?? '—'}</span></td>
                    <td><span className={`badge ${STATUS_COLORS[r.status] ?? 'badge-secondary'}`}>{r.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.firstSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
