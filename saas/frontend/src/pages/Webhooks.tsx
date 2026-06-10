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
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Webhooks</h5>
                  <p className="text-600 fs--1 mb-0">Receive real-time events from Career-Ops to your endpoints</p>
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
          <div className="col-12 text-center text-600 py-4">Loading…</div>
        ) : !hooks.length ? (
          <div className="col-12">
            <div className="card mb-3">
              <div className="card-body text-center text-600 py-5">
                No webhooks yet. Requires Team or Enterprise plan.
              </div>
            </div>
          </div>
        ) : (
          hooks.map((h) => (
            <div key={h.id} className="col-12">
              <div className="card mb-3">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <code className="fs--1">{h.url}</code>
                      <div className="d-flex gap-1 flex-wrap mt-2">
                        {(h.events ?? []).map((ev) => (
                          <span key={ev} className="badge badge-soft-primary fs--2">{ev}</span>
                        ))}
                      </div>
                      {h.lastDelivery && (
                        <div className="text-600 fs--2 mt-2">
                          Last delivery: {new Date(h.lastDelivery).toLocaleString()}
                          {h.lastStatus && (
                            <span className={`ms-2 ${h.lastStatus < 400 ? 'text-success' : 'text-danger'}`}>
                              {h.lastStatus}
                            </span>
                          )}
                        </div>
                      )}
                      {h.failureCount >= 3 && (
                        <div className="text-danger fs--2 mt-1">⚠ {h.failureCount} consecutive failures</div>
                      )}
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-shrink-0">
                      <button className="btn btn-falcon-default btn-sm" onClick={() => test.mutate(h.id)} disabled={test.isPending}>Test</button>
                      <button
                        className="btn btn-falcon-default btn-sm"
                        onClick={() => setSelectedHook(selectedHook === h.id ? null : h.id)}
                      >
                        {selectedHook === h.id ? 'Hide Log' : 'Log'}
                      </button>
                      <button
                        className={`btn btn-sm ${h.active ? 'btn-falcon-default' : 'btn-primary'}`}
                        onClick={() => toggle.mutate({ id: h.id, active: !h.active })}
                      >
                        {h.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-falcon-danger btn-sm" onClick={() => del.mutate(h.id)}>Delete</button>
                    </div>
                  </div>
                </div>

                {selectedHook === h.id && (
                  <div className="card-body border-top pt-3">
                    <h6 className="fw-semi-bold mb-3">Delivery Log</h6>
                    {!deliveries.length ? (
                      <div className="text-600 fs--1">No deliveries yet.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-sm fs--1 mb-0">
                          <thead className="bg-200 text-900">
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
                                <td className="font-monospace fs--2 align-middle">{d.event}</td>
                                <td className={`align-middle ${d.success ? 'text-success' : 'text-danger'}`}>
                                  {d.success ? '✓' : '✗'} {d.statusCode ?? 'n/a'}
                                </td>
                                <td className="text-600 align-middle">#{d.attempt}</td>
                                <td className="text-600 fs--2 align-middle">{new Date(d.createdAt).toLocaleString()}</td>
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
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Webhook</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semi-bold">Endpoint URL</label>
              <input
                className="form-control"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://your-server.com/webhooks"
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semi-bold">Events</label>
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
                    <label className="form-check-label fs--1" htmlFor={`ev-${ev}`}>{ev}</label>
                  </div>
                ))}
              </div>
            </div>
            <small className="text-600 d-block mb-3">
              The webhook secret will be shown once after creation. Store it securely.
            </small>
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button className="btn btn-falcon-default" onClick={() => setShowCreate(false)}>Cancel</button>
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
      )}
    </Layout>
  );
}
