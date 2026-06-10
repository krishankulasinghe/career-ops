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

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Organization</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 0', fontSize: 14, margin: 0 }}>
            <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Name</dt>
            <dd style={{ margin: 0 }}>{org?.name}</dd>
            <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Slug</dt>
            <dd style={{ margin: 0 }}>{org?.slug}</dd>
            <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Plan</dt>
            <dd style={{ margin: 0 }}><span className="badge badge-primary">{org?.plan}</span></dd>
          </dl>
        </div>

        {usage.data && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Usage This Month</h3>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Evaluations</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                  {usage.data.evaluationsCount} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>/ {org?.maxEvaluationsMo}</span>
                </div>
                <div style={{ height: 6, background: 'var(--card-border)', borderRadius: 3, width: 200, marginTop: 8 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (usage.data.evaluationsCount / (org?.maxEvaluationsMo ?? 20)) * 100)}%`,
                    background: 'var(--primary)',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>API Keys</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewKeyModal(true)}>+ Create Key</button>
          </div>

          {rawKey && (
            <div style={{ background: 'rgba(72,207,173,0.1)', border: '1px solid var(--success)', borderRadius: 4, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--success)' }}>New API Key — copy now, shown only once</div>
              <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{rawKey}</code>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 8 }}
                onClick={() => { navigator.clipboard.writeText(rawKey); toast.success('Copied!'); }}
              >
                Copy
              </button>
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => setRawKey('')}>Dismiss</button>
            </div>
          )}

          {keys?.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No API keys yet</div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Prefix</th><th>Created</th><th>Last Used</th><th></th></tr></thead>
              <tbody>
                {keys?.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name ?? 'Unnamed'}</td>
                    <td><code>{k.keyPrefix}…</code></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { if (confirm('Revoke this key?')) revokeKey.mutateAsync(k.id); }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
              <div className="form-group">
                <label className="form-label">Key Name (optional)</label>
                <input className="form-control" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. CI/CD, CLI tool…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewKeyModal(false)}>Cancel</button>
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
