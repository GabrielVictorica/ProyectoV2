'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

export interface TeamMemberStats {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    role: Database['public']['Enums']['user_role'];
    organization_id: string;
    reports_to_organization_id: string | null;
    is_active: boolean;
    is_external: boolean;
    supervisor_ids: string[];
    property_count: number;
    sales_volume: number;
    sales_count: number;
}

/**
 * Server Action que obtiene las estadísticas del equipo de forma segura
 * Bypaseando RLS para God y Parent (igual que getTeamMembersAction)
 */
export async function getTeamStatsAction(): Promise<TeamMemberStats[]> {
    const supabase = await createClient();

    // 1. Obtener usuario actual
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
    const myOrgId = profile.organization_id;

    // 2. Si es God/Parent, usamos Admin Client para todo (Members + Stats)
    if (isGod || isParent) {
        const adminClient = createAdminClient();

        // A. Obtener Miembros (Lógica Mirror de getTeamMembersAction)
        const { data: allProfiles, error: profileError } = await adminClient
            .from('profiles')
            .select('*, profile_supervisors!profile_supervisors_agent_id_fkey(supervisor_id)')
            .order('first_name', { ascending: true })
            .limit(1000);

        if (profileError) throw profileError;

        let members: any[] = [];
        if (isGod) {
            members = allProfiles || [];
        } else {
            // Parent Logic
            members = (allProfiles || []).filter((p: any) => {
                const isInMyOrg = p.organization_id === myOrgId;
                const reportsToMyOrg = p.reports_to_organization_id === myOrgId;
                const isSupervisedByMe = (p.profile_supervisors || []).some((ps: any) => ps.supervisor_id === user.id);
                return isInMyOrg || reportsToMyOrg || isSupervisedByMe;
            });
        }

        if (members.length === 0) return [];
        const memberIds = members.map((m: any) => m.id);

        // B. Obtener Stats (con Admin Client para ver props de externos)
        // Propiedades
        const { data: props, error: propsError } = await adminClient
            .from('properties')
            .select('agent_id')
            .in('agent_id', memberIds); // Simple IN filter

        if (propsError) console.error('Error fetching properties stats:', propsError);

        // Ventas
        const { data: sales, error: salesError } = await adminClient
            .from('transactions')
            .select('agent_id, actual_price')
            .in('agent_id', memberIds);

        if (salesError) console.error('Error fetching sales stats:', salesError);

        // C. Mapear resultados
        const propMap: Record<string, number> = {};
        (props || []).forEach((p: any) => {
            propMap[p.agent_id] = (propMap[p.agent_id] || 0) + 1;
        });

        const salesVolumeMap: Record<string, number> = {};
        const salesCountMap: Record<string, number> = {};
        (sales || []).forEach((t: any) => {
            salesVolumeMap[t.agent_id] = (salesVolumeMap[t.agent_id] || 0) + (t.actual_price || 0);
            salesCountMap[t.agent_id] = (salesCountMap[t.agent_id] || 0) + 1;
        });

        return members.map((m: any) => ({
            ...m,
            email: m.email || '',
            is_external: m.organization_id !== myOrgId,
            supervisor_ids: (m.profile_supervisors || []).map((ps: any) => ps.supervisor_id),
            property_count: propMap[m.id] || 0,
            sales_volume: salesVolumeMap[m.id] || 0,
            sales_count: salesCountMap[m.id] || 0,
        }));

    } else {
        // 3. Child (Standard Logic)
        const { data: members, error } = await supabase
            .from('profiles')
            .select('*, profile_supervisors!profile_supervisors_agent_id_fkey(supervisor_id)')
            .order('first_name', { ascending: true }); // RLS handles org filter

        if (error) throw error;
        if (!members || members.length === 0) return [];

        const memberIds = members.map((m: any) => m.id);

        // Standard client queries for stats (RLS enforced)
        const { data: props } = await supabase
            .from('properties')
            .select('agent_id')
            .in('agent_id', memberIds);

        const { data: sales } = await supabase
            .from('transactions')
            .select('agent_id, actual_price')
            .in('agent_id', memberIds);

        const propMap: Record<string, number> = {};
        (props || []).forEach((p: any) => {
            propMap[p.agent_id] = (propMap[p.agent_id] || 0) + 1;
        });

        const salesVolumeMap: Record<string, number> = {};
        const salesCountMap: Record<string, number> = {};
        (sales || []).forEach((t: any) => {
            salesVolumeMap[t.agent_id] = (salesVolumeMap[t.agent_id] || 0) + (t.actual_price || 0);
            salesCountMap[t.agent_id] = (salesCountMap[t.agent_id] || 0) + 1;
        });

        return members.map((m: any) => ({
            ...m,
            email: m.email || '',
            is_external: m.organization_id !== profile.organization_id,
            supervisor_ids: (m.profile_supervisors || []).map((ps: any) => ps.supervisor_id),
            property_count: propMap[m.id] || 0,
            sales_volume: salesVolumeMap[m.id] || 0,
            sales_count: salesCountMap[m.id] || 0,
        }));
    }
}
