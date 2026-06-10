import { useQuery } from '@tanstack/react-query';

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export interface DedupSuggestion {
  orgId: string;
  appId1: string;
  appId2: string;
  company1: string;
  company2: string;
  role1: string;
  role2: string;
  similarity: number;
}

export interface ScanAnomaly {
  portalId: string;
  portalName: string;
  orgId: string;
  todayCount: number;
  movingAvg: number;
  dropPercent: number;
}

export interface ArchetypeCalibration {
  archetype: string;
  evaluations: number;
  avgScore: number;
  interviewRate: number;
  offerRate: number;
  calibrationScore: number;
  flag: boolean;
}

export interface BatchOptimizationRecommendation {
  provider: string;
  recommendedBatchSize: number;
  observedAvgLatencyMs: number;
  observedP95LatencyMs: number;
  estimatedTPM: number;
}

export function useDedupSuggestions(orgId?: string) {
  return useQuery({
    queryKey: ['admin-dedup', orgId],
    queryFn: () => apiFetch<DedupSuggestion[]>(`/api/v1/admin/ai-ops/dedup${orgId ? `?orgId=${orgId}` : ''}`),
  });
}

export function useScanAnomalies() {
  return useQuery({
    queryKey: ['admin-scan-anomalies'],
    queryFn: () => apiFetch<ScanAnomaly[]>('/api/v1/admin/ai-ops/scan-anomalies'),
  });
}

export function useCalibration(orgId?: string) {
  return useQuery({
    queryKey: ['admin-calibration', orgId],
    queryFn: () => apiFetch<ArchetypeCalibration[]>(`/api/v1/admin/ai-ops/calibration${orgId ? `?orgId=${orgId}` : ''}`),
  });
}

export function useBatchOptimization() {
  return useQuery({
    queryKey: ['admin-batch-opt'],
    queryFn: () => apiFetch<BatchOptimizationRecommendation[]>('/api/v1/admin/ai-ops/batch-optimization'),
  });
}
