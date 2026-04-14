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
    visit_metadata?: {
        punta: 'compradora' | 'vendedora' | 'ambas';
        buyer_person_id?: string | null;
        seller_person_id?: string | null;
        property_address?: string | null;
        buyer_feedback?: string | null;
    } | null;
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

/**
 * Helper: sincroniza (inserta) los eventos en person_history correspondientes a una actividad.
 * Si `purgeFirst` es true, borra primero los eventos previos con metadata.activity_id = activityId.
 */
async function syncActivityHistory(
    adminClient: any,
    supabase: any,
    activity: any,
    agentId: string | null,
    purgeFirst: boolean = false
): Promise<void> {
    const activityId = activity?.id;
    if (!activityId) return;

    if (purgeFirst) {
        const { error: purgeErr } = await adminClient
            .from('person_history')
            .delete()
            .eq('metadata->>activity_id', activityId);
        if (purgeErr) console.error('Error purgando person_history de actividad:', purgeErr);
    }

    const getPersonName = async (id: string) => {
        const { data: p } = await supabase
            .from('persons' as any)
            .select('first_name, last_name')
            .eq('id', id)
            .single();
        return p ? `${(p as any).first_name} ${(p as any).last_name}` : 'Sin nombre';
    };

    if (activity.type === 'visita' && activity.visit_metadata) {
        const vm = activity.visit_metadata;
        const buyerId = vm.buyer_person_id || (vm.punta === 'compradora' ? activity.person_id : null);
        if (buyerId) {
            const { error } = await adminClient.from('person_history').insert({
                person_id: buyerId,
                event_type: 'visit_record',
                agent_id: agentId,
                field_name: 'visit_buyer',
                new_value: vm.property_address || 'Sin dirección',
                metadata: {
                    role: 'buyer',
                    property_address: vm.property_address,
                    feedback: vm.buyer_feedback || null,
                    activity_date: activity.date,
                    punta: vm.punta,
                    activity_id: activityId,
                }
            });
            if (error) console.error('Error insertando visit_record buyer:', error);
            await supabase.from('persons' as any)
                .update({ last_interaction_at: new Date(activity.date + 'T12:00:00Z').toISOString() } as any)
                .eq('id', buyerId);
        }
        const sellerId = vm.seller_person_id || (vm.punta === 'vendedora' ? activity.person_id : null);
        if (sellerId) {
            const buyerName = buyerId ? await getPersonName(buyerId) : 'Comprador externo';
            const { error } = await adminClient.from('person_history').insert({
                person_id: sellerId,
                event_type: 'visit_record',
                agent_id: agentId,
                field_name: 'visit_seller',
                new_value: vm.property_address || 'Sin dirección',
                metadata: {
                    role: 'seller',
                    property_address: vm.property_address,
                    visitor_name: buyerName,
                    activity_date: activity.date,
                    punta: vm.punta,
                    activity_id: activityId,
                }
            });
            if (error) console.error('Error insertando visit_record seller:', error);
            await supabase.from('persons' as any)
                .update({ last_interaction_at: new Date(activity.date + 'T12:00:00Z').toISOString() } as any)
                .eq('id', sellerId);
        }
    } else if (activity.person_id) {
        const ACTIVITY_LABELS: Record<string, string> = {
            llamada: 'Llamada',
            whatsapp: 'WhatsApp',
            oferta: 'Oferta',
            captacion: 'Captación',
            tasacion: 'Tasación',
            firma: 'Firma',
            reunion: 'Reunión',
            visita: 'Visita',
        };
        const { error } = await adminClient.from('person_history').insert({
            person_id: activity.person_id,
            event_type: activity.type === 'visita' ? 'visit_record' : 'activity_record',
            agent_id: agentId,
            field_name: activity.type,
            new_value: ACTIVITY_LABELS[activity.type] || activity.type,
            metadata: {
                activity_type: activity.type,
                activity_date: activity.date,
                notes: activity.notes || null,
                activity_id: activityId,
            }
        });
        if (error) console.error('Error insertando activity_record:', error);
    }
}

export async function createActivityAction(data: ActivityInsert) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Block future dates — activities can only be created for today or earlier
    // Use Argentina timezone (UTC-3) so agents can create activities until midnight local time
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }); // YYYY-MM-DD
    if (data.date > today) {
        return { success: false, error: 'No se pueden cargar actividades con fecha futura.' };
    }

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

    // ── Registro en person_history (helper compartido con update) ──
    const adminClient = createAdminClient();
    const agentId = user?.id || null;
    await syncActivityHistory(adminClient, supabase, activity, agentId, false);

    revalidatePath('/dashboard/my-week');
    revalidatePath('/dashboard/crm');
    return { success: true, data: activity };
}

export async function updateActivityAction(id: string, data: Partial<ActivityInsert>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Resincronizar historial: purgar eventos anteriores de esta actividad y recrearlos
    const adminClient = createAdminClient();
    const agentId = user?.id || null;
    await syncActivityHistory(adminClient, supabase, activity, agentId, true);

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

    // Purgar entradas de person_history generadas por esta actividad
    const adminClient = createAdminClient();
    const { error: purgeErr } = await (adminClient as any)
        .from('person_history')
        .delete()
        .eq('metadata->>activity_id', id);
    if (purgeErr) console.error('Error purgando person_history de actividad:', purgeErr);

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

        const userProfile = (requesterProfileResult.data as unknown) as { role: string; organization_id: string };
        const targetProfile = (targetProfileResult.data as unknown) as { organization_id: string; reports_to_organization_id: string | null };


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
                .select('id, status, transaction_date, closing_date, buyer_name, seller_name, buyer_person_id, seller_person_id, actual_price, notes, property_id, custom_property_title, property:properties(title)')
                .eq('agent_id', agentId)
                .or(`and(transaction_date.gte.${startDate},transaction_date.lte.${endDate}),and(closing_date.gte.${startDate},closing_date.lte.${endDate})`)
        ]);

        if (activitiesResult.error) throw activitiesResult.error;
        if (transactionsResult.error) throw transactionsResult.error;

        const activities = activitiesResult.data;

        // Fetch missing names for visit_metadata (buyer and seller)
        const personIdsToFetch = new Set<string>();
        activities?.forEach((act: any) => {
            if (act.visit_metadata) {
                if (act.visit_metadata.buyer_person_id) personIdsToFetch.add(act.visit_metadata.buyer_person_id);
                if (act.visit_metadata.seller_person_id) personIdsToFetch.add(act.visit_metadata.seller_person_id);
            }
        });

        if (personIdsToFetch.size > 0) {
            const { data: personsInfo } = await adminClient
                .from('persons' as any)
                .select('id, first_name, last_name')
                .in('id', Array.from(personIdsToFetch));

            const personMap = new Map();
            personsInfo?.forEach((p: any) => personMap.set(p.id, `${p.first_name} ${p.last_name}`));

            activities?.forEach((act: any) => {
                if (act.visit_metadata) {
                    if (act.visit_metadata.buyer_person_id) {
                        act.visit_metadata.buyer_name = personMap.get(act.visit_metadata.buyer_person_id);
                    }
                    if (act.visit_metadata.seller_person_id) {
                        act.visit_metadata.seller_name = personMap.get(act.visit_metadata.seller_person_id);
                    }
                }
            });
        }

        return {
            success: true,
            data: {
                activities: activities,
                transactions: transactionsResult.data
            }
        };
    } catch (err: any) {
        console.error('Error in getWeeklyDataAction:', err);
        return { success: false, error: err.message || 'Error al obtener datos semanales' };
    }
}

/**
 * Obtiene los detalles de estado y nombre para múltiples personas.
 * Se usa para evaluar si es necesario proponer una actualización de estado del CRM
 * después de registrar una actividad.
 */
export async function getPersonsStatusDetailsAction(personIds: string[]) {
    if (!personIds || personIds.length === 0) {
        return { success: true, data: [] };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const { data, error } = await supabase
            .from('persons' as any)
            .select('id, first_name, last_name, relationship_status')
            .in('id', personIds);

        if (error) throw error;

        return { success: true, data };
    } catch (err: any) {
        console.error('Error in getPersonsStatusDetailsAction:', err);
        return { success: false, error: err.message || 'Error al obtener detalles de estado de las personas' };
    }
}
