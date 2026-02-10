'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

import { getTeamStatsAction, type TeamMemberStats } from '../actions/teamStatsActions';

export function useTeamStats() {
    const { data: auth } = useAuth();
    const orgId = auth?.profile?.organization_id;

    return useQuery({
        queryKey: ['team-stats', orgId],
        queryFn: async (): Promise<TeamMemberStats[]> => {
            const data = await getTeamStatsAction();
            return data;
        },
        enabled: !!auth?.profile?.organization_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
