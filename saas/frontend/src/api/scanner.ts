import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface Portal {
  id: string;
  name: string;
  careersUrl?: string;
  apiType?: string;
  apiUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  id: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  source?: string;
  status: string;
  firstSeen: string;
  createdAt: string;
}

export interface TitleFilter {
  id: string;
  type: 'positive' | 'negative';
  keyword: string;
}

// ── Portals ────────────────────────────────────────────────────────────────────

export const usePortals = () =>
  useQuery({
    queryKey: ['portals'],
    queryFn: async () => (await apiClient.get<Portal[]>('/portals')).data,
  });

export const useCreatePortal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Portal, 'id' | 'createdAt' | 'updatedAt'>) =>
      (await apiClient.post<Portal>('/portals', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portals'] }),
  });
};

export const useUpdatePortal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Portal> & { id: string }) =>
      (await apiClient.put<Portal>(`/portals/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portals'] }),
  });
};

export const useDeletePortal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/portals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portals'] }),
  });
};

export const useImportPortals = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (portals: Array<{ name: string; careers_url?: string; api?: string }>) =>
      (await apiClient.post<{ created: number; updated: number; skipped: number }>('/portals/import', { portals })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portals'] }),
  });
};

// ── Scanner ────────────────────────────────────────────────────────────────────

export const useRunScan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (portalIds?: string[]) =>
      (await apiClient.post<{ jobId: string; status: string }>('/scanner/run', { portalIds })).data,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['scan-results'] }), 3000);
    },
  });
};

export const useScanResults = (params?: { portalId?: string; page?: number }) =>
  useQuery({
    queryKey: ['scan-results', params],
    queryFn: async () =>
      (await apiClient.get<ScanResult[]>('/scanner/results', { params })).data,
  });

// ── Title Filters ──────────────────────────────────────────────────────────────

export const useTitleFilters = () =>
  useQuery({
    queryKey: ['title-filters'],
    queryFn: async () => (await apiClient.get<TitleFilter[]>('/title-filters')).data,
  });

export const useUpsertTitleFilters = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filters: Array<{ type: 'positive' | 'negative'; keyword: string }>) =>
      (await apiClient.put<TitleFilter[]>('/title-filters', filters)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['title-filters'] }),
  });
};

export const useDeleteTitleFilter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/title-filters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['title-filters'] }),
  });
};
