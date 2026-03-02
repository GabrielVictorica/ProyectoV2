
'use server';

import { createClient } from '@/lib/supabase/server';
import { TransactionWithRelations, FinancialMetrics } from '../hooks/useTransactions';

export interface ClosingsDashboardData {
    transactions: TransactionWithRelations[];
    metrics: FinancialMetrics[];
    teamMembers: any[];
    aggregatedMetrics: {
        totalSalesVolume: number; // For backward compatibility if needed, or total combined
        totalGrossCommission: number;
        totalNetIncome: number;
        totalMasterIncome: number;
        totalOfficeIncome: number;
        closedDealsCount: number;
        doubleSidedCount: number;
        singleSidedCount: number;
        totalPuntas: number;
        averageTicket: number;
        // Nuevas métricas desglosadas por estado
        totalRealVolume: number;
        totalRealCommission: number;
        totalProjectedVolume: number;
        totalProjectedCommission: number;
        totalLostVolume: number;
    } | null;
}

export interface ClosingsFilters {
    year?: number;
    month?: number;
    organizationId?: string;
    agentId?: string;
    status?: 'all' | 'pending' | 'completed' | 'cancelled';
}

export async function getClosingsDashboardDataAction(filters: ClosingsFilters = {}): Promise<ClosingsDashboardData> {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Obtener perfil para saber el rol y la organización
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

    if (!profile) throw new Error('Profile not found');

    const role = profile.role;
    const userOrgId = profile.organization_id;

    // 2. Prepare Queries
    let txQuery = supabase
        .from('transactions')
        .select(`
            *,
            property:properties(id, title, address),
            agent:profiles(id, first_name, last_name, default_split_percentage),
            organization:organizations(id, name),
            buyer_person:persons!transactions_buyer_person_id_fkey(id, first_name, last_name, phone),
            seller_person:persons!transactions_seller_person_id_fkey(id, first_name, last_name, phone)
        `)
        .order('transaction_date', { ascending: false });

    let metricsQuery = supabase
        .from('view_financial_metrics')
        .select('*');

    // FILTRADO ESTRICTO DE SEGURIDAD BASADO EN ROLES
    // Esto asegura que, independientemente de los filtros de UI, los usuarios no vean datos de otros
    if (role === 'child') {
        txQuery = txQuery.eq('agent_id', user.id);
        metricsQuery = metricsQuery.eq('agent_id', user.id);
    } else if (role === 'parent' && userOrgId) {
        txQuery = txQuery.eq('organization_id', userOrgId);
        metricsQuery = metricsQuery.eq('organization_id', userOrgId);
    }

    // 3. Apply UI Filters
    if (filters.organizationId && filters.organizationId !== 'all') {
        txQuery = txQuery.eq('organization_id', filters.organizationId);
        metricsQuery = metricsQuery.eq('organization_id', filters.organizationId);
    }

    if (filters.agentId && filters.agentId !== 'all') {
        txQuery = txQuery.eq('agent_id', filters.agentId);
        metricsQuery = metricsQuery.eq('agent_id', filters.agentId);
    }

    if (filters.year) {
        const start = `${filters.year}-01-01`;
        const end = `${filters.year}-12-31`;
        txQuery = txQuery.gte('transaction_date', start).lte('transaction_date', end);
        metricsQuery = metricsQuery.eq('year', filters.year);
    }

    if (filters.status && filters.status !== 'all') {
        txQuery = txQuery.eq('status', filters.status);
    }

    if (filters.month) {
        if (filters.year) {
            const lastDay = new Date(filters.year, filters.month, 0).getDate();
            const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
            const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
            txQuery = txQuery.gte('transaction_date', start).lte('transaction_date', end);
        }
        metricsQuery = metricsQuery.eq('month', filters.month);
    }

    // 4. Team Members (For Filter Dropdowns)
    let teamQuery = supabase
        .from('profiles')
        .select('id, first_name, last_name, role, organization_id')
        .order('first_name', { ascending: true });

    // Filtrar también el listado de equipo por seguridad
    if (role === 'child') {
        teamQuery = teamQuery.eq('id', user.id);
    } else if (role === 'parent' && userOrgId) {
        teamQuery = teamQuery.eq('organization_id', userOrgId);
    }

    const { data: teamMembers } = await teamQuery;

    // 5. Execute
    const [txRes, metricsRes] = await Promise.all([
        txQuery,
        metricsQuery
    ]);

    if (txRes.error) throw new Error(txRes.error.message);
    if (metricsRes.error) throw new Error(metricsRes.error.message);

    const transactions = (txRes.data as unknown || []) as TransactionWithRelations[];
    const metricsData = (metricsRes.data as unknown || []) as FinancialMetrics[];

    // 6. Aggregation
    const aggregated = metricsData.reduce((acc, m) => {
        const puntas = (m.single_sided_count || 0) + ((m.double_sided_count || 0) * 2);

        // Sumamos al total general
        acc.totalSalesVolume += (m.total_sales_volume || 0);
        acc.totalGrossCommission += (m.total_gross_commission || 0);
        acc.totalNetIncome += (m.total_net_income || 0);
        acc.totalMasterIncome += (m.total_master_income || 0);
        acc.totalOfficeIncome += (m.total_office_income || 0);
        acc.closedDealsCount += (m.closed_deals_count || 0);
        acc.doubleSidedCount += (m.double_sided_count || 0);
        acc.singleSidedCount += (m.single_sided_count || 0);
        acc.totalPuntas += puntas;

        // Sumamos según estado (NULL/undefined = completed para transacciones legacy)
        const txStatus = (m as any).status || 'completed';
        if (txStatus === 'completed') {
            acc.totalRealVolume += (m.total_sales_volume || 0);
            acc.totalRealCommission += (m.total_gross_commission || 0);
        } else if (txStatus === 'pending') {
            acc.totalProjectedVolume += (m.total_sales_volume || 0);
            acc.totalProjectedCommission += (m.total_gross_commission || 0);
        } else if (txStatus === 'cancelled') {
            acc.totalLostVolume += (m.total_sales_volume || 0);
        }

        return acc;
    }, {
        totalSalesVolume: 0, totalGrossCommission: 0, totalNetIncome: 0, totalMasterIncome: 0,
        totalOfficeIncome: 0, closedDealsCount: 0, doubleSidedCount: 0, singleSidedCount: 0, totalPuntas: 0,
        totalRealVolume: 0, totalRealCommission: 0, totalProjectedVolume: 0, totalProjectedCommission: 0, totalLostVolume: 0
    });

    const averageTicket = aggregated.closedDealsCount > 0 ? aggregated.totalSalesVolume / aggregated.closedDealsCount : 0;

    return {
        transactions,
        metrics: metricsData,
        teamMembers: teamMembers || [],
        aggregatedMetrics: { ...aggregated, averageTicket }
    };
}
