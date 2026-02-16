'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Client, AnonymousClient, ClientWithAgent } from '../types';
import {
    createClientAction,
    updateClientAction,
    deleteClientAction,
    getClientsAction,
    getNetworkClientsAction,
    addClientInteractionAction,
    getClientInteractionsAction,
} from '../actions/clientActions';
import { getExistingSearchTagsAction } from '@/features/crm/actions/personActions';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';

// ... (existing code)

/**
 * Hook para obtener las interacciones de un cliente.
 */
export function useInteractions(clientId: string) {
    return useQuery({
        queryKey: ['client-interactions', clientId],
        queryFn: async () => {
            const res = await getClientInteractionsAction(clientId);
            if (!res.success) throw new Error(res.error);
            return res.data!;
        },
        enabled: !!clientId,
    });
}

/**
 * Mutation para agregar una interacción.
 */
export function useAddInteraction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ clientId, type, content }: { clientId: string, type: any, content: string }) =>
            addClientInteractionAction(clientId, type, content),
        onSuccess: (result, variables) => {
            if (result.success) {
                toast.success('Nota agregada');
                queryClient.invalidateQueries({ queryKey: ['client-interactions', variables.clientId] });
            } else {
                toast.error(result.error);
            }
        },
    });
}

// Query keys centralizados (SSOT)
export const clientKeys = {
    all: ['clients'] as const,
    list: (filters?: ClientFilters) => [...clientKeys.all, 'list', filters] as const,
    network: () => [...clientKeys.all, 'network'] as const,
    detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
};

export interface ClientFilters {
    type?: string;
    status?: string;
    search?: string;
    scope?: 'personal' | 'office' | 'network' | 'global';
    organizationId?: string;
    agentId?: string;
    page?: number;
    limit?: number;
    enabled?: boolean;
    // Advanced filters
    propertyTypes?: string[];
    paymentMethods?: string[];
    budgetMin?: number | null;
    budgetMax?: number | null;
    bedrooms?: string[];
    statusFilter?: string[];
    tags?: string[];
}

/**
 * Hook centralizado para obtener clientes con soporte para paginación.
 */
export function useClients(filters?: ClientFilters) {
    const { auth: user } = usePermissions();
    const supabase = createClient();

    return useQuery({
        queryKey: clientKeys.list(filters),
        queryFn: async (): Promise<{ clients: (ClientWithAgent | AnonymousClient)[], total: number }> => {
            if (filters?.scope === 'network') {
                const actionResult = await getNetworkClientsAction({
                    organizationId: filters.organizationId,
                    page: filters.page,
                    limit: filters.limit
                });
                if (!actionResult.success) throw new Error(actionResult.error);
                return actionResult.data!;
            }

            // Prepare filters for the server action
            const actionFilters = {
                ...filters,
                agentId: (filters?.scope === 'personal') ? user?.profile?.id : filters?.agentId,
                organizationId: (filters?.scope === 'office' || filters?.scope === 'personal') ? user?.profile?.organization_id : filters?.organizationId
            };

            // Normal paginated view
            const actionResult = await getClientsAction(actionFilters as any);

            if (!actionResult.success) throw new Error(actionResult.error);

            return actionResult.data!;
        },
        staleTime: 5 * 60 * 1000,
        enabled: filters?.enabled ?? true,
    });
}

/**
 * Hook para obtener un cliente por ID con PII.
 */
export function useClient(id: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: clientKeys.detail(id),
        queryFn: async (): Promise<ClientWithAgent | null> => {
            const { data, error } = await supabase
                .from('clients')
                .select('*, agent:profiles(id, first_name, last_name, phone), person:persons(id, first_name, last_name, tags, relationship_status)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as unknown as ClientWithAgent;
        },
        enabled: !!id,
    });
}

/**
 * Mutation para crear un cliente.
 */
export function useCreateClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createClientAction,
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Búsqueda registrada correctamente');
                queryClient.invalidateQueries({ queryKey: clientKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al conectar con el servidor');
            console.error(error);
        }
    });
}

/**
 * Mutation para actualizar un cliente.
 */
export function useUpdateClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateClientAction,
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Búsqueda actualizada correctamente');
                queryClient.invalidateQueries({ queryKey: clientKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al actualizar la búsqueda');
            console.error(error);
        }
    });
}

/**
 * Mutation para eliminar un cliente.
 */
export function useDeleteClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteClientAction,
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Búsqueda eliminada');
                queryClient.invalidateQueries({ queryKey: clientKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al eliminar la búsqueda');
            console.error(error);
        }
    });
}

/**
 * Hook para obtener etiquetas exclusivas de búsquedas.
 */
export function useSearchTags() {
    return useQuery({
        queryKey: [...clientKeys.all, 'search-tags'],
        queryFn: async () => {
            const result = await getExistingSearchTagsAction();
            if (!result.success) return [];
            return result.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}
