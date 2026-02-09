'use server';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database.types';

export interface TeamMember extends Profile {
    is_external: boolean;
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

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) throw new Error('Perfil no encontrado');

    // 2. Ejecutar la query de miembros
    // Usamos el cliente normal (respetando RLS) pero la query ya está optimizada por la política de SQL
    const { data: members, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true });

    if (error) {
        console.error('Error fetching team members:', error);
        throw error;
    }

    // 3. Enriquecer con metadata de "Externo"
    return (members || []).map((m: Profile) => ({
        ...m,
        is_external: m.organization_id !== profile.organization_id
    }));
}
