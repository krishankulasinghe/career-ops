import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface FunnelEntry { status: string; count: number }
export interface ScoreBucket { range: string; count: number }
export interface BlockerEntry { blocker: string; count: number }
export interface ArchetypeEntry { archetype: string; avgScore: number; minScore: number; maxScore: number; count: number }
export interface ScoreThreshold { threshold: number; basis: string }
export interface FollowUpEntry {
  applicationId: string; company: string; role: string; status: string;
  url?: string; urgency: string; lastActionDate: string;
}

export const useFunnel = () =>
  useQuery({ queryKey: ['analytics', 'funnel'], queryFn: async () => (await apiClient.get<FunnelEntry[]>('/analytics/funnel')).data });

export const useScoreDistribution = () =>
  useQuery({ queryKey: ['analytics', 'scores'], queryFn: async () => (await apiClient.get<ScoreBucket[]>('/analytics/scores')).data });

export const usePatterns = () =>
  useQuery({ queryKey: ['analytics', 'patterns'], queryFn: async () => (await apiClient.get<BlockerEntry[]>('/analytics/patterns')).data });

export const useArchetypeStats = () =>
  useQuery({ queryKey: ['analytics', 'archetypes'], queryFn: async () => (await apiClient.get<ArchetypeEntry[]>('/analytics/archetypes')).data });

export const useScoreThreshold = () =>
  useQuery({ queryKey: ['analytics', 'threshold'], queryFn: async () => (await apiClient.get<ScoreThreshold>('/analytics/score-threshold')).data });

export const useFollowUps = () =>
  useQuery({ queryKey: ['followups'], queryFn: async () => (await apiClient.get<FollowUpEntry[]>('/followups')).data });
