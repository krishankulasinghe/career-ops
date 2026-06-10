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
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Evaluation Modes</h5>
                  <p className="text-600 fs--1 mb-0">Customize scoring weights per archetype or role type</p>
                </div>
                <div className="col-auto">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setShowCreate(true); setEditing(null); setForm({ name: '', weights: { ...DEFAULT_WEIGHTS }, defaultArchetype: '', isDefault: false }); }}
                  >
                    + New Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="col-12 text-center text-600 py-4">Loading…</div>
        ) : !(modes ?? []).length ? (
          <div className="col-12">
            <div className="card mb-3">
              <div className="card-body text-center text-600 py-5">
                No evaluation modes yet. Create one to customize scoring weights per archetype.
              </div>
            </div>
          </div>
        ) : (
          modes!.map((m) => (
            <div key={m.id} className="col-md-6 col-xl-4">
              <div className="card mb-3 h-100">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1 fw-bold">{m.name}</h6>
                      {m.isDefault && (
                        <span className="badge badge-soft-primary me-1">Default</span>
                      )}
                      {m.defaultArchetype && (
                        <div className="text-600 fs--2 mt-1">Archetype: {m.defaultArchetype}</div>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-falcon-default btn-sm" onClick={() => openEdit(m)}>Edit</button>
                      <button className="btn btn-falcon-danger btn-sm" onClick={() => deleteMode.mutate(m.id)}>Delete</button>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-2">
                    {Object.entries(m.weights ?? DEFAULT_WEIGHTS).map(([key, val]) => (
                      <div key={key} className="d-flex align-items-center gap-2 fs--2">
                        <span className="text-600" style={{ width: 140 }}>{BLOCK_LABELS[key] ?? key}</span>
                        <div className="flex-1 progress" style={{ height: 6 }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${((val ?? 1) / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-end" style={{ width: 20 }}>{val ?? 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditing(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Mode' : 'New Evaluation Mode'}</h2>
              <button className="modal-close" onClick={() => { setShowCreate(false); setEditing(null); }}>×</button>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semi-bold">Name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Senior IC, Startup Founder, Remote-Only"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semi-bold">Default Archetype (auto-apply to this archetype)</label>
              <input
                className="form-control"
                value={form.defaultArchetype}
                onChange={(e) => setForm((f) => ({ ...f, defaultArchetype: e.target.value }))}
                placeholder="e.g. Senior IC"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semi-bold">Scoring Weights (0–10)</label>
              <div className="d-flex flex-column gap-2">
                {Object.keys(DEFAULT_WEIGHTS).map((key) => (
                  <div key={key} className="d-flex align-items-center gap-3">
                    <span className="text-600 fs--1" style={{ width: 150 }}>{BLOCK_LABELS[key]}</span>
                    <input
                      type="range"
                      className="form-range flex-1"
                      min={0}
                      max={10}
                      step={0.5}
                      value={(form.weights as Record<string, number>)[key] ?? 1}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        weights: { ...f.weights, [key]: parseFloat(e.target.value) },
                      }))}
                    />
                    <span className="text-end fs--1" style={{ width: 28 }}>
                      {(form.weights as Record<string, number>)[key] ?? 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="isDefault">Set as default mode</label>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button className="btn btn-falcon-default" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancel</button>
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
