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
    getClientInteractionsAction
} from '../actions/clientActions';
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
    scope?: 'personal' | 'office' | 'network';
    organizationId?: string;
    agentId?: string;
    page?: number;
    limit?: number;
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
                const actionResult = await getNetworkClientsAction({ organizationId: filters.organizationId });
                if (!actionResult.success) throw new Error(actionResult.error);
                return { clients: actionResult.data!, total: actionResult.data!.length };
            }

            // Prepare filters for the server action
            const actionFilters = {
                ...filters,
                agentId: filters?.scope === 'personal' ? user?.profile?.id : filters?.agentId,
                organizationId: filters?.scope === 'office' ? filters?.organizationId : user?.profile?.organization_id
            };

            // Normal paginated view
            const actionResult = await getClientsAction(actionFilters as any);

            if (!actionResult.success) throw new Error(actionResult.error);

            return actionResult.data!;
        },
        staleTime: 5 * 60 * 1000,
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
                .select('*, agent:profiles(id, first_name, last_name, phone)')
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
                toast.success('Cliente registrado correctamente');
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
                toast.success('Cliente actualizado correctamente');
                queryClient.invalidateQueries({ queryKey: clientKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al actualizar el cliente');
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
                toast.success('Cliente eliminado');
                queryClient.invalidateQueries({ queryKey: clientKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al eliminar el cliente');
            console.error(error);
        }
    });
}
