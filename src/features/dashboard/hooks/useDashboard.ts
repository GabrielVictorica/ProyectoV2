'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';

export const DASHBOARD_STATS_QUERY_KEY = 'dashboard-stats';

/**
 * Fetcher centralizado para permitir prefetching y uso en useQuery
 */
export const fetchDashboardStats = async (supabase: any, profile: any, permissions: any) => {
    if (!profile) return null;

    const orgId = profile.organization_id;
    const userId = profile.id;
    const { isParent, role } = permissions;

    // 1. Definir consultas (sin await todavía)
    let propertiesQuery = supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });

    let clientsQuery = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true });

    let salesQuery = supabase
        .from('transactions')
        .select('actual_price, total_commission, agent_id, profiles(first_name, last_name)');

    if (isParent && orgId) {
        propertiesQuery = propertiesQuery.eq('organization_id', orgId);
        clientsQuery = clientsQuery.eq('organization_id', orgId);
        salesQuery = salesQuery.eq('organization_id', orgId);
    } else if (role === 'child') {
        propertiesQuery = propertiesQuery.eq('agent_id', userId);
        clientsQuery = clientsQuery.eq('agent_id', userId);
        salesQuery = salesQuery.eq('agent_id', userId);
    }

    // 2. Ejecutar todas las consultas en paralelo
    const [
        { count: propertiesCount },
        { count: clientsCount },
        { data: salesData }
    ] = await Promise.all([
        propertiesQuery,
        clientsQuery,
        salesQuery
    ]);

    // 3. Procesar datos de transacciones (Ventas y Comisiones)
    const totalSalesVolume = salesData?.reduce((sum: number, t: any) => sum + (t.actual_price || 0), 0) || 0;
    const totalCommissions = salesData?.reduce((sum: number, t: any) => sum + (t.total_commission || 0), 0) || 0;

    // 4. Calcular Ranking de Agentes si es Broker
    let agentRanking = [];
    if (isParent && salesData) {
        const agentStats: Record<string, any> = {};
        salesData.forEach((t: any) => {
            const agentId = t.agent_id;
            if (!agentStats[agentId]) {
                agentStats[agentId] = {
                    name: `${t.profiles?.first_name || 'Agente'} ${t.profiles?.last_name || ''}`,
                    volume: 0,
                    count: 0
                };
            }
            agentStats[agentId].volume += t.actual_price || 0;
            agentStats[agentId].count += 1;
        });

        agentRanking = Object.values(agentStats)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 3);
    }

    return {
        propertiesCount: propertiesCount || 0,
        clientsCount: clientsCount || 0,
        totalSalesVolume,
        totalCommissions,
        agentRanking,
        role
    };
};

export function useDashboardStats() {
    const { data: auth } = useAuth();
    const { isGod, isParent, role } = usePermissions();
    const supabase = createClient();

    return useQuery({
        queryKey: [DASHBOARD_STATS_QUERY_KEY, auth?.profile?.id, role],
        queryFn: () => fetchDashboardStats(supabase, auth?.profile, { isParent, role }),
        enabled: !!auth?.profile,
        staleTime: 5 * 60 * 1000,
    });
}
