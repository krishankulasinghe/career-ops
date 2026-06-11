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
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Webhooks</h5>
                  <p className="text-secondary small mb-0">Receive real-time events from Career-Ops to your endpoints</p>
                </div>
                <div className="col-auto">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                    + Add Webhook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="col-12 text-center text-secondary py-4">Loading…</div>
        ) : !hooks.length ? (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center text-secondary py-5">
                No webhooks yet. Requires Team or Enterprise plan.
              </div>
            </div>
          </div>
        ) : (
          hooks.map((h) => (
            <div key={h.id} className="col-12">
              <div className="card">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <code className="small">{h.url}</code>
                      <div className="d-flex gap-1 flex-wrap mt-2">
                        {(h.events ?? []).map((ev) => (
                          <span key={ev} className="badge bg-primary-lt">{ev}</span>
                        ))}
                      </div>
                      {h.lastDelivery && (
                        <div className="text-secondary small mt-2">
                          Last delivery: {new Date(h.lastDelivery).toLocaleString()}
                          {h.lastStatus && (
                            <span className={`ms-2 ${h.lastStatus < 400 ? 'text-success' : 'text-danger'}`}>
                              {h.lastStatus}
                            </span>
                          )}
                        </div>
                      )}
                      {h.failureCount >= 3 && (
                        <div className="text-danger small mt-1">⚠ {h.failureCount} consecutive failures</div>
                      )}
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-shrink-0">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => test.mutate(h.id)} disabled={test.isPending}>Test</button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedHook(selectedHook === h.id ? null : h.id)}
                      >
                        {selectedHook === h.id ? 'Hide Log' : 'Log'}
                      </button>
                      <button
                        className={`btn btn-sm ${h.active ? 'btn-outline-secondary' : 'btn-primary'}`}
                        onClick={() => toggle.mutate({ id: h.id, active: !h.active })}
                      >
                        {h.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => del.mutate(h.id)}>Delete</button>
                    </div>
                  </div>
                </div>

                {selectedHook === h.id && (
                  <div className="card-body border-top pt-3">
                    <h6 className="fw-medium mb-3">Delivery Log</h6>
                    {!deliveries.length ? (
                      <div className="text-secondary small">No deliveries yet.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table card-table table-vcenter table-hover table-sm mb-0">
                          <thead>
                            <tr>
                              <th>Event</th>
                              <th>Status</th>
                              <th>Attempt</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliveries.map((d) => (
                              <tr key={d.id}>
                                <td className="font-monospace small align-middle">{d.event}</td>
                                <td className={`align-middle ${d.success ? 'text-success' : 'text-danger'}`}>
                                  {d.success ? '✓' : '✗'} {d.statusCode ?? 'n/a'}
                                </td>
                                <td className="text-secondary align-middle">#{d.attempt}</td>
                                <td className="text-secondary small align-middle">{new Date(d.createdAt).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="modal modal-blur fade show d-block" tabIndex={-1} role="dialog" onClick={() => setShowCreate(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }} role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Webhook</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-medium">Endpoint URL</label>
                  <input
                    className="form-control"
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://your-server.com/webhooks"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Events</label>
                  <div className="d-flex flex-column gap-2">
                    {ALL_EVENTS.map((ev) => (
                      <div key={ev} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`ev-${ev}`}
                          checked={form.events.includes(ev)}
                          onChange={() => toggleEvent(ev)}
                        />
                        <label className="form-check-label small" htmlFor={`ev-${ev}`}>{ev}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <small className="text-secondary d-block">
                  The webhook secret will be shown once after creation. Store it securely.
                </small>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  disabled={!form.url || !form.events.length || create.isPending}
                  onClick={() => create.mutate(form)}
                >
                  {create.isPending ? 'Creating…' : 'Create Webhook'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
