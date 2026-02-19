'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPersonsAction,
    createPersonAction,
    updatePersonAction,
    touchPersonAction,
    getCRMAgentsAction,
    getExistingTagsAction,
    getExistingSourcesAction,
    getPersonByIdAction,
    deletePersonAction
} from '../actions/personActions';
import { LifecycleStatus } from '@/features/clients/types';
import { toast } from 'sonner';

export const crmKeys = {
    all: ['crm'] as const,
    persons: (filters: any) => [...crmKeys.all, 'persons', filters] as const,
    agents: () => [...crmKeys.all, 'agents'] as const,
    tags: () => [...crmKeys.all, 'tags'] as const,
    sources: () => [...crmKeys.all, 'sources'] as const,
    person: (id: string) => [...crmKeys.all, 'person', id] as const,
};

export function useCRM(filters: {
    relationshipStatus?: string[];
    tags?: string[];
    search?: string;
    organizationId?: string;
    agentId?: string[];
    healthScore?: string;
    influenceLevel?: number[];
    contactType?: string[];
    source?: string[];
    referredById?: string[];
    lifecycleStatus?: LifecycleStatus[];
} = {}) {
    const queryClient = useQueryClient();

    // Query for fetching persons
    const personsQuery = useQuery({
        queryKey: crmKeys.persons(filters),
        queryFn: async () => {
            const result = await getPersonsAction(filters);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        },
    });

    // Query for fetching agents (for filters)
    const agentsQuery = useQuery({
        queryKey: crmKeys.agents(),
        queryFn: async () => {
            const result = await getCRMAgentsAction();
            if (!result.success) return [];
            return result.data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // Query for fetching existing tags
    const tagsQuery = useQuery({
        queryKey: crmKeys.tags(),
        queryFn: async () => {
            const result = await getExistingTagsAction();
            if (!result.success) return [];
            return result.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Query for fetching existing sources
    const sourcesQuery = useQuery({
        queryKey: crmKeys.sources(),
        queryFn: async () => {
            const result = await getExistingSourcesAction();
            if (!result.success) return [];
            return result.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // ... mutations ...

    // Mutation for creating a person
    const createPerson = useMutation({
        mutationFn: createPersonAction,
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Persona registrada correctamente');
                queryClient.invalidateQueries({ queryKey: crmKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al conectar con el servidor');
            console.error(error);
        }
    });

    // Mutation for updating a person
    const updatePerson = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updatePersonAction(id, data),
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Relación actualizada');
                queryClient.invalidateQueries({ queryKey: crmKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al actualizar datos');
            console.error(error);
        }
    });

    // Mutation for "touching" a person (updating last interaction)
    const touchPerson = useMutation({
        mutationFn: touchPersonAction,
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: crmKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            console.error(error);
        }
    });

    // Mutation for deleting a person
    const deletePerson = useMutation({
        mutationFn: deletePersonAction,
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Relación eliminada');
                queryClient.invalidateQueries({ queryKey: crmKeys.all });
            } else {
                toast.error(result.error);
            }
        },
        onError: (error) => {
            toast.error('Error al eliminar relación');
            console.error(error);
        }
    });

    return {
        persons: personsQuery.data || [],
        agents: agentsQuery.data || [],
        availableTags: tagsQuery.data || [],
        availableSources: sourcesQuery.data || [],
        isLoading: personsQuery.isLoading || agentsQuery.isLoading,
        error: personsQuery.error || agentsQuery.error,
        createPerson,
        updatePerson,
        touchPerson,
        deletePerson,
        refetch: personsQuery.refetch
    };
}

export function usePerson(id: string | null) {
    return useQuery({
        queryKey: crmKeys.person(id || ''),
        queryFn: async () => {
            if (!id) return null;
            const result = await getPersonByIdAction(id);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        },
        enabled: !!id,
    });
}
