import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  emailVerifiedAt?: string;
  createdAt: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  maxEvaluationsMo: number;
  maxScansMo: number;
  maxMembers: number;
}

interface AuthResponse {
  user: User;
  organization: Org;
}

function normalizeAuthResponse(data: AuthResponse): { user: User; org: Org } {
  return { user: data.user, org: data.organization };
}

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get<AuthResponse>('/auth/me');
      return normalizeAuthResponse(res.data);
    },
    retry: false,
  });

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiClient.post<AuthResponse>('/auth/login', data);
      return normalizeAuthResponse(res.data);
    },
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });
};

export const useRegister = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string }) => {
      const res = await apiClient.post<AuthResponse>('/auth/register', data);
      return normalizeAuthResponse(res.data);
    },
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      qc.clear();
    },
  });
};
