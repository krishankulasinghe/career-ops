import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface PromptTemplate {
  id: string;
  orgId: string | null;
  name: string;
  version: number;
  language: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Request failed');
  }
  return res.json();
}

export function usePromptTemplates() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: () => apiFetch<{ systemTemplates: PromptTemplate[]; orgTemplates: PromptTemplate[] }>('/api/v1/prompts'),
  });
}

export function useTemplateVersions(name: string, language = 'en') {
  return useQuery({
    queryKey: ['prompt-versions', name, language],
    queryFn: () => apiFetch<PromptTemplate[]>(`/api/v1/prompts/${encodeURIComponent(name)}/versions?language=${language}`),
    enabled: Boolean(name),
  });
}

export function useSavePromptOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; language?: string; content: string }) =>
      apiFetch<PromptTemplate>('/api/v1/prompts/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });
}

export function useRollbackPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/v1/prompts/${id}/rollback`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });
}

export function useTestPrompt() {
  return useMutation({
    mutationFn: (body: { promptContent: string; cvContent?: string; jdContent?: string }) =>
      apiFetch<{ output: string; latencyMs: number; usage: { tokensIn: number; tokensOut: number; costUsd: number } }>(
        '/api/v1/prompts/test',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      ),
  });
}

export function useEnableABTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (challengerId: string) =>
      apiFetch<{ ok: boolean }>('/api/v1/prompts/ab-test/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengerId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ab-test-stats'] }),
  });
}

export function useDisableABTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/api/v1/prompts/ab-test/disable', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ab-test-stats'] }),
  });
}

export function useABTestStats() {
  return useQuery({
    queryKey: ['ab-test-stats'],
    queryFn: () => apiFetch<{ active: boolean; challengerId: string; challengerName: string; startedAt: string } | null>(
      '/api/v1/prompts/ab-test/stats',
    ),
  });
}
