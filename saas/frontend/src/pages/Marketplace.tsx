import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface MarketplaceItem {
  id: string;
  type: 'cv' | 'prompt';
  name: string;
  description?: string | null;
  previewUrl?: string | null;
  downloadCount: number;
  rating: string | null;
  ratingCount: number;
  orgId: string | null;
  installedByOrg?: boolean;
}

interface MarketplaceResponse {
  items: MarketplaceItem[];
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  return res.json();
}

function StarRating({ value, count }: { value: string | null; count: number }) {
  const num = parseFloat(value ?? '0');
  return (
    <span style={{ fontSize: 12, color: 'var(--warning)' }}>
      {'★'.repeat(Math.round(num))}{'☆'.repeat(5 - Math.round(num))}
      <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({count})</span>
    </span>
  );
}

function RateModal({
  item, onClose,
}: {
  item: MarketplaceItem;
  onClose: () => void;
}) {
  const [stars, setStars] = useState(0);
  const qc = useQueryClient();

  const rate = useMutation({
    mutationFn: () => apiFetch('/api/v1/marketplace/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: item.id, templateType: item.type, stars }),
    }),
    onSuccess: () => {
      toast.success('Rating submitted');
      qc.invalidateQueries({ queryKey: ['marketplace'] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card" style={{ width: 320, textAlign: 'center' }}>
        <h3 style={{ marginTop: 0 }}>Rate "{item.name}"</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 32, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              style={{ cursor: 'pointer', color: s <= stars ? 'var(--warning)' : 'var(--text-muted)' }}
              onClick={() => setStars(s)}
            >
              ★
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={stars === 0 || rate.isPending} onClick={() => rate.mutate()}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarketplacePage() {
  const [filter, setFilter] = useState<'all' | 'cv' | 'prompt'>('all');
  const [ratingItem, setRatingItem] = useState<MarketplaceItem | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace'],
    queryFn: () => apiFetch<MarketplaceResponse>('/api/v1/marketplace'),
  });

  const install = useMutation({
    mutationFn: ({ templateId, templateType }: { templateId: string; templateType: 'cv' | 'prompt' }) =>
      apiFetch('/api/v1/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, templateType }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(`Template installed to your org!`);
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (data?.items ?? []).filter((i) => filter === 'all' || i.type === filter);

  return (
    <Layout title="Template Marketplace">
      {ratingItem && (
        <RateModal item={ratingItem} onClose={() => setRatingItem(null)} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header + filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Browse Templates</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Community-created CV and prompt templates. Install to your org with one click.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'cv', 'prompt'] as const).map((f) => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '4px 12px', textTransform: 'capitalize' }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'cv' ? 'CV Templates' : 'Prompt Templates'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Loading marketplace…</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            No public templates yet.
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Be the first! Go to Settings → CV Templates or Settings → Prompts and click "Publish to Marketplace".
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map((item) => (
              <TemplateCard
                key={`${item.type}:${item.id}`}
                item={item}
                onInstall={() => install.mutate({ templateId: item.id, templateType: item.type })}
                onRate={() => setRatingItem(item)}
                installing={install.isPending}
              />
            ))}
          </div>
        )}

        {/* Publishing info */}
        <div className="card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <h4 style={{ marginTop: 0 }}>Share your templates</h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            You can publish your own CV templates and prompt templates to the marketplace.
            Go to <strong>Settings → CV Templates</strong> or <strong>Settings → Prompts</strong>, select a template,
            and click <strong>"Publish to Marketplace"</strong>. Submissions are reviewed before going live (typically within 24h).
          </p>
        </div>
      </div>
    </Layout>
  );
}

function TemplateCard({
  item, onInstall, onRate, installing,
}: {
  item: MarketplaceItem;
  onInstall: () => void;
  onRate: () => void;
  installing: boolean;
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
          <div style={{ marginTop: 2 }}>
            <span style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 3,
              background: item.type === 'cv' ? 'rgba(93,156,236,0.15)' : 'rgba(76,175,80,0.15)',
              color: item.type === 'cv' ? 'var(--primary)' : 'var(--success)',
              fontWeight: 600,
            }}>
              {item.type === 'cv' ? 'CV Template' : 'Prompt Template'}
            </span>
            {!item.orgId && (
              <span style={{
                marginLeft: 6, fontSize: 11, padding: '2px 6px', borderRadius: 3,
                background: 'rgba(255,193,7,0.15)', color: 'var(--warning)', fontWeight: 600,
              }}>
                Official
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {item.description}
        </div>
      )}

      {/* Preview image */}
      {item.previewUrl && (
        <img
          src={item.previewUrl}
          alt={item.name}
          style={{ borderRadius: 4, width: '100%', objectFit: 'cover', maxHeight: 120 }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>⬇ {item.downloadCount.toLocaleString()}</span>
        <StarRating value={item.rating} count={item.ratingCount} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {item.installedByOrg ? (
          <>
            <button className="btn btn-secondary" style={{ flex: 1, fontSize: 12 }} disabled>
              ✓ Installed
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={onRate} title="Rate this template">
              ★ Rate
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: 12 }}
            onClick={onInstall}
            disabled={installing}
          >
            {installing ? 'Installing…' : 'Install'}
          </button>
        )}
      </div>
    </div>
  );
}
