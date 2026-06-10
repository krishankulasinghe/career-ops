import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface EvaluationStatus {
  status: string;
  progress?: number;
  score?: number;
  error?: string;
}

export interface Evaluation {
  id: string;
  applicationId: string;
  reportContent: string;
  archetype?: string;
  tlDr?: string;
  scoreCvMatch?: string;
  scoreNorthStar?: string;
  scoreComp?: string;
  scoreCultural?: string;
  scoreRedFlags?: string;
  scoreGlobal?: string;
  legitimacyTier?: string;
  gaps?: Array<{ description: string; severity: string; mitigation?: string }>;
  aiProvider?: string;
  aiModel?: string;
  aiTokensIn?: number;
  aiTokensOut?: number;
  aiCostUsd?: string;
  aiLatencyMs?: number;
  createdAt: string;
}

export const useEvaluation = (id: string) =>
  useQuery({
    queryKey: ['evaluations', id],
    queryFn: async () => {
      const res = await apiClient.get<{ evaluation: Evaluation }>(`/evaluations/${id}`);
      return res.data.evaluation;
    },
    enabled: !!id,
  });

export const useEvaluationStatus = (id: string, enabled = true) =>
  useQuery({
    queryKey: ['evaluations', id, 'status'],
    queryFn: async () => {
      const res = await apiClient.get<EvaluationStatus>(`/evaluations/${id}/status`);
      return res.data;
    },
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'completed' || status === 'failed') return false;
      return 2000;
    },
  });

export const useCreateEvaluation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { url?: string; jdText?: string }) => {
      const res = await apiClient.post<{ taskId: string; applicationId: string }>('/evaluations', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [apps, usage] = await Promise.all([
        apiClient.get<{ applications: Array<{ score?: string; status: string }> }>('/applications', {
          params: { limit: 1000 },
        }),
        apiClient.get<{ evaluationsCount: number; scansCount: number; limit: number; percent: number }>(
          '/billing/usage',
        ),
      ]);

      const appList = apps.data.applications;
      const total = appList.length;
      const scores = appList.map((a) => parseFloat(a.score ?? '0')).filter((s) => s > 0);
      const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const pendingEvals = appList.filter((a) => a.status === 'Evaluated').length;
      const offers = appList.filter((a) => a.status === 'Offer').length;
      const applied = appList.filter((a) => ['Applied', 'Responded', 'Interview', 'Offer'].includes(a.status)).length;
      const conversionRate = applied > 0 ? Math.round((offers / applied) * 100) : 0;

      return {
        total,
        avgScore: Math.round(avgScore * 10) / 10,
        pendingEvals,
        conversionRate,
        usage: usage.data,
      };
    },
  });
