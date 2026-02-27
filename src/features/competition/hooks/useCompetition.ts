'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCompetitionDataAction,
    addTeamMemberAction,
    moveTeamMemberAction,
    removeTeamMemberAction,
    getAvailableAgentsAction,
    type CompetitionData,
} from '../actions/competitionActions';
import type { TeamId } from '../constants';
import { toast } from 'sonner';

// ─── Query Keys ──────────────────────────────────────────────────

export const COMPETITION_KEY = 'competition-data';
export const AVAILABLE_AGENTS_KEY = 'competition-available-agents';

// ─── Main Competition Data Hook ──────────────────────────────────

/**
 * Fetches and caches the full competition dataset.
 * Refetches every 5 min (read-only, no rush).
 */
export function useCompetition(startDate?: string, endDate?: string) {
    return useQuery<CompetitionData | null>({
        queryKey: [COMPETITION_KEY, startDate, endDate],
        queryFn: async () => {
            const result = await getCompetitionDataAction(startDate, endDate);
            if (!result.success) throw new Error(result.error);
            return result.data || null;
        },
        staleTime: 1000 * 60 * 5,      // 5 min
        refetchOnWindowFocus: false,
    });
}

// ─── Team Management Hooks ───────────────────────────────────────

export function useAvailableAgents(organizationId?: string) {
    return useQuery({
        queryKey: [AVAILABLE_AGENTS_KEY, organizationId],
        queryFn: async () => {
            if (!organizationId) return [];
            const result = await getAvailableAgentsAction(organizationId);
            if (!result.success) throw new Error(result.error);
            return result.data || [];
        },
        enabled: !!organizationId,
    });
}

export function useAddTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ agentId, team }: { agentId: string; team: TeamId }) => {
            const result = await addTeamMemberAction(agentId, team);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [COMPETITION_KEY] });
            queryClient.invalidateQueries({ queryKey: [AVAILABLE_AGENTS_KEY] });
            toast.success('Agente agregado al equipo');
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Error al agregar agente');
        },
    });
}

export function useMoveTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ agentId, newTeam }: { agentId: string; newTeam: TeamId }) => {
            const result = await moveTeamMemberAction(agentId, newTeam);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [COMPETITION_KEY] });
            toast.success('Agente movido al otro equipo');
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Error al mover agente');
        },
    });
}

export function useRemoveTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ agentId }: { agentId: string }) => {
            const result = await removeTeamMemberAction(agentId);
            if (!result.success) throw new Error(result.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [COMPETITION_KEY] });
            queryClient.invalidateQueries({ queryKey: [AVAILABLE_AGENTS_KEY] });
            toast.success('Agente removido de la competencia');
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Error al remover agente');
        },
    });
}
