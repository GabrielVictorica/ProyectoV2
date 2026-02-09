'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface TeamMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    parent_id: string | null;
    property_count: number;
    sales_volume: number;
    sales_count: number;
    is_active: boolean;
}

export function useTeamStats() {
    const { data: auth } = useAuth();
    const supabase = createClient();

    return useQuery({
        queryKey: ['team-stats', auth?.profile?.organization_id],
        queryFn: async (): Promise<TeamMember[]> => {
            const orgId = auth?.profile?.organization_id;
            if (!orgId) return [];

            // 1. Obtener miembros del equipo (mismo orgId)
            const { data: members, error: membersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', orgId)
                .order('last_name');

            if (membersError) throw membersError;

            // 2. Obtener conteo de propiedades por agente
            const { data: propertyCounts } = await supabase
                .from('properties')
                .select('agent_id')
                .eq('organization_id', orgId);

            const propMap: Record<string, number> = {};
            propertyCounts?.forEach(p => {
                propMap[p.agent_id] = (propMap[p.agent_id] || 0) + 1;
            });

            // 3. Obtener volumen de ventas por agente
            const { data: transactionData } = await supabase
                .from('transactions')
                .select('agent_id, actual_price')
                .eq('organization_id', orgId);

            const salesVolumeMap: Record<string, number> = {};
            const salesCountMap: Record<string, number> = {};
            transactionData?.forEach(t => {
                salesVolumeMap[t.agent_id] = (salesVolumeMap[t.agent_id] || 0) + (t.actual_price || 0);
                salesCountMap[t.agent_id] = (salesCountMap[t.agent_id] || 0) + 1;
            });

            // 4. Mapear todo
            return (members || []).map(m => ({
                id: m.id,
                first_name: m.first_name,
                last_name: m.last_name,
                email: '',
                phone: m.phone,
                avatar_url: m.avatar_url,
                role: m.role,
                parent_id: m.parent_id,
                property_count: propMap[m.id] || 0,
                sales_volume: salesVolumeMap[m.id] || 0,
                sales_count: salesCountMap[m.id] || 0,
                is_active: m.is_active ?? true,
            }));
        },
        enabled: !!auth?.profile?.organization_id,
    });
}
