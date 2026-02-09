'use client';

import { useQuery } from '@tanstack/react-query';
import { getTeamMembersAction } from '../actions/teamActions';

export const teamKeys = {
    all: ['team-members'] as const,
    list: () => [...teamKeys.all, 'list'] as const,
};

/**
 * Hook SSOT (Single Source of Truth) para obtener el equipo.
 * Reemplaza filtros manuales en componentes y asegura consistencia.
 */
export function useTeamMembers() {
    return useQuery({
        queryKey: teamKeys.list(),
        queryFn: async () => await getTeamMembersAction(),
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}
