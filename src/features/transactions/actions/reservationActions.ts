'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Cancela una reserva existente.
 */
export async function cancelReservationAction(
    transactionId: string,
    reason: string
): Promise<ActionResult> {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        
        // 1. Obtener transacción actual
        const { data: tx, error: txError } = await adminClient
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (txError || !tx) throw new Error('Transacción no encontrada');
        if (tx.status !== 'pending') throw new Error('Solo se pueden cancelar reservas pendientes');

        // 2. Actualizar transacción
        const { error: updateError } = await adminClient
            .from('transactions')
            .update({
                status: 'cancelled',
                cancellation_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // 3. Revertir estado del CRM si hay personas vinculadas
        const personIds = [tx.buyer_person_id, tx.seller_person_id].filter(Boolean);
        for (const pid of personIds) {
            if (!pid) continue;

            // Buscar en el historial el último estado antes de 'reserva' o 'cierre'
            const { data: history } = await adminClient
                .from('person_history')
                .select('old_value')
                .eq('person_id', pid)
                .eq('field_name', 'relationship_status')
                .order('created_at', { ascending: false })
                .limit(5);

            // Intentar encontrar un valor previo que no sea nulo y diferente al actual si es posible
            let previousStatus = 'prospecto'; // Fallback por defecto
            if (history && history.length > 0) {
                // El primer registro tiene el old_value del cambio más reciente (el que lo puso en reserva)
                previousStatus = history[0].old_value || 'prospecto';
            }

            // Actualizar persona
            await adminClient
                .from('persons')
                .update({ 
                    relationship_status: previousStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pid);

            // Registrar en historial la caída
            await adminClient.from('person_history').insert({
                person_id: pid,
                agent_id: tx.agent_id,
                event_type: 'lifecycle_change',
                field_name: 'relationship_status',
                old_value: 'reserva',
                new_value: previousStatus,
                metadata: { 
                    action: 'reservation_cancelled',
                    transaction_id: transactionId,
                    reason: reason 
                }
            });
        }

        revalidatePath('/dashboard/operations');
        revalidatePath('/dashboard/weekly');
        return { success: true };
    } catch (err: any) {
        console.error('Error cancelling reservation:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Cierra una reserva marcándola como completada y actualizando montos/fechas.
 */
export async function closeReservationAction(
    transactionId: string,
    data: {
        closingDate: string;
        actualPrice: number;
        commissionPercentage: number;
        agentSplitPercentage: number;
        sides: number;
    }
): Promise<ActionResult> {
    try {
        const adminClient = createAdminClient();

        // 1. Obtener transacción actual
        const { data: tx, error: txError } = await adminClient
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (txError || !tx) throw new Error('Transacción no encontrada');

        // 2. Obtener royalty de la organización para recalcular
        const { data: orgData } = await adminClient
            .from('organizations')
            .select('royalty_percentage')
            .eq('id', tx.organization_id)
            .single();

        const royaltyPercent = orgData?.royalty_percentage ?? 0;

        // 3. Recalcular comisiones
        const gross_commission = data.actualPrice * (data.commissionPercentage / 100) * data.sides;
        const master_commission_amount = gross_commission * (royaltyPercent / 100);
        const net_commission = gross_commission * (data.agentSplitPercentage / 100);
        const office_commission_amount = gross_commission - master_commission_amount - net_commission;

        // 4. Actualizar transacción
        const { error: updateError } = await adminClient
            .from('transactions')
            .update({
                status: 'completed',
                closing_date: data.closingDate,
                actual_price: data.actualPrice,
                commission_percentage: data.commissionPercentage,
                agent_split_percentage: data.agentSplitPercentage,
                sides: data.sides,
                gross_commission,
                net_commission,
                master_commission_amount,
                office_commission_amount,
                royalty_percentage_at_closure: royaltyPercent,
                updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // 5. Crear actividad de cierre automática. 
        const personId = tx.buyer_person_id || tx.seller_person_id;
        if (personId) {
            await adminClient.from('activities').insert({
                organization_id: tx.organization_id,
                agent_id: tx.agent_id,
                type: 'cierre', // Consistente con route.ts
                date: data.closingDate,
                time: new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }),
                status: 'completed',
                notes: `Cierre de reserva finalizado. Monto final: ${data.actualPrice}`,
                person_id: personId
            });
        }

        // 6. Actualizar CRM a 'cierre' y cerrar búsquedas
        const personIds = [tx.buyer_person_id, tx.seller_person_id].filter(Boolean) as string[];
        for (const pid of personIds) {
            await adminClient
                .from('persons')
                .update({ 
                    relationship_status: 'cierre',
                    last_interaction_at: data.closingDate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pid);

            // Cerrar búsquedas activas (Consistente con route.ts)
            await adminClient
                .from('person_searches')
                .update({
                    last_interaction_at: data.closingDate,
                    updated_at: new Date().toISOString(),
                    status: 'closed'
                })
                .eq('person_id', pid);

            await adminClient.from('person_history').insert({
                person_id: pid,
                agent_id: tx.agent_id,
                event_type: 'lifecycle_change',
                field_name: 'relationship_status',
                old_value: 'reserva',
                new_value: 'cierre',
                metadata: { 
                    action: 'reservation_closed',
                    transaction_id: transactionId,
                    final_price: data.actualPrice
                }
            });
        }

        revalidatePath('/dashboard/operations');
        revalidatePath('/dashboard/weekly');
        return { success: true };
    } catch (err: any) {
        console.error('Error closing reservation:', err);
        return { success: false, error: err.message };
    }
}
