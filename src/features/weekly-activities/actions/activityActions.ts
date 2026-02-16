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
 * Sincroniza el estado de una persona en el CRM basado en una actividad reciente.
 */
async function syncPersonFromActivity(personId: string, activityType: string, activityDate: string) {
    const supabase = await createClient();

    // Mapeo selectivo de tipos de actividad a estados de relación
    // Solo actualizamos el estado si es uno de los hitos importantes
    const statusMap: Record<string, string> = {
        'reunion_verde': 'reunion_verde',
        'pre_listing': 'pre_listing',
        'pre_buying': 'pre_buying',
        'acm': 'acm',
        'captacion': 'captacion',
        'visita': 'visita',
        'reserva': 'reserva',
        'referido': 'referido',
    };

    const newStatus = statusMap[activityType];
    const updateData: any = {
        last_interaction_at: new Date(activityDate + 'T12:00:00Z').toISOString(),
    };

    if (newStatus) {
        updateData.relationship_status = newStatus;
    }

    const { error } = await supabase
        .from('persons')
        .update(updateData)
        .eq('id', personId);

    if (error) {
        console.error('Error syncing person from activity:', error);
    }
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

    // Side-effect: Sincronizar con CRM si hay una persona vinculada
    if (data.person_id) {
        await syncPersonFromActivity(data.person_id, data.type, data.date);
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

    // Side-effect: Sincronizar con CRM si hay una persona vinculada
    if (data.person_id && data.type && data.date) {
        await syncPersonFromActivity(data.person_id, data.type, data.date);
    }

    revalidatePath('/dashboard/my-week');
    revalidatePath('/dashboard/crm');
    return { success: true, data: activity };
}

export async function deleteActivityAction(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activities' as any)
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/my-week');
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
