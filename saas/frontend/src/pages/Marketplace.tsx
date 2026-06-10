import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
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
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: { message?: string } })?.error?.message ?? 'Failed');
  }
  return res.json() as Promise<T>;
}

function StarRating({ value, count }: { value: string | null; count: number }) {
  const num = parseFloat(value ?? '0');
  const full = Math.round(num);
  return (
    <span className="fs--2 text-warning">
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
      <span className="text-500 ms-1">({count})</span>
    </span>
  );
}

function RateModal({ item, onClose }: { item: MarketplaceItem; onClose: () => void }) {
  const [stars, setStars] = useState(0);
  const qc = useQueryClient();

  const rate = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/marketplace/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: item.id, templateType: item.type, stars }),
      }),
    onSuccess: () => {
      toast.success('Rating submitted');
      qc.invalidateQueries({ queryKey: ['marketplace'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog" onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content text-center">
          <div className="modal-header">
            <h5 className="modal-title">Rate "{item.name}"</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="d-flex justify-content-center gap-2 mb-3" style={{ fontSize: 32 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  role="button"
                  className={s <= stars ? 'text-warning' : 'text-300'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStars(s)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-falcon-default" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={stars === 0 || rate.isPending}
              onClick={() => rate.mutate()}
            >
              Submit
            </button>
          </div>
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
    onSuccess: () => {
      toast.success('Template installed to your org!');
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allItems = data?.items ?? [];
  const filtered = allItems.filter((i) => filter === 'all' || i.type === filter);

  // Featured = top 6 by download count
  const featured = [...allItems].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 6);

  return (
    <Layout title="Template Marketplace">
      {ratingItem && <RateModal item={ratingItem} onClose={() => setRatingItem(null)} />}

      <div className="d-flex flex-column gap-3">

        {/* Header */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <h4 className="mb-1">Browse Templates</h4>
                <p className="fs--1 text-500 mb-0">
                  Community-created CV and prompt templates. Install to your org with one click.
                </p>
              </div>
              <div className="d-flex gap-2">
                {(['all', 'cv', 'prompt'] as const).map((f) => (
                  <button
                    key={f}
                    className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-falcon-default'}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'cv' ? 'CV Templates' : 'Prompt Templates'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured carousel — only show when data is loaded and items exist */}
        {!isLoading && featured.length > 0 && (
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">
                <span className="fas fa-star text-warning me-1" />
                Featured Templates
              </h5>
            </div>
            <div className="card-body">
              <Swiper
                modules={[Pagination, Autoplay]}
                slidesPerView={3}
                spaceBetween={16}
                pagination={{ clickable: true }}
                autoplay={{ delay: 3000 }}
                breakpoints={{
                  0: { slidesPerView: 1 },
                  576: { slidesPerView: 2 },
                  992: { slidesPerView: 3 },
                }}
                className="pb-4"
              >
                {featured.map((item) => (
                  <SwiperSlide key={`featured-${item.type}:${item.id}`}>
                    <div className="card h-100 border">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="mb-0 text-truncate me-2">{item.name}</h6>
                          <span className={`badge flex-shrink-0 ${item.type === 'cv' ? 'badge-soft-primary' : 'badge-soft-success'}`}>
                            {item.type === 'cv' ? 'CV' : 'Prompt'}
                          </span>
                        </div>
                        {item.description && (
                          <p className="fs--2 text-500 mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                          </p>
                        )}
                        <div className="d-flex align-items-center justify-content-between mt-auto">
                          <StarRating value={item.rating} count={item.ratingCount} />
                          <span className="fs--2 text-500">
                            <span className="fas fa-download me-1" />
                            {item.downloadCount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        )}

        {/* All items grid */}
        {isLoading ? (
          <div className="card mb-3">
            <div className="card-body text-center p-5 text-500">
              <span className="fas fa-spinner fa-spin fs-2 d-block mb-2 text-300" />
              Loading marketplace…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card mb-3">
            <div className="card-body text-center p-5 text-500">
              <span className="fas fa-store fs-2 d-block mb-2 text-300" />
              No public templates yet.
              <div className="mt-2 fs--1">
                Be the first! Go to <strong>Settings → CV Templates</strong> or <strong>Settings → Prompts</strong> and click "Publish to Marketplace".
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {filtered.map((item) => (
              <div key={`${item.type}:${item.id}`} className="col-md-4">
                <TemplateCard
                  item={item}
                  onInstall={() => install.mutate({ templateId: item.id, templateType: item.type })}
                  onRate={() => setRatingItem(item)}
                  installing={install.isPending}
                />
              </div>
            ))}
          </div>
        )}

        {/* Publishing info */}
        <div className="card mb-3 border-start border-primary border-3">
          <div className="card-body">
            <h6 className="mb-2">
              <span className="fas fa-share-alt text-primary me-1" />
              Share your templates
            </h6>
            <p className="mb-0 fs--1 text-500">
              You can publish your own CV templates and prompt templates to the marketplace.
              Go to <strong>Settings → CV Templates</strong> or <strong>Settings → Prompts</strong>, select a template,
              and click <strong>"Publish to Marketplace"</strong>. Submissions are reviewed before going live (typically within 24h).
            </p>
          </div>
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
    <div className="card h-100">
      <div className="card-body d-flex flex-column gap-2">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div className="fw-semibold">{item.name}</div>
            <div className="mt-1 d-flex gap-1 flex-wrap">
              <span className={`badge fs--2 ${item.type === 'cv' ? 'badge-soft-primary' : 'badge-soft-success'}`}>
                {item.type === 'cv' ? 'CV Template' : 'Prompt Template'}
              </span>
              {!item.orgId && (
                <span className="badge badge-soft-warning fs--2">Official</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="fs--1 text-500 mb-0" style={{ lineHeight: 1.5 }}>
            {item.description}
          </p>
        )}

        {/* Preview image */}
        {item.previewUrl && (
          <img
            src={item.previewUrl}
            alt={item.name}
            className="rounded-2 w-100 object-fit-cover"
            style={{ maxHeight: 120 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        {/* Stats */}
        <div className="d-flex align-items-center gap-3 fs--2 text-500">
          <span>
            <span className="fas fa-download me-1" />
            {item.downloadCount.toLocaleString()}
          </span>
          <StarRating value={item.rating} count={item.ratingCount} />
        </div>

        {/* Actions */}
        <div className="d-flex gap-2 mt-auto">
          {item.installedByOrg ? (
            <>
              <button className="btn btn-falcon-default btn-sm flex-grow-1" disabled>
                <span className="fas fa-check me-1" />
                Installed
              </button>
              <button className="btn btn-falcon-default btn-sm" onClick={onRate} title="Rate this template">
                <span className="fas fa-star" />
              </button>
            </>
          ) : (
            <button
              className="btn btn-sm btn-primary flex-grow-1"
              onClick={onInstall}
              disabled={installing}
            >
              {installing ? (
                <><span className="fas fa-spinner fa-spin me-1" />Installing…</>
              ) : (
                <><span className="fas fa-download me-1" />Install</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
