import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { usePipeline, useAddToPipeline, useProcessPipeline, useDeletePipelineItem } from '@/api/pipeline';
import toast from 'react-hot-toast';

const COLUMNS = [
  { status: 'pending', label: 'Pending', color: '#ffce54' },
  { status: 'processing', label: 'Processing', color: '#5d9cec' },
  { status: 'processed', label: 'Processed', color: '#48cfad' },
];

export function PipelinePage() {
  const [urlsInput, setUrlsInput] = useState('');
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

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = items.filter((i) => i.status === col.status);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <Layout title="Pipeline">
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <textarea
            className="form-control"
            rows={3}
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            placeholder="Paste job URLs (one per line)&#10;https://jobs.ashbyhq.com/company/job-id&#10;https://jobs.lever.co/company/job-id"
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={addToQueue.isPending}>
            {addToQueue.isPending ? 'Adding…' : '+ Add URLs'}
          </button>
          <button className="btn btn-secondary" onClick={handleProcess} disabled={processAll.isPending}>
            {processAll.isPending ? 'Processing…' : '▶ Process All'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {COLUMNS.map((col) => (
            <div key={col.status}>
              <div style={{
                padding: '8px 12px',
                background: `${col.color}20`,
                borderRadius: '4px 4px 0 0',
                borderLeft: `3px solid ${col.color}`,
                fontWeight: 600,
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>{col.label}</span>
                <span style={{ background: col.color, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 12 }}>
                  {grouped[col.status]?.length ?? 0}
                </span>
              </div>
              <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none', padding: 8, minHeight: 200 }}>
                {grouped[col.status]?.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>Empty</div>
                ) : (
                  grouped[col.status]?.map((item) => (
                    <div key={item.id} style={{
                      padding: '8px 10px',
                      border: '1px solid var(--card-border)',
                      borderRadius: 4,
                      marginBottom: 6,
                      fontSize: 13,
                      background: '#fff',
                    }}>
                      <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>{item.company ?? item.title ?? 'Job'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-all' }}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url.slice(0, 50)}…</a>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => deleteItem.mutateAsync(item.id)}
                          style={{ padding: '1px 6px', fontSize: 11 }}
                        >×</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
