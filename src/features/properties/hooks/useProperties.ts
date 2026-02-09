'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Property, PropertyType, PropertyStatus } from '@/types/database.types';

// Query keys centralizados (SSOT)
export const propertyKeys = {
    all: ['properties'] as const,
    list: (filters?: PropertyFilters) => [...propertyKeys.all, 'list', filters] as const,
    detail: (id: string) => [...propertyKeys.all, 'detail', id] as const,
    types: () => [...propertyKeys.all, 'types'] as const,
    statuses: () => [...propertyKeys.all, 'statuses'] as const,
};

export interface PropertyFilters {
    city?: string;
    operation_type?: string;
    property_type_id?: string;
    status_id?: string;
    min_price?: number;
    max_price?: number;
    is_published?: boolean;
}

export type PropertyWithDetails = Property & {
    property_type: PropertyType | null;
    property_status: PropertyStatus | null;
    agent: {
        id: string;
        first_name: string;
        last_name: string;
        organization: {
            id: string;
            name: string;
        } | null;
    } | null;
};

/**
 * Hook centralizado para obtener propiedades (SSOT)
 * Las políticas RLS se aplican automáticamente
 */
export function useProperties(filters?: PropertyFilters) {
    const supabase = createClient();

    return useQuery({
        queryKey: propertyKeys.list(filters),
        queryFn: async (): Promise<PropertyWithDetails[]> => {
            let query = supabase
                .from('properties')
                .select(`
          *,
          property_type:property_types(*),
          property_status:property_statuses(*),
          agent:profiles!properties_agent_id_fkey(
            id,
            first_name,
            last_name,
            organization:organizations(id, name)
          )
        `)
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters?.city) {
                query = query.ilike('city', `%${filters.city}%`);
            }
            if (filters?.operation_type) {
                query = query.eq('operation_type', filters.operation_type);
            }
            if (filters?.property_type_id) {
                query = query.eq('property_type_id', filters.property_type_id);
            }
            if (filters?.status_id) {
                query = query.eq('status_id', filters.status_id);
            }
            if (filters?.min_price !== undefined) {
                query = query.gte('price', filters.min_price);
            }
            if (filters?.max_price !== undefined) {
                query = query.lte('price', filters.max_price);
            }
            if (filters?.is_published !== undefined) {
                query = query.eq('is_published', filters.is_published);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return (data as unknown as PropertyWithDetails[]) || [];
        },
        staleTime: 2 * 60 * 1000, // 2 minutos
    });
}

/**
 * Hook para obtener una propiedad por ID
 */
export function useProperty(id: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: propertyKeys.detail(id),
        queryFn: async (): Promise<PropertyWithDetails | null> => {
            const { data, error } = await supabase
                .from('properties')
                .select(`
          *,
          property_type:property_types(*),
          property_status:property_statuses(*),
          agent:profiles!properties_agent_id_fkey(
            id,
            first_name,
            last_name,
            organization:organizations(id, name)
          )
        `)
                .eq('id', id)
                .single();

            if (error) {
                throw error;
            }

            return data as unknown as PropertyWithDetails;
        },
        enabled: !!id,
    });
}

/**
 * Hook para obtener tipos de propiedad
 */
export function usePropertyTypes() {
    const supabase = createClient();

    return useQuery({
        queryKey: propertyKeys.types(),
        queryFn: async (): Promise<PropertyType[]> => {
            const { data, error } = await supabase
                .from('property_types')
                .select('*')
                .order('name');

            if (error) {
                throw error;
            }

            return data || [];
        },
        staleTime: 10 * 60 * 1000, // 10 minutos (datos estáticos)
    });
}

/**
 * Hook para obtener estados de propiedad
 */
export function usePropertyStatuses() {
    const supabase = createClient();

    return useQuery({
        queryKey: propertyKeys.statuses(),
        queryFn: async (): Promise<PropertyStatus[]> => {
            const { data, error } = await supabase
                .from('property_statuses')
                .select('*')
                .order('name');

            if (error) {
                throw error;
            }

            return data || [];
        },
        staleTime: 10 * 60 * 1000, // 10 minutos (datos estáticos)
    });
}
