'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Link two transactions as the same operation (two sides of one deal).
 * Only god/parent can do this.
 */
export async function linkTransactionsAction(idA: string, idB: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['god', 'parent'].includes(profile.role)) {
        return { success: false, error: 'Solo administradores pueden vincular operaciones' };
    }

    // Fetch both transactions to validate pre-conditions
    const { data: txPair, error: fetchError } = await supabase
        .from('transactions')
        .select('id, sides, linked_transaction_id, agent_id')
        .in('id', [idA, idB]);

    if (fetchError || !txPair || txPair.length !== 2) {
        return { success: false, error: 'No se encontraron ambas operaciones' };
    }

    const txA = txPair.find(t => t.id === idA);
    const txB = txPair.find(t => t.id === idB);

    if (!txA || !txB) {
        return { success: false, error: 'No se encontraron ambas operaciones' };
    }

    // Validation 1: Cannot link a transaction that already has both sides
    if ((txA.sides || 1) === 2) {
        return { success: false, error: `La operación del agente ya tiene ambas puntas (2 lados). No puede ser un duplicado.` };
    }
    if ((txB.sides || 1) === 2) {
        return { success: false, error: `La operación del agente ya tiene ambas puntas (2 lados). No puede ser un duplicado.` };
    }

    // Validation 2: Cannot link if either is already linked to a different transaction
    if (txA.linked_transaction_id && txA.linked_transaction_id !== idB) {
        return { success: false, error: 'La operación A ya está vinculada a otra operación. Desvinculá primero.' };
    }
    if (txB.linked_transaction_id && txB.linked_transaction_id !== idA) {
        return { success: false, error: 'La operación B ya está vinculada a otra operación. Desvinculá primero.' };
    }

    // Validation 3: Cannot link transactions from the same agent
    if (txA.agent_id === txB.agent_id) {
        return { success: false, error: 'No se pueden vincular dos operaciones del mismo agente.' };
    }

    // Set linked_transaction_id bidirectionally
    const { error: err1 } = await supabase
        .from('transactions')
        .update({ linked_transaction_id: idB })
        .eq('id', idA);

    const { error: err2 } = await supabase
        .from('transactions')
        .update({ linked_transaction_id: idA })
        .eq('id', idB);

    if (err1 || err2) {
        return { success: false, error: err1?.message || err2?.message || 'Error al vincular' };
    }

    // Remove from dismissed_duplicates if it was previously dismissed
    await supabase
        .from('dismissed_duplicates')
        .delete()
        .or(`and(transaction_id_a.eq.${idA},transaction_id_b.eq.${idB}),and(transaction_id_a.eq.${idB},transaction_id_b.eq.${idA})`);

    return { success: true };
}

/**
 * Unlink two transactions (undo a link).
 * Only god/parent can do this.
 */
export async function unlinkTransactionAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['god', 'parent'].includes(profile.role)) {
        return { success: false, error: 'Solo administradores pueden desvincular operaciones' };
    }

    // Get the linked transaction to clear both sides
    const { data: tx } = await supabase
        .from('transactions')
        .select('linked_transaction_id')
        .eq('id', id)
        .single();

    if (!tx?.linked_transaction_id) {
        return { success: false, error: 'Esta operación no está vinculada' };
    }

    const linkedId = tx.linked_transaction_id;

    // Clear both sides
    const { error: err1 } = await supabase
        .from('transactions')
        .update({ linked_transaction_id: null })
        .eq('id', id);

    const { error: err2 } = await supabase
        .from('transactions')
        .update({ linked_transaction_id: null })
        .eq('id', linkedId);

    if (err1 || err2) {
        return { success: false, error: err1?.message || err2?.message || 'Error al desvincular' };
    }

    return { success: true };
}

/**
 * Mark two transactions as NOT duplicates (dismiss detection).
 * Only god/parent can do this.
 */
export async function dismissDuplicateAction(idA: string, idB: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['god', 'parent'].includes(profile.role)) {
        return { success: false, error: 'Solo administradores pueden descartar duplicados' };
    }

    // Use consistent ordering to avoid duplicate entries
    const [sortedA, sortedB] = idA < idB ? [idA, idB] : [idB, idA];

    const { error } = await supabase
        .from('dismissed_duplicates')
        .upsert({
            transaction_id_a: sortedA,
            transaction_id_b: sortedB,
            dismissed_by: user.id,
        }, {
            onConflict: 'transaction_id_a,transaction_id_b'
        });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
