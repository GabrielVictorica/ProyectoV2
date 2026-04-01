'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
    upsertGoalAction,
    getAgentProgressAction,
    getTeamObjectivesSummaryAction
} from '@/features/admin/actions/adminActions';
import { toast } from 'sonner';
import type {
    ViewAgentProgress,
    ViewAgentProgressExtended,
    ViewTeamObjectivesSummary,
    ViewFinancialMetrics,
    HistoricalAverage,
    AgentWithProgress,
} from '../types/supabase';

import type { PeriodFilter } from '../components/ObjectivesHeader';

// Query Keys
export const AGENT_PROGRESS_KEY = 'agent-progress';
export const TEAM_OBJECTIVES_SUMMARY_KEY = 'team-objectives-summary';
export const AGENTS_OBJECTIVES_LIST_KEY = 'agents-objectives-list';
export const AGENT_HISTORY_KEY = 'agent-history';

/** Calcula rango de fechas para un período dentro de un año */
export function getPeriodDateRange(year: number, period: PeriodFilter): { startDate?: string; endDate?: string } {
    if (period === 'annual') return {};
    const ranges: Record<string, [string, string]> = {
        Q1: [`${year}-01-01`, `${year}-03-31`],
        Q2: [`${year}-04-01`, `${year}-06-30`],
        Q3: [`${year}-07-01`, `${year}-09-30`],
        Q4: [`${year}-10-01`, `${year}-12-31`],
        S1: [`${year}-01-01`, `${year}-06-30`],
        S2: [`${year}-07-01`, `${year}-12-31`],
    };
    const [startDate, endDate] = ranges[period];
    return { startDate, endDate };
}

// Re-exportar tipos para compatibilidad
export type { ViewAgentProgress as AgentProgress, ViewTeamObjectivesSummary as TeamObjectivesSummary, HistoricalAverage };

/**
 * Fetchers para permitir prefetching
 */
export const fetchAgentProgress = async (agentId: string, year: number, startDate?: string, endDate?: string) => {
    if (!agentId) return null;
    const result = await getAgentProgressAction(agentId, year, startDate, endDate);
    if (!result.success) throw new Error(result.error);
    return result.data as ViewAgentProgress | null;
};

export const fetchTeamObjectivesSummary = async (year: number, organizationId?: string, startDate?: string, endDate?: string) => {
    const result = await getTeamObjectivesSummaryAction(year, organizationId, startDate, endDate);
    if (!result.success) throw new Error(result.error);

    const data = result.data;
    if (!data || data.length === 0) return null;

    if (data.length === 1) return data[0] as ViewTeamObjectivesSummary;

    const aggregated = (data as ViewTeamObjectivesSummary[]).reduce((acc, curr) => ({
        year: curr.year,
        organization_id: null,
        agents_with_goals: acc.agents_with_goals + (curr.agents_with_goals || 0),
        total_team_goal: acc.total_team_goal + Number(curr.total_team_goal || 0),
        total_team_income: acc.total_team_income + Number(curr.total_team_income || 0),
        avg_progress: 0,
        total_puntas_needed: acc.total_puntas_needed + Number(curr.total_puntas_needed || 0),
        total_puntas_closed: acc.total_puntas_closed + Number(curr.total_puntas_closed || 0),
        total_completed_income: acc.total_completed_income + Number(curr.total_completed_income || 0),
        total_reserved_income: acc.total_reserved_income + Number(curr.total_reserved_income || 0),
        total_completed_puntas: acc.total_completed_puntas + Number(curr.total_completed_puntas || 0),
        total_reserved_puntas: acc.total_reserved_puntas + Number(curr.total_reserved_puntas || 0),
        // Métricas operacionales
        total_sales_volume: acc.total_sales_volume + Number(curr.total_sales_volume || 0),
        total_operations_count: acc.total_operations_count + Number(curr.total_operations_count || 0),
        total_double_sided_count: acc.total_double_sided_count + Number(curr.total_double_sided_count || 0),
        total_single_sided_count: acc.total_single_sided_count + Number(curr.total_single_sided_count || 0),
        total_net_income: acc.total_net_income + Number(curr.total_net_income || 0),
        total_master_income: acc.total_master_income + Number(curr.total_master_income || 0),
        total_office_income: acc.total_office_income + Number(curr.total_office_income || 0),
        total_completed_volume: acc.total_completed_volume + Number(curr.total_completed_volume || 0),
        total_reserved_volume: acc.total_reserved_volume + Number(curr.total_reserved_volume || 0),
    }), {
        year,
        organization_id: null,
        agents_with_goals: 0,
        total_team_goal: 0,
        total_team_income: 0,
        avg_progress: 0,
        total_puntas_needed: 0,
        total_puntas_closed: 0,
        total_completed_income: 0,
        total_reserved_income: 0,
        total_completed_puntas: 0,
        total_reserved_puntas: 0,
        total_sales_volume: 0,
        total_operations_count: 0,
        total_double_sided_count: 0,
        total_single_sided_count: 0,
        total_net_income: 0,
        total_master_income: 0,
        total_office_income: 0,
        total_completed_volume: 0,
        total_reserved_volume: 0,
    });

    aggregated.avg_progress = aggregated.total_team_goal > 0
        ? (aggregated.total_team_income / aggregated.total_team_goal) * 100
        : 0;

    return aggregated;
};

/**
 * Hook principal para obtener el progreso de objetivos de un agente.
 */
export function useObjectives(year: number, agentId?: string, period: PeriodFilter = 'annual') {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { startDate, endDate } = getPeriodDateRange(year, period);

    // 1. Fetch current objective & progress
    const { data: progress, isLoading: isLoadingProgress } = useQuery({
        queryKey: [AGENT_PROGRESS_KEY, year, agentId, period],
        queryFn: () => fetchAgentProgress(agentId!, year, startDate, endDate),
        enabled: !!agentId,
    });

    // 2. Fetch Historical Averages
    const { data: history, isLoading: isLoadingHistory } = useQuery({
        queryKey: [AGENT_HISTORY_KEY, agentId],
        queryFn: async (): Promise<HistoricalAverage> => {
            if (!agentId) return { avgTicket: 0, avgCommPercent: 3 };

            const { data, error } = await supabase
                .from('view_financial_metrics')
                .select('total_sales_volume, total_gross_commission, closed_deals_count')
                .eq('agent_id', agentId);

            if (error) throw error;
            if (!data || data.length === 0) return { avgTicket: 0, avgCommPercent: 3 };

            const metrics = data as ViewFinancialMetrics[];
            const totals = metrics.reduce(
                (acc, curr) => ({
                    sales: acc.sales + Number(curr.total_sales_volume || 0),
                    comm: acc.comm + Number(curr.total_gross_commission || 0),
                    deals: acc.deals + Number(curr.closed_deals_count || 0),
                }),
                { sales: 0, comm: 0, deals: 0 }
            );

            return {
                avgTicket: totals.deals > 0 ? totals.sales / totals.deals : 0,
                avgCommPercent: totals.sales > 0 ? (totals.comm / totals.sales) * 100 : 3,
            };
        },
        enabled: !!agentId,
    });

    // 3. Upsert Goal Mutation
    const upsertGoal = useMutation({
        mutationFn: async (vars: {
            agentId: string;
            year: number;
            annualBillingGoal: number;
            monthlyLivingExpenses: number;
            averageTicketTarget: number;
            averageCommissionTarget: number;
            currency: string;
            splitPercentage: number;
            conversionRate: number;
            workingWeeks: number;
            listingsGoalAnnual?: number;
            plToListingConversionTarget?: number;
            listingsGoalStartDate?: string | null;
            listingsGoalEndDate?: string | null;
        }) => {
            const result = await upsertGoalAction(vars);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AGENT_PROGRESS_KEY] });
            queryClient.invalidateQueries({ queryKey: [TEAM_OBJECTIVES_SUMMARY_KEY] });
            queryClient.invalidateQueries({ queryKey: [AGENTS_OBJECTIVES_LIST_KEY] });
            toast.success('Objetivos guardados correctamente');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Error al guardar objetivos');
        },
    });

    return {
        progress,
        history,
        isLoading: isLoadingProgress || isLoadingHistory,
        upsertGoal,
    };
}

/**
 * Hook para obtener el resumen agregado de objetivos del equipo.
 */
export function useTeamObjectivesSummary(year: number, organizationId?: string, period: PeriodFilter = 'annual') {
    const { startDate, endDate } = getPeriodDateRange(year, period);
    return useQuery({
        queryKey: [TEAM_OBJECTIVES_SUMMARY_KEY, year, organizationId, period],
        queryFn: () => fetchTeamObjectivesSummary(year, organizationId, startDate, endDate),
    });
}

/**
 * Hook OPTIMIZADO para obtener lista detallada de agentes con sus objetivos.
 */
export function useAgentsObjectivesList(year: number, organizationId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: [AGENTS_OBJECTIVES_LIST_KEY, year, organizationId],
        queryFn: async (): Promise<AgentWithProgress[]> => {
            let query = supabase
                .from('view_agent_progress_extended')
                .select('*')
                .eq('year', year);

            if (organizationId && organizationId !== 'all') {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return [];

            return (data as ViewAgentProgressExtended[]).map((row) => ({
                agent_id: row.agent_id,
                first_name: row.first_name,
                last_name: row.last_name,
                organization_id: row.organization_id,
                annual_billing_goal: row.annual_billing_goal || 0,
                actual_gross_income: row.actual_gross_income || 0,
                progress_percentage: row.progress_percentage || 0,
                actual_puntas_count: row.actual_puntas_count || 0,
                estimated_puntas_needed: row.estimated_puntas_needed || 0,
                run_rate_projection: row.run_rate_projection || 0,
                gap_to_goal: row.gap_to_goal || 0,
                currency: row.currency || 'USD',
                weekly_pl_pb_target: Number(row.weekly_pl_pb_target) || 0,
                listings_goal_annual: row.listings_goal_annual || 0,
                required_prelistings_annual: row.required_prelistings_annual || 0,
                required_prelistings_weekly: Number(row.required_prelistings_weekly) || 0,
                sales_effectiveness_ratio: row.sales_effectiveness_ratio || 2,
                minimum_listings_required: row.minimum_listings_required || 0,
                completed_gross_income: row.completed_gross_income || 0,
                reserved_gross_income: row.reserved_gross_income || 0,
                completed_puntas_count: row.completed_puntas_count || 0,
                reserved_puntas_count: row.reserved_puntas_count || 0,
                total_sales_volume: row.total_sales_volume || 0,
                operations_count: 0, // Se calcula en cliente desde puntas si no disponible
                double_sided_count: 0,
                single_sided_count: 0,
            }));
        },
    });
}

/**
 * Hook para obtener el split del perfil de un agente específico.
 */
export function useAgentSplit(agentId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['agent-split', agentId],
        queryFn: async (): Promise<number> => {
            if (!agentId || agentId === 'all') return 45;

            const { data, error } = await supabase
                .from('profiles')
                .select('default_split_percentage')
                .eq('id', agentId)
                .single();

            if (error) return 45;
            const result = data as { default_split_percentage: number | null } | null;
            return result?.default_split_percentage ?? 45;
        },
        enabled: !!agentId && agentId !== 'all',
        staleTime: 1000 * 60 * 5,
    });
}
