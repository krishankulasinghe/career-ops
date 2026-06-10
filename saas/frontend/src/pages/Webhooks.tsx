import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastDelivery?: string;
  lastStatus?: number;
  failureCount: number;
  secret?: string;
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  statusCode?: number;
  success: boolean;
  attempt: number;
  createdAt: string;
}

const ALL_EVENTS = [
  'evaluation.completed',
  'scan.completed',
  'pdf.ready',
  'application.created',
  'member.joined',
];

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function WebhooksPage() {
  const qc = useQueryClient();
  const { data: hooks = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiFetch<Webhook[]>('/api/v1/webhooks'),
  });

  const create = useMutation({
    mutationFn: (body: object) => apiFetch<Webhook>('/api/v1/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success(`Webhook created — save the secret: ${w.secret}`);
      setShowCreate(false);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiFetch<Webhook>(`/api/v1/webhooks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/v1/webhooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook deleted'); },
  });

  const test = useMutation({
    mutationFn: (id: string) => apiFetch<{ success: boolean; statusCode?: number }>(`/api/v1/webhooks/${id}/test`, { method: 'POST' }),
    onSuccess: (r) => toast(r.success ? `✓ Test delivery succeeded (${r.statusCode})` : `✗ Test failed (${r.statusCode})`, { icon: r.success ? '✅' : '❌' }),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: '', events: [] as string[] });
  const [selectedHook, setSelectedHook] = useState<string | null>(null);

  const { data: deliveries = [] } = useQuery({
    queryKey: ['webhook-deliveries', selectedHook],
    queryFn: () => apiFetch<Delivery[]>(`/api/v1/webhooks/${selectedHook}/deliveries`),
    enabled: Boolean(selectedHook),
  });

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <Layout title="Webhooks">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Webhook</button>
        </div>

        {isLoading ? <div style={{ color: 'var(--text-muted)' }}>Loading…</div> : !hooks.length ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No webhooks yet. Requires Team or Enterprise plan.
          </div>
        ) : (
          hooks.map((h) => (
            <div key={h.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 6 }}>{h.url}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(h.events ?? []).map((ev) => (
                      <span key={ev} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(93,156,236,0.15)', color: 'var(--primary)' }}>{ev}</span>
                    ))}
                  </div>
                  {h.lastDelivery && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Last delivery: {new Date(h.lastDelivery).toLocaleString()}
                      {h.lastStatus && <span style={{ marginLeft: 8, color: h.lastStatus < 400 ? 'var(--success)' : 'var(--danger)' }}>{h.lastStatus}</span>}
                    </div>
                  )}
                  {h.failureCount >= 3 && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠ {h.failureCount} consecutive failures</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => test.mutate(h.id)} disabled={test.isPending}>Test</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setSelectedHook(selectedHook === h.id ? null : h.id)}>Log</button>
                  <button
                    className={`btn btn-sm ${h.active ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggle.mutate({ id: h.id, active: !h.active })}
                  >
                    {h.active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => del.mutate(h.id)}>Delete</button>
                </div>
              </div>

              {selectedHook === h.id && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--card-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Delivery Log</div>
                  {!deliveries.length ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No deliveries yet.</div>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Event</th><th>Status</th><th>Attempt</th><th>Time</th></tr></thead>
                      <tbody>
                        {deliveries.map((d) => (
                          <tr key={d.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.event}</td>
                            <td style={{ color: d.success ? 'var(--success)' : 'var(--danger)' }}>
                              {d.success ? '✓' : '✗'} {d.statusCode ?? 'n/a'}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>#{d.attempt}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(d.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Webhook</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Endpoint URL</label>
              <input className="form-control" type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://your-server.com/webhooks" />
            </div>
            <div className="form-group">
              <label className="form-label">Events</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALL_EVENTS.map((ev) => (
                  <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              The webhook secret will be shown once after creation. Store it securely.
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!form.url || !form.events.length || create.isPending} onClick={() => create.mutate(form)}>
                {create.isPending ? 'Creating…' : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
