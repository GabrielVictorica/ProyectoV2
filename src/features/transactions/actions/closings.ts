
'use server';

import { createClient } from '@/lib/supabase/server';
import { TransactionWithRelations, FinancialMetrics } from '../hooks/useTransactions';

export interface ClosingsDashboardData {
    transactions: TransactionWithRelations[];
    metrics: FinancialMetrics[];
    teamMembers: { id: string; first_name: string; last_name: string; role: string; organization_id: string | null }[];
    possibleDuplicates: [string, string][]; // pairs of tx IDs that look like duplicates
    aggregatedMetrics: {
        totalSalesVolume: number;
        totalGrossCommission: number;
        totalNetIncome: number;
        totalMasterIncome: number;
        totalOfficeIncome: number;
        closedDealsCount: number;
        doubleSidedCount: number;
        singleSidedCount: number;
        totalPuntas: number;
        averageTicket: number;
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

    // Use adminClient to bypass RLS overhead and gain "Excellent" performance
    // Security is enforced manually below via .eq filters based on the verified role
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();

    // 2. Prepare Queries
    let txQuery = (adminClient as any)
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

    let metricsQuery = (adminClient as any)
        .from('view_financial_metrics')
        .select('*');

    // FILTRADO ESTRICTO DE SEGURIDAD BASADO EN ROLES
    // Como usamos adminClient, debemos aplicar manualmente el RLS lógico
    if (role === 'child') {
        txQuery = txQuery.eq('agent_id', user.id);
        metricsQuery = metricsQuery.eq('agent_id', user.id);
    } else if (role === 'parent' && userOrgId) {
        txQuery = txQuery.eq('organization_id', userOrgId);
        metricsQuery = metricsQuery.eq('organization_id', userOrgId);
    }

    // 3. Apply UI Filters (Solo Organización, ya que Agente se filtra en el cliente para latencia 0ms)
    if (filters.organizationId && filters.organizationId !== 'all') {
        txQuery = txQuery.eq('organization_id', filters.organizationId);
        metricsQuery = metricsQuery.eq('organization_id', filters.organizationId);
    }

    // ELIMINADO: Filtro por agentId en servidor para permitir filtrado instantáneo en cliente
    /*
    if (filters.agentId && filters.agentId !== 'all') {
        txQuery = txQuery.eq('agent_id', filters.agentId);
        metricsQuery = metricsQuery.eq('agent_id', filters.agentId);
    }
    */
    
    // Filtro por año/mes
    if (filters.year) {
        const start = `${filters.year}-01-01`;
        const end = `${filters.year}-12-31`;
        txQuery = txQuery.gte('transaction_date', start).lte('transaction_date', end);
        metricsQuery = metricsQuery.eq('year', filters.year);
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

    // 4. Team Members - Fetch only once per dashboard load if possible, 
    // but for simplicity we keep it parallel here.
    let teamQuery = (adminClient as any)
        .from('profiles')
        .select('id, first_name, last_name, role, organization_id')
        .order('first_name', { ascending: true })
        .order('last_name', { ascending: true });

    // Filtrar también el listado de equipo por seguridad lógica
    if (role === 'child') {
        teamQuery = teamQuery.eq('id', user.id);
    } else if (role === 'parent' && userOrgId) {
        teamQuery = teamQuery.eq('organization_id', userOrgId);
    }

    // 5. Execute in Parallel for maximum performance
    const [txRes, metricsRes, teamRes] = await Promise.all([
        txQuery,
        metricsQuery,
        teamQuery
    ]);

    if (txRes.error) throw new Error(txRes.error.message);
    if (metricsRes.error) throw new Error(metricsRes.error.message);
    if (teamRes.error) throw new Error(teamRes.error.message);

    const rawTransactions = (txRes.data || []) as TransactionWithRelations[];
    const metricsData = (metricsRes.data || []) as FinancialMetrics[];
    const teamMembers = (teamRes.data || []) as { id: string; first_name: string; last_name: string; role: string; organization_id: string | null }[];

    // 6. DEDUPLICATION for god/parent
    let transactions: TransactionWithRelations[];
    let possibleDuplicates: [string, string][] = [];

    if (role === 'child') {
        // Child: no dedup, see their own records as-is
        transactions = rawTransactions;
    } else {
        // God/Parent: deduplicate linked operations
        const keep = new Set<string>();
        const skip = new Set<string>();

        for (const tx of rawTransactions) {
            if (skip.has(tx.id)) continue;
            
            const linkedId = (tx as any).linked_transaction_id;
            if (linkedId) {
                keep.add(tx.id);
                skip.add(linkedId);
            } else {
                keep.add(tx.id);
            }
        }
        
        transactions = rawTransactions.filter(tx => keep.has(tx.id) && !skip.has(tx.id));

        // Enrich linked transactions with info from the other agent
        // CRITICAL: Sum commissions from both sides so totals are accurate
        const txMap = new Map(rawTransactions.map(t => [t.id, t]));
        transactions = transactions.map(tx => {
            const linkedId = (tx as any).linked_transaction_id;
            if (linkedId) {
                const linkedTx = txMap.get(linkedId);
                if (linkedTx) {
                    return {
                        ...tx,
                        sides: 2, // Always 2 sides when linked
                        // Sum commissions from both sides for accurate totals
                        gross_commission: Number(tx.gross_commission || 0) + Number(linkedTx.gross_commission || 0),
                        net_commission: Number(tx.net_commission || 0) + Number(linkedTx.net_commission || 0),
                        office_commission_amount: Number(tx.office_commission_amount || 0) + Number(linkedTx.office_commission_amount || 0),
                        master_commission_amount: Number(tx.master_commission_amount || 0) + Number(linkedTx.master_commission_amount || 0),
                        
                        // Retenemos los valores originales de cada lado para poder calcular los KPIs
                        // individuales cuando se filtre por un agente específico
                        _original_gross: Number(tx.gross_commission || 0),
                        _original_net: Number(tx.net_commission || 0),
                        _original_office: Number(tx.office_commission_amount || 0),
                        _original_master: Number(tx.master_commission_amount || 0),
                        
                        _linked_gross: Number(linkedTx.gross_commission || 0),
                        _linked_net: Number(linkedTx.net_commission || 0),
                        _linked_office: Number(linkedTx.office_commission_amount || 0),
                        _linked_master: Number(linkedTx.master_commission_amount || 0),

                        _linkedAgent: linkedTx.agent,
                        _linkedAgentId: linkedTx.agent_id,
                        _linkedTransactionId: linkedId,
                    } as any;
                }
            }
            return tx;
        });

        // 7. Detect possible duplicates (unlinked transactions that look similar)
        try {
            const { data: dismissed } = await adminClient
                .from('dismissed_duplicates')
                .select('transaction_id_a, transaction_id_b');

            const dismissedSet = new Set(
                (dismissed || []).flatMap((d: any) => [
                    `${d.transaction_id_a}-${d.transaction_id_b}`,
                    `${d.transaction_id_b}-${d.transaction_id_a}`
                ])
            );

            // Only check unlinked transactions with sides=1
            // sides=2 means the agent already loaded both sides → impossible to be a duplicate
            const unlinked = rawTransactions.filter(t => !(t as any).linked_transaction_id && (t.sides || 1) !== 2);

            for (let i = 0; i < unlinked.length; i++) {
                for (let j = i + 1; j < unlinked.length; j++) {
                    const a = unlinked[i], b = unlinked[j];
                    // Must be different agents
                    if (a.agent_id === b.agent_id) continue;
                    // Must not be dismissed
                    if (dismissedSet.has(`${a.id}-${b.id}`)) continue;

                    // Criteria: same price ±5% AND dates within 45 days
                    const priceA = Number(a.actual_price || 0);
                    const priceB = Number(b.actual_price || 0);
                    const priceDiff = Math.abs(priceA - priceB) / Math.max(priceA, 1);
                    const dateA = new Date(a.transaction_date).getTime();
                    const dateB = new Date(b.transaction_date).getTime();
                    const dateDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);

                    if (priceDiff < 0.05 && dateDiff < 45) {
                        possibleDuplicates.push([a.id, b.id]);
                    }
                }
            }
        } catch (e) {
            // Non-critical: if detection fails, just return empty
            console.error('Error detecting duplicates:', e);
        }
    }

    // 8. Aggregation (unchanged logic)
    const aggregated = metricsData.reduce((acc, m) => {
        const puntas = (m.single_sided_count || 0) + ((m.double_sided_count || 0) * 2);

        acc.totalSalesVolume += (m.total_sales_volume || 0);
        acc.totalGrossCommission += (m.total_gross_commission || 0);
        acc.totalNetIncome += (m.total_net_income || 0);
        acc.totalMasterIncome += (m.total_master_income || 0);
        acc.totalOfficeIncome += (m.total_office_income || 0);
        acc.closedDealsCount += (m.closed_deals_count || 0);
        acc.doubleSidedCount += (m.double_sided_count || 0);
        acc.singleSidedCount += (m.single_sided_count || 0);
        acc.totalPuntas += puntas;

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
        possibleDuplicates,
        aggregatedMetrics: { ...aggregated, averageTicket }
    };
}
