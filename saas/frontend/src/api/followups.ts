import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface FollowUpInput {
  applicationId: string;
  date: string;
  channel?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
}

export const useCreateFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: FollowUpInput) =>
      (await apiClient.post('/followups', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['followups'] }),
  });
};
