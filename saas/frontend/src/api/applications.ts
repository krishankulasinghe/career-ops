import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface Application {
  id: string;
  seqNumber: number;
  date: string;
  company: string;
  role: string;
  score?: string;
  status: string;
  hasPdf: boolean;
  pdfUrl?: string;
  notes?: string;
  jobUrl?: string;
  source?: string;
  archetype?: string;
  legitimacy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationsListParams {
  page?: number;
  limit?: number;
  status?: string;
  score_min?: number;
  score_max?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const useApplications = (params: ApplicationsListParams = {}) =>
  useQuery({
    queryKey: ['applications', params],
    queryFn: async () => {
      const res = await apiClient.get<{
        applications: Application[];
        pagination: { page: number; limit: number; hasMore: boolean };
      }>('/applications', { params });
      return res.data;
    },
  });

export const useApplication = (id: string) =>
  useQuery({
    queryKey: ['applications', id],
    queryFn: async () => {
      const res = await apiClient.get<{ application: Application }>(`/applications/${id}`);
      return res.data.application;
    },
    enabled: !!id,
  });

export const useCreateApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Application>) => {
      const res = await apiClient.post<{ application: Application }>('/applications', data);
      return res.data.application;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useUpdateApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Application> & { id: string }) => {
      const res = await apiClient.put<{ application: Application }>(`/applications/${id}`, data);
      return res.data.application;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useDeleteApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/applications/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useImportApplications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (markdown: string) => {
      const res = await apiClient.post<{ created: number; skipped: number; errors: string[] }>(
        '/applications/import',
        { markdown },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
};
