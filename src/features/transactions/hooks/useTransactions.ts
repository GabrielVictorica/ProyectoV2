'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';

// =============================================================================
// TYPES
// =============================================================================

export interface Transaction {
    id: string;
    organization_id: string;
    property_id: string | null;
    agent_id: string;
    transaction_date: string;
    actual_price: number;
    sides: number;
    commission_percentage: number;
    agent_split_percentage: number;
    gross_commission: number;
    net_commission: number;
    buyer_name: string | null;
    seller_name: string | null;
    buyer_id: string | null;
    seller_id: string | null;
    custom_property_title: string | null;
    office_commission_amount: number;
    master_commission_amount: number;
    royalty_percentage_at_closure: number;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface TransactionWithRelations extends Transaction {
    property: {
        id: string;
        title: string;
        address: string | null;
    } | null;
    agent: {
        id: string;
        first_name: string;
        last_name: string;
        default_split_percentage: number | null;
    } | null;
    organization?: {
        id: string;
        name: string;
    } | null;
}

export interface FinancialMetrics {
    organization_id: string;
    agent_id: string;
    year: number;
    month: number;
    total_sales_volume: number;
    total_gross_commission: number;
    total_net_income: number;
    total_master_income: number;
    total_office_income: number;
    closed_deals_count: number;
    average_ticket: number;
    double_sided_count: number;
    single_sided_count: number;
}

export interface TransactionFilters {
    organizationId?: string;
    agentId?: string;
    propertyId?: string;
    year?: number;
    month?: number;
}

export interface CreateTransactionInput {
    organization_id?: string | null;
    property_id?: string | null;
    agent_id?: string | null;
    transaction_date: string;
    actual_price: number;
    sides: number;
    commission_percentage: number;
    agent_split_percentage: number;
    buyer_name?: string | null;
    seller_name?: string | null;
    buyer_id?: string | null;
    seller_id?: string | null;
    custom_property_title?: string | null;
    notes?: string | null;
}

export interface UpdateTransactionInput {
    id: string;
    transaction_date?: string;
    actual_price?: number;
    sides?: number;
    commission_percentage?: number;
    agent_split_percentage?: number;
    gross_commission?: number;
    net_commission?: number;
    buyer_name?: string | null;
    seller_name?: string | null;
    property_id?: string | null;
    agent_id?: string | null;
    organization_id?: string | null;
    custom_property_title?: string | null;
    notes?: string | null;
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const transactionKeys = {
    all: ['transactions'] as const,
    lists: () => [...transactionKeys.all, 'list'] as const,
    list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
    details: () => [...transactionKeys.all, 'detail'] as const,
    detail: (id: string) => [...transactionKeys.details(), id] as const,
    metrics: () => [...transactionKeys.all, 'metrics'] as const,
    metricsFiltered: (filters: TransactionFilters) => [...transactionKeys.metrics(), filters] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook para obtener lista de transacciones
 * Usa la API route que maneja filtrado por rol automáticamente
 */
export function useTransactions(filters?: TransactionFilters) {
    const { data: auth } = useAuth();

    return useQuery({
        queryKey: transactionKeys.list(filters || {}),
        queryFn: async (): Promise<TransactionWithRelations[]> => {
            const params = new URLSearchParams();
            if (filters?.organizationId) params.append('organizationId', filters.organizationId);
            if (filters?.agentId) params.append('agentId', filters.agentId);
            if (filters?.propertyId) params.append('propertyId', filters.propertyId);
            if (filters?.year) params.append('year', String(filters.year));
            if (filters?.month) params.append('month', String(filters.month));

            const response = await fetch(`/api/transactions?${params.toString()}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al obtener transacciones');
            }

            return result.data || [];
        },
        enabled: !!auth,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para obtener una transacción específica
 */
export function useTransaction(id: string) {
    return useQuery({
        queryKey: transactionKeys.detail(id),
        queryFn: async (): Promise<TransactionWithRelations | null> => {
            const response = await fetch(`/api/transactions/${id}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al obtener transacción');
            }

            return result.data;
        },
        enabled: !!id,
    });
}

/**
 * Hook para obtener métricas financieras desde la API
 */
export function useFinancialMetrics(filters?: TransactionFilters) {
    const { data: auth } = useAuth();

    return useQuery({
        queryKey: transactionKeys.metricsFiltered(filters || {}),
        queryFn: async (): Promise<FinancialMetrics[]> => {
            const params = new URLSearchParams();
            if (filters?.organizationId) params.append('organizationId', filters.organizationId);
            if (filters?.agentId) params.append('agentId', filters.agentId);
            if (filters?.year) params.append('year', String(filters.year));
            if (filters?.month) params.append('month', String(filters.month));

            const response = await fetch(`/api/transactions/metrics?${params.toString()}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al obtener métricas');
            }

            return result.data || [];
        },
        enabled: !!auth,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook para obtener suma total de métricas (útil para KPIs)
 */
export function useAggregatedMetrics(filters?: TransactionFilters) {
    const { data: metrics, ...rest } = useFinancialMetrics(filters);

    const aggregated = metrics?.reduce(
        (acc, m) => {
            const puntas = (m.single_sided_count || 0) + ((m.double_sided_count || 0) * 2);
            return {
                totalSalesVolume: acc.totalSalesVolume + (m.total_sales_volume || 0),
                totalGrossCommission: acc.totalGrossCommission + (m.total_gross_commission || 0),
                totalNetIncome: acc.totalNetIncome + (m.total_net_income || 0),
                totalMasterIncome: acc.totalMasterIncome + (m.total_master_income || 0),
                totalOfficeIncome: acc.totalOfficeIncome + (m.total_office_income || 0),
                closedDealsCount: acc.closedDealsCount + (m.closed_deals_count || 0),
                doubleSidedCount: acc.doubleSidedCount + (m.double_sided_count || 0),
                singleSidedCount: acc.singleSidedCount + (m.single_sided_count || 0),
                totalPuntas: acc.totalPuntas + puntas,
            };
        },
        {
            totalSalesVolume: 0,
            totalGrossCommission: 0,
            totalNetIncome: 0,
            totalMasterIncome: 0,
            totalOfficeIncome: 0,
            closedDealsCount: 0,
            doubleSidedCount: 0,
            singleSidedCount: 0,
            totalPuntas: 0,
        }
    );

    const averageTicket = aggregated && aggregated.closedDealsCount > 0
        ? aggregated.totalSalesVolume / aggregated.closedDealsCount
        : 0;

    return {
        data: aggregated ? { ...aggregated, averageTicket } : null,
        metrics,
        ...rest,
    };
}

/**
 * Hook para crear una nueva transacción
 * Incluye cálculos automáticos de comisiones en el servidor
 */
export function useAddTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateTransactionInput) => {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al crear transacción');
            }

            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
    });
}

/**
 * Hook para actualizar una transacción existente
 */
export function useUpdateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateTransactionInput) => {
            const response = await fetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al actualizar transacción');
            }

            return result.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
            if (data?.id) {
                queryClient.invalidateQueries({ queryKey: transactionKeys.detail(data.id) });
            }
        },
    });
}

/**
 * Hook para eliminar una transacción
 */
export function useDeleteTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch('/api/transactions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al eliminar transacción');
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        },
    });
}
