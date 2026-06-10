import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface DataResidencyInfo {
  region: string;
  label: string;
  endpoint: string;
  lockedAt?: string | null;
  availableRegions: Array<{ value: string; label: string }>;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  return res.json();
}

const REGION_FLAGS: Record<string, string> = {
  'us-east-1': '🇺🇸',
  'eu-west-1': '🇪🇺',
  'ap-southeast-1': '🇸🇬',
};

export function DataResidencyPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['data-residency'],
    queryFn: () => apiFetch<DataResidencyInfo>('/api/v1/settings/data-residency'),
    select: (d: DataResidencyInfo) => d,
  });

  const save = useMutation({
    mutationFn: () => apiFetch('/api/v1/settings/data-residency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: selected }),
    }),
    onSuccess: () => {
      toast.success('Data residency region saved');
      qc.invalidateQueries({ queryKey: ['data-residency'] });
      setConfirmed(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Sync selected when data loads
  if (data && !selected) setSelected(data.region);

  const hasChanged = selected !== data?.region;

  return (
    <Layout title="Data Residency">
      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Data Residency Region</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Choose the AWS region where your organization's data is stored and processed.
            This affects your database, Redis, and file storage locations.
            Requires <strong>Team or Enterprise</strong> plan.
          </p>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(data?.availableRegions ?? []).map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: `2px solid ${selected === r.value ? 'var(--primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    background: selected === r.value ? 'rgba(93,156,236,0.06)' : undefined,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="region"
                    value={r.value}
                    checked={selected === r.value}
                    onChange={() => { setSelected(r.value); setConfirmed(false); }}
                  />
                  <span style={{ fontSize: 20 }}>{REGION_FLAGS[r.value] ?? '🌐'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.value}</div>
                    {r.value === 'eu-west-1' && (
                      <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>GDPR compliant — data never leaves the EU</div>
                    )}
                  </div>
                  {data?.region === r.value && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 12,
                      background: 'rgba(76,175,80,0.15)', color: 'var(--success)',
                    }}>
                      Current
                    </span>
                  )}
                </label>
              ))}

              {/* Confirmation for changes */}
              {hasChanged && (
                <div style={{
                  marginTop: 8,
                  padding: 16,
                  borderRadius: 8,
                  background: 'rgba(255,152,0,0.1)',
                  border: '1px solid var(--warning)',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 8 }}>
                    ⚠ Region change requires data migration
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Changing your data residency region will migrate all your data to the new region.
                    This process takes 1–4 hours and requires a maintenance window.
                    Your team will receive an email confirmation before migration begins.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I understand data migration is required and have informed my team
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !hasChanged || (hasChanged && !confirmed)}
                >
                  {save.isPending ? 'Saving…' : 'Save Region'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current status card */}
        {data && (
          <div className="card">
            <h4 style={{ marginTop: 0 }}>Current Configuration</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {([
                  ['Region', `${REGION_FLAGS[data.region] ?? '🌐'} ${data.label}`],
                  ['Region ID', data.region],
                  ['API Endpoint', data.endpoint],
                  ['Locked Since', data.lockedAt ? new Date(data.lockedAt).toLocaleDateString() : 'Not locked'],
                ] as [string, string][]).map(([key, val]) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--text-muted)', width: 140 }}>{key}</td>
                    <td style={{ padding: '8px 0', fontFamily: key === 'Region ID' || key === 'API Endpoint' ? 'monospace' : undefined }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
