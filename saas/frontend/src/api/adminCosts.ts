import { useQuery } from '@tanstack/react-query';

export interface DailySpend {
  date: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  evaluations: number;
}

export interface OrgCostRow {
  orgId: string;
  orgName: string;
  plan: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  evaluations: number;
  costPerEval: number;
}

export interface ProviderBreakdown {
  provider: string;
  costUsd: number;
  evaluations: number;
}

export interface ModelBreakdown {
  model: string;
  provider: string;
  costUsd: number;
  evaluations: number;
}

export interface AnomalyAlert {
  orgId: string;
  orgName: string;
  thisWeekCost: number;
  lastWeekCost: number;
  growthFactor: number;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export function useDailySpend(days = 90) {
  return useQuery({
    queryKey: ['admin-costs-daily', days],
    queryFn: () => apiFetch<{ series: DailySpend[]; forecastEOM: number }>(`/api/v1/admin/ai-costs/daily?days=${days}`),
  });
}

export function useOrgCosts(days = 30) {
  return useQuery({
    queryKey: ['admin-costs-orgs', days],
    queryFn: () => apiFetch<OrgCostRow[]>(`/api/v1/admin/ai-costs/orgs?days=${days}`),
  });
}

export function useProviderBreakdown(days = 30) {
  return useQuery({
    queryKey: ['admin-costs-providers', days],
    queryFn: () => apiFetch<ProviderBreakdown[]>(`/api/v1/admin/ai-costs/providers?days=${days}`),
  });
}

export function useModelBreakdown(days = 30) {
  return useQuery({
    queryKey: ['admin-costs-models', days],
    queryFn: () => apiFetch<ModelBreakdown[]>(`/api/v1/admin/ai-costs/models?days=${days}`),
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: ['admin-costs-anomalies'],
    queryFn: () => apiFetch<AnomalyAlert[]>('/api/v1/admin/ai-costs/anomalies'),
  });
}
