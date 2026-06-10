import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ModeWeights {
  cvMatch?: number;
  northStar?: number;
  comp?: number;
  cultural?: number;
  redFlags?: number;
}

interface EvalMode {
  id: string;
  name: string;
  weights: ModeWeights;
  customBlocks: Array<{ id: string; name: string; prompt: string; weight: number }>;
  promptTemplateId: string | null;
  defaultArchetype: string | null;
  isDefault: boolean;
  createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  return res.json();
}

const BLOCK_LABELS: Record<string, string> = {
  cvMatch: 'CV Match',
  northStar: 'North Star / Role Fit',
  comp: 'Compensation',
  cultural: 'Cultural Fit',
  redFlags: 'Red Flags',
};

const DEFAULT_WEIGHTS: ModeWeights = { cvMatch: 1, northStar: 1, comp: 1, cultural: 1, redFlags: 1 };

export function EvalModesPage() {
  const qc = useQueryClient();
  const { data: modes, isLoading } = useQuery({
    queryKey: ['eval-modes'],
    queryFn: () => apiFetch<EvalMode[]>('/api/v1/evaluation-modes'),
  });

  const createMode = useMutation({
    mutationFn: (body: object) => apiFetch<EvalMode>('/api/v1/evaluation-modes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eval-modes'] }); toast.success('Mode created'); setShowCreate(false); },
  });

  const updateMode = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) => apiFetch<EvalMode>(`/api/v1/evaluation-modes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eval-modes'] }); toast.success('Mode updated'); setEditing(null); },
  });

  const deleteMode = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/evaluation-modes/${id}`, { method: 'DELETE', credentials: 'include' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eval-modes'] }); toast.success('Mode deleted'); },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<EvalMode | null>(null);
  const [form, setForm] = useState({ name: '', weights: { ...DEFAULT_WEIGHTS }, defaultArchetype: '', isDefault: false });

  const openEdit = (m: EvalMode) => {
    setEditing(m);
    setForm({ name: m.name, weights: { ...DEFAULT_WEIGHTS, ...m.weights }, defaultArchetype: m.defaultArchetype ?? '', isDefault: m.isDefault });
  };

  const handleSave = () => {
    const body = { name: form.name, weights: form.weights, defaultArchetype: form.defaultArchetype || undefined, isDefault: form.isDefault };
    if (editing) { updateMode.mutate({ id: editing.id, ...body }); }
    else { createMode.mutate(body); }
  };

  const modal = showCreate || editing !== null;

  return (
    <Layout title="Evaluation Modes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setEditing(null); setForm({ name: '', weights: { ...DEFAULT_WEIGHTS }, defaultArchetype: '', isDefault: false }); }}>
            + New Mode
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : !(modes ?? []).length ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No evaluation modes yet. Create one to customize scoring weights per archetype.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {modes!.map((m) => (
              <div key={m.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    {m.isDefault && <span style={{ fontSize: 11, background: 'rgba(93,156,236,0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>Default</span>}
                    {m.defaultArchetype && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Archetype: {m.defaultArchetype}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(m)}>Edit</button>
                    <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => deleteMode.mutate(m.id)}>Delete</button>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(m.weights ?? DEFAULT_WEIGHTS).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 140, color: 'var(--text-muted)' }}>{BLOCK_LABELS[key] ?? key}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--card-border)', borderRadius: 3 }}>
                        <div style={{ width: `${((val ?? 1) / 10) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                      </div>
                      <span style={{ width: 20, textAlign: 'right' }}>{val ?? 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditing(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Mode' : 'New Evaluation Mode'}</h2>
              <button className="modal-close" onClick={() => { setShowCreate(false); setEditing(null); }}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior IC, Startup Founder, Remote-Only" />
            </div>

            <div className="form-group">
              <label className="form-label">Default Archetype (auto-apply to this archetype)</label>
              <input className="form-control" value={form.defaultArchetype} onChange={(e) => setForm((f) => ({ ...f, defaultArchetype: e.target.value }))} placeholder="e.g. Senior IC" />
            </div>

            <div className="form-group">
              <label className="form-label">Scoring Weights (0–10)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.keys(DEFAULT_WEIGHTS).map((key) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 150, fontSize: 13 }}>{BLOCK_LABELS[key]}</span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={(form.weights as Record<string, number>)[key] ?? 1}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        weights: { ...f.weights, [key]: parseFloat(e.target.value) },
                      }))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: 'right', fontSize: 13 }}>
                      {(form.weights as Record<string, number>)[key] ?? 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
                Set as default mode
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={createMode.isPending || updateMode.isPending}>
                {(createMode.isPending || updateMode.isPending) ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
