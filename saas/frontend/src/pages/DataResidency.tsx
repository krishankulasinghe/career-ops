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
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Data Residency</h5>
                  <p className="text-600 fs--1 mb-0">Choose the region where your organization's data is stored and processed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Region Selection</h5>
            </div>
            <div className="card-body">
              <p className="text-600 fs--1 mb-3">
                Choose the AWS region where your organization's data is stored and processed.
                This affects your database, Redis, and file storage locations.
                Requires <strong>Team or Enterprise</strong> plan.
              </p>

              {isLoading ? (
                <div className="text-center text-600 py-4">Loading…</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {(data?.availableRegions ?? []).map((r) => (
                    <label
                      key={r.value}
                      className={`d-flex align-items-center gap-3 p-3 rounded border-2 border cursor-pointer ${selected === r.value ? 'border-primary bg-soft-primary' : 'border'}`}
                      style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                    >
                      <input
                        type="radio"
                        className="form-check-input mt-0"
                        name="region"
                        value={r.value}
                        checked={selected === r.value}
                        onChange={() => { setSelected(r.value); setConfirmed(false); }}
                      />
                      <span style={{ fontSize: 22 }}>{REGION_FLAGS[r.value] ?? '🌐'}</span>
                      <div className="flex-1">
                        <div className="fw-semi-bold">{r.label}</div>
                        <div className="font-monospace text-600 fs--2">{r.value}</div>
                        {r.value === 'eu-west-1' && (
                          <div className="text-success fs--2 mt-1">GDPR compliant — data never leaves the EU</div>
                        )}
                      </div>
                      {data?.region === r.value && (
                        <span className="badge badge-soft-success ms-auto">Current</span>
                      )}
                    </label>
                  ))}

                  {hasChanged && (
                    <div className="alert alert-warning mb-0" role="alert">
                      <div className="fw-semi-bold mb-2">⚠ Region change requires data migration</div>
                      <p className="fs--1 mb-3">
                        Changing your data residency region will migrate all your data to the new region.
                        This process takes 1–4 hours and requires a maintenance window.
                        Your team will receive an email confirmation before migration begins.
                      </p>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="confirmMigration"
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                        />
                        <label className="form-check-label fs--1" htmlFor="confirmMigration">
                          I understand data migration is required and have informed my team
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-end mt-2">
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
          </div>

          {/* Current status card */}
          {data && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">Current Configuration</h5>
              </div>
              <div className="card-body p-0">
                <table className="table table-sm fs--1 mb-0">
                  <tbody>
                    {([
                      ['Region', `${REGION_FLAGS[data.region] ?? '🌐'} ${data.label}`],
                      ['Region ID', data.region],
                      ['API Endpoint', data.endpoint],
                      ['Locked Since', data.lockedAt ? new Date(data.lockedAt).toLocaleDateString() : 'Not locked'],
                    ] as [string, string][]).map(([key, val]) => (
                      <tr key={key}>
                        <td className="text-600 fw-semi-bold py-2 px-3" style={{ width: 160 }}>{key}</td>
                        <td className={`py-2 px-3 ${key === 'Region ID' || key === 'API Endpoint' ? 'font-monospace' : ''}`}>
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
