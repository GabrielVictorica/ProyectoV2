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
        staleTime: 30 * 1000, // 30 segundos (Balance entre frescura y performance)
        refetchOnWindowFocus: true, // Asegurar que si vuelve a la pestaña, se actualice
    });
}
