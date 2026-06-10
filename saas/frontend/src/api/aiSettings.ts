import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AISettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  fallbackProvider: string | null;
  hasCustomKey: boolean;
  allowedProviders: string[];
}

async function fetchAISettings(): Promise<AISettings> {
  const res = await fetch('/api/v1/settings/ai', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load AI settings');
  return res.json();
}

export function useAISettings() {
  return useQuery({ queryKey: ['ai-settings'], queryFn: fetchAISettings });
}

export function useUpdateAISettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AISettings & { apiKey?: string }>) => {
      const res = await fetch('/api/v1/settings/ai', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Failed to update AI settings');
      }
      return res.json() as Promise<AISettings>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-settings'] }),
  });
}

export function useTestAIConnection() {
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean; latencyMs: number; error?: string }> => {
      const res = await fetch('/api/v1/settings/ai/test', {
        method: 'POST',
        credentials: 'include',
      });
      return res.json();
    },
  });
}
