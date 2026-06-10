import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface PipelineItem {
  id: string;
  url: string;
  company?: string;
  title?: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  source?: string;
  addedAt: string;
  processedAt?: string;
}

export const usePipeline = (status?: string) =>
  useQuery({
    queryKey: ['pipeline', status],
    queryFn: async () => {
      const res = await apiClient.get<{ items: PipelineItem[] }>('/pipeline', { params: status ? { status } : {} });
      return res.data.items;
    },
  });

export const useAddToPipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (urls: string[]) => {
      const res = await apiClient.post<{ added: number; skipped: number }>('/pipeline', { urls });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });
};

export const useProcessPipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ enqueued: number; skipped: number }>('/pipeline/process');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });
};

export const useDeletePipelineItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/pipeline/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });
};
