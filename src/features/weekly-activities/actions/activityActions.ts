'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { verifyGodUser } from '@/features/admin/actions/adminActions';

export type ActivityInsert = {
    organization_id: string;
    agent_id: string;
    client_id?: string | null;
    person_id?: string | null;
    property_id?: string | null;
    type: string;
    date: string;
    time?: string | null;
    status?: string;
    notes?: string | null;
};

/**
 * Actualiza explícitamente el estado de una persona en el CRM.
 * Se llama desde el cliente tras confirmación del usuario.
 */
export async function updatePersonStatusAction(
    personId: string,
    newStatus: string,
    activityDate: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('persons' as any)
        .update({
            relationship_status: newStatus,
            last_interaction_at: new Date(activityDate + 'T12:00:00Z').toISOString(),
        } as any)
        .eq('id', personId);

    if (error) {
        console.error('Error updating person status:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/crm');
    return { success: true };
}

export async function createActivityAction(data: ActivityInsert) {
    const supabase = await createClient();

    const { data: activity, error } = await supabase
        .from('activities' as any)
        .insert(data as any)
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    // Actualizar last_interaction_at si hay persona vinculada (no toca relationship_status)
    if (data.person_id) {
        await supabase
            .from('persons' as any)
            .update({ last_interaction_at: new Date(data.date + 'T12:00:00Z').toISOString() } as any)
            .eq('id', data.person_id);
    }

    revalidatePath('/dashboard/my-week');
    revalidatePath('/dashboard/crm');
    return { success: true, data: activity };
}

export async function updateActivityAction(id: string, data: Partial<ActivityInsert>) {
    const supabase = await createClient();

    const { data: activity, error } = await supabase
        .from('activities' as any)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    // Actualizar last_interaction_at si hay persona vinculada (no toca relationship_status)
    if (data.person_id && data.date) {
        await supabase
            .from('persons' as any)
            .update({ last_interaction_at: new Date(data.date + 'T12:00:00Z').toISOString() } as any)
            .eq('id', data.person_id);
    }

    revalidatePath('/dashboard/my-week');
    revalidatePath('/dashboard/crm');
    return { success: true, data: activity };
}

export async function deleteActivityAction(id: string) {
    const supabase = await createClient();

    // Primero obtener la actividad para saber si tiene persona vinculada
    const { data: activityToDelete } = await supabase
        .from('activities' as any)
        .select('person_id, type')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('activities' as any)
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    // Revertir estado: buscar la actividad más reciente restante de esta persona
    const deletedActivity = activityToDelete as any;
    if (deletedActivity?.person_id) {
        const { data: latestActivity } = await supabase
            .from('activities' as any)
            .select('type, date')
            .eq('person_id', deletedActivity.person_id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        const latest = latestActivity as any;
        if (latest) {
            // Hay otra actividad → actualizar al estado de esa actividad
            await supabase
                .from('persons' as any)
                .update({
                    relationship_status: latest.type,
                    last_interaction_at: new Date(latest.date + 'T12:00:00Z').toISOString(),
                } as any)
                .eq('id', deletedActivity.person_id);
        }
        // Si no hay más actividades, dejamos el estado tal cual (no regresionamos)
    }

    revalidatePath('/dashboard/my-week');
    revalidatePath('/dashboard/crm');
    return { success: true };
}

export async function getWeeklyDataAction(
    agentId: string,
    startDate: string,
    endDate: string
) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();

        // OPTIMIZACIÓN: Obtener usuario primero (necesario para el resto)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        // OPTIMIZACIÓN: Paralelizar queries de autorización
        const [requesterProfileResult, targetProfileResult] = await Promise.all([
            supabase.from('profiles' as any).select('role, organization_id').eq('id', user.id).single(),
            adminClient.from('profiles' as any).select('organization_id, reports_to_organization_id').eq('id', agentId).single()
        ]);

        if (!requesterProfileResult.data) return { success: false, error: 'Perfil no encontrado' };
        if (!targetProfileResult.data) return { success: false, error: 'Usuario destino no encontrado' };

        const userProfile = requesterProfileResult.data as { role: string; organization_id: string };
        const targetProfile = targetProfileResult.data as { organization_id: string; reports_to_organization_id: string | null };


        // Lógica de autorización
        const isGod = userProfile.role === 'god';
        const isOwner = user.id === agentId;
        const isSameOrg = userProfile.organization_id === targetProfile.organization_id;
        const isParent = userProfile.role === 'parent';
        // Cross-org: Parent puede ver agentes que reportan a su org
        const reportsToThisOrg = targetProfile.reports_to_organization_id === userProfile.organization_id;

        const canSee = isGod || isOwner || (isParent && (isSameOrg || reportsToThisOrg));

        if (!canSee) {
            return { success: false, error: 'No autorizado para ver estos datos' };
        }


        // FETCH DATA USING ADMIN CLIENT (BYPASS RLS)
        const [activitiesResult, transactionsResult] = await Promise.all([
            adminClient
                .from('activities' as any)
                .select('*, person:persons(id, first_name, last_name, phone)')
                .eq('agent_id', agentId)
                .gte('date', startDate)
                .lte('date', endDate),
            adminClient
                .from('transactions' as any)
                .select('id, transaction_date, buyer_name, seller_name, buyer_person_id, seller_person_id, actual_price, notes, property_id, custom_property_title, property:properties(title)')
                .eq('agent_id', agentId)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate)
        ]);

        if (activitiesResult.error) throw activitiesResult.error;
        if (transactionsResult.error) throw transactionsResult.error;

        return {
            success: true,
            data: {
                activities: activitiesResult.data,
                transactions: transactionsResult.data
            }
        };
    } catch (err: any) {
        console.error('Error in getWeeklyDataAction:', err);
        return { success: false, error: err.message || 'Error al obtener datos semanales' };
    }
}
