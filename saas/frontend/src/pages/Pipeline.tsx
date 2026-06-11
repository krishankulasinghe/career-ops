import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { usePipeline, useAddToPipeline, useProcessPipeline, useDeletePipelineItem } from '@/api/pipeline';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-warning-lt',
  processing: 'bg-primary-lt',
  processed: 'bg-success-lt',
};

export function PipelinePage() {
  const [urlsInput, setUrlsInput] = useState('');
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading } = usePipeline();
  const addToQueue = useAddToPipeline();
  const processAll = useProcessPipeline();
  const deleteItem = useDeletePipelineItem();

  const handleAdd = async () => {
    const urls = urlsInput.split('\n').map((u) => u.trim()).filter(Boolean);
    if (!urls.length) return;
    const result = await addToQueue.mutateAsync(urls);
    toast.success(`Added ${result.added} URLs (${result.skipped} skipped)`);
    setUrlsInput('');
  };

  const handleProcess = async () => {
    const result = await processAll.mutateAsync();
    toast.success(`Queued ${result.enqueued} evaluations`);
  };

  const filtered = search
    ? items.filter(
        (i) =>
          i.url.toLowerCase().includes(search.toLowerCase()) ||
          (i.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (i.title ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <Layout title="Pipeline">
      {/* Add URLs card */}
      <div className="card mb-3">
        <div className="card-header">
          <h5 className="card-title mb-0">Add URLs to Pipeline</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label fw-semibold">Job URLs (one per line)</label>
            <textarea
              className="form-control font-monospace"
              rows={3}
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder={"Paste job URLs (one per line)\nhttps://jobs.ashbyhq.com/company/job-id\nhttps://jobs.lever.co/company/job-id"}
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={addToQueue.isPending || !urlsInput.trim()}
            >
              {addToQueue.isPending ? 'Adding…' : '+ Add URLs'}
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={handleProcess}
              disabled={processAll.isPending || pendingCount === 0}
            >
              {processAll.isPending ? 'Processing…' : `Process All${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline table card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <h5 className="card-title mb-0">Pipeline Items</h5>
          <div style={{ maxWidth: 280, width: '100%' }}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search by URL or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4">
              <LoadingSpinner />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-5">
              {search ? 'No results match your search.' : 'No items in pipeline. Add some URLs above.'}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table card-table table-vcenter table-hover mb-0">
                <thead>
                  <tr>
                    <th>Company / Title</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-semibold text-nowrap">
                        {item.company ?? item.title ?? <span className="text-secondary">—</span>}
                      </td>
                      <td>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary text-decoration-none"
                          title={item.url}
                        >
                          {item.url.length > 55 ? `${item.url.slice(0, 55)}…` : item.url}
                        </a>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[item.status] ?? 'bg-secondary-lt'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-nowrap text-secondary">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => deleteItem.mutateAsync(item.id)}
                          title="Remove"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="card-footer d-flex align-items-center justify-content-between py-2 small text-secondary">
            <span>Showing {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}</span>
            {pendingCount > 0 && (
              <span className="badge bg-warning-lt">{pendingCount} pending</span>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
