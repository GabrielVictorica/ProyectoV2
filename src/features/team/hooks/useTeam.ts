'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

import { getTeamMembersAction, type TeamMember } from '../actions/teamActions';

export function useTeamStats() {
    const { data: auth } = useAuth();
    const supabase = createClient();
    const orgId = auth?.profile?.organization_id;

    return useQuery({
        queryKey: ['team-stats', orgId],
        queryFn: async (): Promise<(TeamMember & { property_count: number; sales_volume: number; sales_count: number })[]> => {
            // 1. Obtener miembros del equipo desde la SSOT (Server Action)
            const members = await getTeamMembersAction();
            if (members.length === 0) return [];

            const memberIds = (members || []).map((m: any) => m.id);
            if (memberIds.length === 0) return [];

            // 2. Obtener conteo de propiedades por agente
            // Incluimos propiedades que pertenecen a la org O a los agentes que reportan (aunque estén en otra org)
            const { data: propertyCounts } = await (supabase
                .from('properties') as any)
                .select('agent_id')
                .or(`organization_id.eq.${orgId},agent_id.in.(${memberIds.join(',')})`);

            const propMap: Record<string, number> = {};
            (propertyCounts || []).forEach((p: any) => {
                propMap[p.agent_id] = (propMap[p.agent_id] || 0) + 1;
            });

            // 3. Obtener volumen de ventas por agente
            const { data: transactionData } = await (supabase
                .from('transactions') as any)
                .select('agent_id, actual_price')
                .or(`organization_id.eq.${orgId},agent_id.in.(${memberIds.join(',')})`);

            const salesVolumeMap: Record<string, number> = {};
            const salesCountMap: Record<string, number> = {};
            (transactionData || []).forEach((t: any) => {
                salesVolumeMap[t.agent_id] = (salesVolumeMap[t.agent_id] || 0) + (t.actual_price || 0);
                salesCountMap[t.agent_id] = (salesCountMap[t.agent_id] || 0) + 1;
            });

            // 4. Mapear todo
            const result = (members || []).map((m: any) => ({
                ...m,
                email: m.email || '',
                property_count: propMap[m.id] || 0,
                sales_volume: salesVolumeMap[m.id] || 0,
                sales_count: salesCountMap[m.id] || 0,
            }));

            return result as any;
        },
        enabled: !!auth?.profile?.organization_id,
    });
}
