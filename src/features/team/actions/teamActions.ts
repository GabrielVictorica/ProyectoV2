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
import { createAdminClient } from '@/lib/supabase/admin';

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

    // 2. Lógica de "Nuclear Option" (Service Role Bypass)
    // Solo para God y Parent, usamos el cliente Admin para saltarnos RLS y garantizar visibilidad
    if (isGod || isParent) {
        const adminClient = createAdminClient();

        // Traemos TODOS los perfiles (con límite de seguridad) y sus supervisores
        // Esto es muy rápido para <1000 usuarios
        const { data: allProfiles, error } = await adminClient
            .from('profiles')
            .select('*, profile_supervisors!profile_supervisors_agent_id_fkey(supervisor_id)')
            .order('first_name', { ascending: true })
            .limit(1000);

        if (error) {
            console.error('Error fetching profiles with admin client:', error);
            throw error;
        }

        // Filtrado en Memoria (JavaScript) - Infalible
        if (isGod) {
            // God ve todo
            members = allProfiles || [];
        } else if (isParent) {
            // Parent ve: 
            // 1. Su propia organización
            // 2. Reportes a su organización
            // 3. Supervisados directos
            const myOrgId = profile.organization_id;

            members = (allProfiles || []).filter((p: any) => {
                const isInMyOrg = p.organization_id === myOrgId;
                const reportsToMyOrg = p.reports_to_organization_id === myOrgId;
                const isSupervisedByMe = (p.profile_supervisors || []).some((ps: any) => ps.supervisor_id === user.id);

                return isInMyOrg || reportsToMyOrg || isSupervisedByMe;
            });
        }
    } else {
        // 3. Child (Standard RLS)
        // Usamos el cliente normal, respetando las políticas de la base de datos
        const { data: childView, error } = await supabase
            .from('profiles')
            .select('*, profile_supervisors!profile_supervisors_agent_id_fkey(supervisor_id)')
            .order('first_name', { ascending: true });

        if (error) throw error;
        members = childView || [];
    }

    // 4. Enriquecer con metadata de "Externo" y aplanar supervisors
    return members.map((m: any) => ({
        ...m,
        is_external: m.organization_id !== profile.organization_id,
        supervisor_ids: (m.profile_supervisors || []).map((ps: any) => ps.supervisor_id)
    }));
}
