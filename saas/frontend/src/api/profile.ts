import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface Profile {
  id: string;
  fullName?: string;
  emailContact?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  targetRoles?: Array<{ title: string; fit: string }>;
  compensation?: { currency?: string; min?: number; max?: number; minimum?: number };
  narrative?: { headline?: string; exitStory?: string; superpowers?: string[]; proofPoints?: string[] };
  archetypes?: Array<{ name: string; description?: string }>;
  customConfig?: Record<string, unknown>;
}

export interface Cv {
  id: string;
  name: string;
  contentMd: string;
  isPrimary: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get<{ profile: Profile }>('/users/me/profile');
      return res.data.profile;
    },
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const res = await apiClient.put<{ profile: Profile }>('/users/me/profile', data);
      return res.data.profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
};

export const useCvs = () =>
  useQuery({
    queryKey: ['cvs'],
    queryFn: async () => {
      const res = await apiClient.get<{ cvs: Cv[] }>('/cvs');
      return res.data.cvs;
    },
  });

export const useCreateCv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; contentMd: string; isPrimary?: boolean }) => {
      const res = await apiClient.post<{ cv: Cv }>('/cvs', data);
      return res.data.cv;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cvs'] }),
  });
};

export const useUpdateCv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; contentMd?: string; name?: string; isPrimary?: boolean }) => {
      const res = await apiClient.put<{ cv: Cv }>(`/cvs/${id}`, data);
      return res.data.cv;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cvs'] }),
  });
};
