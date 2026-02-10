'use server';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database.types';

export interface TeamMember extends Profile {
    is_external: boolean;
    supervisor_ids: string[];
}

/**
 * Server Action para obtener los miembros del equipo visibles para el usuario.
 * Centraliza la lógica de "Misma Organización" + "Reportes Cross-Org" (Gabriel -> Analia).
 */


export async function getTeamMembersAction() {
    const supabase = await createClient();

    // 1. Obtener el usuario actual y su perfil
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');

    const { data: profile } = await (supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single() as any);

    if (!profile) throw new Error('Perfil no encontrado');

    const isGod = profile.role === 'god';
    const isParent = profile.role === 'parent';

    let members: any[] = [];

    // 2. Estrategia "Solid Foundation" (RLS Nativo)
    // En lugar de usar adminClient y filtrar manualmente en JS, confiamos en las Políticas RLS de la BD.
    // - God: RLS le permite ver todo.
    // - Parent: RLS le permite ver su org + reportes + supervisados.
    // - Child: RLS le permite ver... (lo que tenga configurado).

    // Fetch Profiles
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, organization_id, reports_to_organization_id')
        .order('first_name', { ascending: true })
        .limit(1000); // Límite de seguridad

    if (profilesError) {
        console.error('CRITICAL ERROR query profiles in getTeamMembersAction:', profilesError);
        throw profilesError;
    }

    // Fetch Supervisors
    // RLS permite ver 'profile_supervisors' a autenticados.
    const { data: supervisorsData, error: supervisorsError } = await supabase
        .from('profile_supervisors')
        .select('agent_id, supervisor_id');

    if (supervisorsError) {
        console.error('Error fetching supervisors:', supervisorsError);
    }

    const allProfiles = profilesData || [];
    const allSupervisors = supervisorsData || [];

    // Log para Dios si está vacío
    if (isGod && allProfiles.length === 0) {
        console.warn('[getTeamMembersAction] God user found 0 profiles. Check RLS or DB data.');
    }

    // 3. Enriquecer con metadata
    // Ya no filtramos manualmente, asumimos que lo que vino de la DB es lo que el usuario puede ver.
    members = allProfiles.map((m: any) => {
        const supervisors = allSupervisors
            .filter((s: any) => s.agent_id === m.id)
            .map((s: any) => ({ supervisor_id: s.supervisor_id }));

        return {
            ...m,
            is_external: m.organization_id !== profile.organization_id,
            supervisor_ids: supervisors.map((s: any) => s.supervisor_id),
            // Compatibilidad
            profile_supervisors: supervisors
        };
    });

    return members;
}


