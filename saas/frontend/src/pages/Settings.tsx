import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name?: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await apiClient.get<{ keys: ApiKey[] }>('/auth/api-keys');
      return res.data.keys;
    },
  });
}

export function SettingsPage() {
  const { org } = useAuthStore();
  const { data: keys } = useApiKeys();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState('');
  const [rawKey, setRawKey] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  const createKey = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post<{ key: string; id: string; prefix: string; name?: string; createdAt: string }>('/auth/api-keys', { name });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setRawKey(data.key);
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/auth/api-keys/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    await createKey.mutateAsync(newKeyName);
    setNewKeyName('');
    setShowNewKeyModal(false);
  };

  const usage = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const res = await apiClient.get<{
        evaluationsCount: number;
        scansCount: number;
        limit: number;
        percent: number;
      }>('/billing/usage');
      return res.data;
    },
  });

  const evalPercent = usage.data
    ? Math.min(100, (usage.data.evaluationsCount / (org?.maxEvaluationsMo ?? 20)) * 100)
    : 0;

  return (
    <Layout title="Settings">
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Settings</h5>
                  <p className="text-600 fs--1 mb-0">Manage your organization, API keys, and usage</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="col-lg-6">
          <div className="card mb-3 h-100">
            <div className="card-header">
              <h5 className="mb-0">Organization</h5>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-600 fw-semi-bold">Name</dt>
                <dd className="col-7 mb-2">{org?.name}</dd>
                <dt className="col-5 text-600 fw-semi-bold">Slug</dt>
                <dd className="col-7 mb-2">{org?.slug}</dd>
                <dt className="col-5 text-600 fw-semi-bold">Plan</dt>
                <dd className="col-7 mb-0">
                  <span className="badge badge-soft-primary">{org?.plan}</span>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Usage */}
        {usage.data && (
          <div className="col-lg-6">
            <div className="card mb-3 h-100">
              <div className="card-header">
                <h5 className="mb-0">Usage This Month</h5>
              </div>
              <div className="card-body">
                <div className="mb-1 d-flex justify-content-between align-items-baseline">
                  <span className="text-600 fs--1 fw-semi-bold text-uppercase">Evaluations</span>
                  <span className="fs--1 text-600">
                    {usage.data.evaluationsCount} / {org?.maxEvaluationsMo}
                  </span>
                </div>
                <div className="fs-2 fw-bold text-primary mb-2">
                  {usage.data.evaluationsCount}
                  <span className="fs--1 text-600 fw-normal ms-1">/ {org?.maxEvaluationsMo}</span>
                </div>
                <div className="progress" style={{ height: 6 }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${evalPercent}%` }}
                    aria-valuenow={evalPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Keys */}
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">API Keys</h5>
                </div>
                <div className="col-auto">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNewKeyModal(true)}>
                    + Create Key
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              {rawKey && (
                <div className="alert alert-success d-flex align-items-start gap-2 mb-3" role="alert">
                  <div className="flex-1">
                    <div className="fw-semi-bold mb-1">New API Key — copy now, shown only once</div>
                    <code className="fs--1 text-break">{rawKey}</code>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0 ms-2">
                    <button
                      className="btn btn-falcon-default btn-sm"
                      onClick={() => { navigator.clipboard.writeText(rawKey); toast.success('Copied!'); }}
                    >
                      Copy
                    </button>
                    <button className="btn btn-falcon-default btn-sm" onClick={() => setRawKey('')}>Dismiss</button>
                  </div>
                </div>
              )}

              {keys?.length === 0 ? (
                <div className="text-center text-600 py-4">No API keys yet</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-sm fs--1 mb-0">
                    <thead className="bg-200 text-900">
                      <tr>
                        <th>Name</th>
                        <th>Prefix</th>
                        <th>Created</th>
                        <th>Last Used</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {keys?.map((k) => (
                        <tr key={k.id}>
                          <td className="align-middle">{k.name ?? 'Unnamed'}</td>
                          <td className="align-middle"><code>{k.keyPrefix}…</code></td>
                          <td className="text-600 fs--2 align-middle">{new Date(k.createdAt).toLocaleDateString()}</td>
                          <td className="text-600 fs--2 align-middle">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}</td>
                          <td className="align-middle text-end">
                            <button
                              className="btn btn-falcon-danger btn-sm"
                              onClick={() => { if (confirm('Revoke this key?')) revokeKey.mutateAsync(k.id); }}
                            >
                              Revoke
                            </button>
                          </td>
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

      {showNewKeyModal && (
        <div className="modal-overlay" onClick={() => setShowNewKeyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create API Key</h2>
              <button className="modal-close" onClick={() => setShowNewKeyModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateKey}>
              <div className="mb-3">
                <label className="form-label fw-semi-bold">Key Name (optional)</label>
                <input
                  className="form-control"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. CI/CD, CLI tool…"
                />
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button type="button" className="btn btn-falcon-default" onClick={() => setShowNewKeyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createKey.isPending}>
                  {createKey.isPending ? 'Creating…' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
