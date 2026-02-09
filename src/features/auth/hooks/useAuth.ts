'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, UserRole, Organization } from '@/types/database.types';

// Query keys centralizados (SSOT)
export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
    profile: () => [...authKeys.all, 'profile'] as const,
};

export type ProfileWithOrganization = Profile & {
    organization: Organization | null;
};

// Tipo extendido del usuario con perfil
export interface AuthUser {
    id: string;
    email: string;
    profile: ProfileWithOrganization | null;
    role: UserRole | null;
    organizationId: string | null;
}

/**
 * Hook centralizado de autenticación (SSOT)
 * Obtiene el usuario actual y su perfil
 */
export function useAuth() {
    const supabase = createClient();

    return useQuery({
        queryKey: authKeys.user(),
        queryFn: async (): Promise<AuthUser | null> => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return null;
            }

            // Obtener el perfil del usuario con su organización
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    organization:organizations(*)
                `)
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            }

            return {
                id: user.id,
                email: user.email || '',
                profile: profile || null,
                role: profile?.role || null,
                organizationId: profile?.organization_id || null,
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos
    });
}

/**
 * Hook para login con email y password
 */
export function useLogin() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            return data;
        },
        onSuccess: () => {
            // Invalidar todas las queries de auth para re-fetch
            queryClient.invalidateQueries({ queryKey: authKeys.all });
            router.push('/dashboard');
        },
    });
}

/**
 * Hook para logout
 */
export function useLogout() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const supabase = createClient();

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                throw error;
            }
        },
        onSuccess: () => {
            // Limpiar todas las queries de auth
            queryClient.removeQueries({ queryKey: authKeys.all });
            router.push('/login');
        },
    });
}

/**
 * Helper para verificar permisos basados en rol
 */
export function usePermissions() {
    const { data: auth } = useAuth();

    const isGod = auth?.role === 'god';
    const isParent = auth?.role === 'parent';
    const isChild = auth?.role === 'child';

    const canManageUsers = isGod;
    const canManageOrganizations = isGod;
    const canViewAllData = isGod;
    const canViewOrgData = isGod || isParent;

    return {
        isGod,
        isParent,
        isChild,
        canManageUsers,
        canManageOrganizations,
        canViewAllData,
        canViewOrgData,
        role: auth?.role,
        organizationId: auth?.organizationId,
        auth,
    };
}
