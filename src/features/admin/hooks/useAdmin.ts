'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Organization, UserRole } from '@/types/database.types';

// Query keys centralizados (SSOT)
export const adminKeys = {
    all: ['admin'] as const,
    organizations: () => [...adminKeys.all, 'organizations'] as const,
    users: () => [...adminKeys.all, 'users'] as const,
    usersByOrg: (orgId: string) => [...adminKeys.all, 'users', orgId] as const,
};

export type UserWithOrganization = Profile & {
    organization: Organization | null;
    parent: Profile | null;
    reports_to_organization_id?: string | null;
};

export type OrganizationWithBilling = Organization & {
    overdue_count: number;
    pending_count: number;
};

/**
 * Hook para obtener todas las organizaciones (solo GOD)
 * @param options.enabled - Si false, no ejecuta la query (útil para carga condicional)
 */
export function useOrganizations(options?: { enabled?: boolean }) {
    const supabase = createClient();

    return useQuery({
        queryKey: adminKeys.organizations(),
        queryFn: async (): Promise<OrganizationWithBilling[]> => {
            const { data: orgs, error: orgsError } = await (supabase
                .from('organizations') as any)
                .select('*')
                .order('name');

            if (orgsError) throw orgsError;

            // Obtenemos conteos de billing records no pagados
            const { data: billingInfo, error: billingError } = await (supabase
                .from('billing_records') as any)
                .select('organization_id, status, first_due_date, due_date')
                .neq('status', 'paid')
                .neq('status', 'cancelled');

            if (billingError) throw billingError;

            const today = new Date();

            return (orgs || []).map(org => {
                const orgBilling = (billingInfo || []).filter(b => b.organization_id === org.id);

                const overdue_count = orgBilling.filter(b => {
                    const dueDate = new Date(b.first_due_date || b.due_date);
                    return dueDate < today || b.status === 'overdue';
                }).length;

                return {
                    ...org,
                    overdue_count,
                    pending_count: orgBilling.length,
                };
            }) as OrganizationWithBilling[];
        },
        staleTime: 2 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook para obtener todos los usuarios (solo GOD)
 * @param options.enabled - Si false, no ejecuta la query (útil para carga condicional)
 */
export function useUsers(options?: { enabled?: boolean }) {
    const supabase = createClient();

    return useQuery({
        queryKey: adminKeys.users(),
        queryFn: async (): Promise<UserWithOrganization[]> => {
            // Primero obtenemos los perfiles con organizaciones
            const { data, error } = await (supabase
                .from('profiles') as any)
                .select(`
                    *,
                    organization:organizations(*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Ahora enriquecemos con la info del parent si existe
            const profiles = data || [];
            const parentIds = profiles
                .map(p => p.parent_id)
                .filter((id): id is string => id !== null);

            let parentsMap: Record<string, { first_name: string; last_name: string }> = {};

            if (parentIds.length > 0) {
                const { data: parents } = await (supabase
                    .from('profiles') as any)
                    .select('id, first_name, last_name')
                    .in('id', parentIds);

                if (parents) {
                    parentsMap = Object.fromEntries(
                        parents.map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
                    );
                }
            }

            return profiles.map(profile => ({
                ...profile,
                parent: profile.parent_id ? parentsMap[profile.parent_id] || null : null,
            })) as UserWithOrganization[];
        },
        staleTime: 2 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });
}

/**
 * Hook para crear una nueva organización
 */
export function useCreateOrganization() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (org: { name: string; slug: string; email?: string; phone?: string; address?: string }) => {
            const { data, error } = await supabase
                .from('organizations')
                .insert(org)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
        },
    });
}

/**
 * Hook para crear un nuevo usuario (solo GOD puede hacer esto)
 * Nota: Esto requiere una edge function o server action para crear el auth user
 */
export interface CreateUserData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    organization_id?: string;
    parent_id?: string;
    phone?: string;
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (userData: CreateUserData) => {
            // Primero crear el usuario en auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
            });

            if (authError) {
                // Si no tenemos acceso a admin API, intentamos signup normal
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: userData.email,
                    password: userData.password,
                });

                if (signUpError) {
                    throw signUpError;
                }

                if (!signUpData.user) {
                    throw new Error('No se pudo crear el usuario');
                }

                // Crear el perfil
                const { data: profile, error: profileError } = await (supabase
                    .from('profiles') as any)
                    .insert({
                        id: signUpData.user.id,
                        first_name: userData.first_name,
                        last_name: userData.last_name,
                        role: userData.role,
                        organization_id: userData.organization_id,
                        parent_id: userData.parent_id,
                        phone: userData.phone,
                    })
                    .select()
                    .single();

                if (profileError) {
                    throw profileError;
                }

                return profile;
            }

            if (!authData.user) {
                throw new Error('No se pudo crear el usuario');
            }

            // Crear el perfil
            const { data: profile, error: profileError } = await (supabase
                .from('profiles') as any)
                .insert({
                    id: authData.user.id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    role: userData.role,
                    organization_id: userData.organization_id,
                    parent_id: userData.parent_id,
                    phone: userData.phone,
                })
                .select()
                .single();

            if (profileError) {
                throw profileError;
            }

            return profile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        },
    });
}
