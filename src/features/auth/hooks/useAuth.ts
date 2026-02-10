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

            // Obtener el perfil del usuario (sin join inicial para depurar)
            const profileResult = await (supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single() as any);

            const profile = profileResult.data;
            const profileError = profileResult.error;

            if (profileError) {
                console.error('Error fetching profile for user:', user.id, profileError);
            } else if (!profile) {
                console.warn('No profile found for user after success auth:', user.id);
            } else {
                console.log('Profile loaded successfully for role:', profile.role);
            }

            // Si hay perfil, podemos intentar traer la organización por separado o confiar en que se cargará luego
            let organization = null;
            if (profile?.organization_id) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', profile.organization_id)
                    .single();
                organization = orgData;
            }

            return {
                id: user.id,
                email: user.email || '',
                profile: profile ? { ...profile, organization } : null,
                role: profile?.role || null,
                organizationId: profile?.organization_id || null,
            };
        },
        staleTime: 60 * 1000, // 1 minuto para refrescar más rápido
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
            // Limpieza TOTAL del caché (borra todas las queries de todas las features)
            queryClient.clear();

            // Forzar recarga absoluta del navegador para limpiar memoria React
            window.location.href = '/login';
        },
    });
}

/**
 * Helper para verificar permisos basados en rol
 */
export function usePermissions() {
    const { data: auth, isLoading } = useAuth();

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
        isLoading,
    };
}
