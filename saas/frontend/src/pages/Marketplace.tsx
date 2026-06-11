import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  IconStar,
  IconDownload,
  IconLoader2,
  IconShoppingBag,
  IconShare,
  IconCheck,
} from '@tabler/icons-react';

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
    <span className="small text-warning">
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
      <span className="text-secondary ms-1">({count})</span>
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
                  className={s <= stars ? 'text-warning' : 'text-muted'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStars(s)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
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
    <Layout title="Marketplace">
      {ratingItem && <RateModal item={ratingItem} onClose={() => setRatingItem(null)} />}

      <div className="row row-deck row-cards">

        {/* Header card with filter tabs */}
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Browse Templates</h4>
                  <p className="small text-secondary mb-0">
                    Community-created CV and prompt templates. Install to your org with one click.
                  </p>
                </div>
                <ul className="nav nav-tabs card-header-tabs">
                  {(['all', 'cv', 'prompt'] as const).map((f) => (
                    <li className="nav-item" key={f}>
                      <button
                        className={`nav-link${filter === f ? ' active' : ''}`}
                        type="button"
                        onClick={() => setFilter(f)}
                      >
                        {f === 'all' ? 'All' : f === 'cv' ? 'CV Templates' : 'Prompt Templates'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Featured carousel — only show when data is loaded and items exist */}
        {!isLoading && featured.length > 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <IconStar size={16} className="text-warning me-1" />
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
                            <span className={`badge flex-shrink-0 ${item.type === 'cv' ? 'bg-primary-lt' : 'bg-success-lt'}`}>
                              {item.type === 'cv' ? 'CV' : 'Prompt'}
                            </span>
                          </div>
                          {item.description && (
                            <p className="small text-secondary mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.description}
                            </p>
                          )}
                          <div className="d-flex align-items-center justify-content-between mt-auto">
                            <StarRating value={item.rating} count={item.ratingCount} />
                            <span className="small text-secondary">
                              <IconDownload size={13} className="me-1" />
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
          </div>
        )}

        {/* All items grid */}
        {isLoading ? (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center p-5 text-secondary">
                <IconLoader2 size={32} className="d-block mx-auto mb-2 text-muted" />
                Loading marketplace…
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center p-5 text-secondary">
                <IconShoppingBag size={32} className="d-block mx-auto mb-2 text-muted" />
                No public templates yet.
                <div className="mt-2 small">
                  Be the first! Go to <strong>Settings → CV Templates</strong> or <strong>Settings → Prompts</strong> and click "Publish to Marketplace".
                </div>
              </div>
            </div>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={`${item.type}:${item.id}`} className="col-sm-6 col-lg-3">
              <TemplateCard
                item={item}
                onInstall={() => install.mutate({ templateId: item.id, templateType: item.type })}
                onRate={() => setRatingItem(item)}
                installing={install.isPending}
              />
            </div>
          ))
        )}

        {/* Publishing info */}
        <div className="col-12">
          <div className="card border-start border-primary border-3">
            <div className="card-body">
              <h6 className="mb-2">
                <IconShare size={15} className="text-primary me-1" />
                Share your templates
              </h6>
              <p className="mb-0 small text-secondary">
                You can publish your own CV templates and prompt templates to the marketplace.
                Go to <strong>Settings → CV Templates</strong> or <strong>Settings → Prompts</strong>, select a template,
                and click <strong>"Publish to Marketplace"</strong>. Submissions are reviewed before going live (typically within 24h).
              </p>
            </div>
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
    <div className="card card-link h-100">
      <div className="card-body d-flex flex-column gap-2">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div className="fw-semibold text-body">{item.name}</div>
            <div className="mt-1 d-flex gap-1 flex-wrap">
              <span className={`badge small ${item.type === 'cv' ? 'bg-primary-lt' : 'bg-success-lt'}`}>
                {item.type === 'cv' ? 'CV Template' : 'Prompt Template'}
              </span>
              {!item.orgId && (
                <span className="badge bg-warning-lt small">Official</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="small text-secondary mb-0" style={{ lineHeight: 1.5 }}>
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
        <div className="d-flex align-items-center gap-3 small text-secondary">
          <span>
            <IconDownload size={13} className="me-1" />
            {item.downloadCount.toLocaleString()}
          </span>
          <StarRating value={item.rating} count={item.ratingCount} />
        </div>

        {/* Actions */}
        <div className="d-flex gap-2 mt-auto">
          {item.installedByOrg ? (
            <>
              <button className="btn btn-outline-secondary btn-sm flex-grow-1" disabled>
                <IconCheck size={14} className="me-1" />
                Installed
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={onRate} title="Rate this template">
                <IconStar size={14} />
              </button>
            </>
          ) : (
            <button
              className="btn btn-sm btn-primary flex-grow-1"
              onClick={onInstall}
              disabled={installing}
            >
              {installing ? (
                <><IconLoader2 size={14} className="me-1" />Installing…</>
              ) : (
                <><IconDownload size={14} className="me-1" />Install</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
