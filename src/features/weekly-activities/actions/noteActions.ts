'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type WeeklyNote = {
    id: string;
    organization_id: string;
    agent_id: string;
    week_start_date: string;
    content: string;
    created_at: string;
    updated_at: string;
};

export async function getWeeklyNoteAction(agentId: string, weekStartDate: string) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        // Authorization logic (matching activities)
        const [requesterRes, targetRes] = await Promise.all([
            supabase.from('profiles' as any).select('role, organization_id').eq('id', user.id).single() as any,
            adminClient.from('profiles' as any).select('organization_id, reports_to_organization_id').eq('id', agentId).single() as any
        ]);

        if (!requesterRes.data || !targetRes.data) return { success: false, error: 'Perfil no encontrado' };

        const isGod = (requesterRes.data as any)?.role === 'god';
        const isOwner = user.id === agentId;
        const isSameOrg = (requesterRes.data as any)?.organization_id === (targetRes.data as any)?.organization_id;
        const isParent = (requesterRes.data as any)?.role === 'parent';
        const reportsToThisOrg = (targetRes.data as any)?.reports_to_organization_id === (requesterRes.data as any)?.organization_id;

        const canSee = isGod || isOwner || (isParent && (isSameOrg || reportsToThisOrg));

        if (!canSee) {
            return { success: false, error: 'No autorizado para ver esta nota' };
        }

        const { data, error } = await adminClient
            .from('weekly_notes' as any)
            .select('*')
            .eq('agent_id', agentId)
            .eq('week_start_date', weekStartDate)
            .maybeSingle();

        if (error) throw error;

        return { success: true, data: data as unknown as WeeklyNote };
    } catch (err: any) {
        console.error('Error in getWeeklyNoteAction:', err);
        return { success: false, error: err.message || 'Error al obtener la nota semanal' };
    }
}

export async function upsertWeeklyNoteAction(data: {
    organization_id: string;
    agent_id: string;
    week_start_date: string;
    content: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'No autenticado' };

        // Permisos para editar: dueño, god o parent de la misma org (o si le reportan)
        // Para simplificar y seguir RLS, usamos admin client si es superior
        const adminClient = createAdminClient();
        const { data: requester } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle();

        if (!requester) return { success: false, error: 'Perfil no encontrado' };

        const isGod = (requester as any).role === 'god';
        const isOwner = user.id === data.agent_id;

        // Si no es dueño ni God, verificamos Parent
        let canEdit = isGod || isOwner;

        if (!canEdit && (requester as any).role === 'parent') {
            const { data: target } = await adminClient.from('profiles' as any).select('organization_id, reports_to_organization_id').eq('id', data.agent_id).single();
            if (target) {
                const isSameOrg = (requester as any).organization_id === (target as any).organization_id;
                const reportsToThisOrg = (target as any).reports_to_organization_id === (requester as any).organization_id;
                canEdit = isSameOrg || reportsToThisOrg;
            }
        }

        if (!canEdit) return { success: false, error: 'No autorizado para editar esta nota' };

        const { data: note, error } = await adminClient
            .from('weekly_notes' as any)
            .upsert({
                organization_id: data.organization_id,
                agent_id: data.agent_id,
                week_start_date: data.week_start_date,
                content: data.content,
                updated_at: new Date().toISOString()
            } as any, {
                onConflict: 'agent_id, week_start_date'
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/my-week');
        return { success: true, data: note as unknown as WeeklyNote };
    } catch (err: any) {
        console.error('Error in upsertWeeklyNoteAction:', err);
        return { success: false, error: err.message || 'Error al guardar la nota semanal' };
    }
}
