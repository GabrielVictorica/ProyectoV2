import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Verificar que el usuario es GOD
async function verifyGodUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { isGod: false, error: 'No autenticado' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if ((profile as any)?.role !== 'god') {
        return { isGod: false, error: 'No autorizado' };
    }

    return { isGod: true };
}

// GET - Obtener billing records (individual o global)
export async function GET(request: NextRequest) {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return NextResponse.json({ error: authError }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');
        const mode = searchParams.get('mode'); // 'summary' o 'list'

        const adminClient = createAdminClient();

        if (mode === 'summary') {
            // Obtener resumen de todas las organizaciones
            const { data: orgs, error: orgsError } = await adminClient
                .from('organizations')
                .select('id, name, royalty_percentage, org_status');

            if (orgsError) throw orgsError;

            const { data: records, error: recordsError } = await adminClient
                .from('billing_records')
                .select('*')
                .neq('status', 'cancelled');

            if (recordsError) throw recordsError;

            const today = new Date();
            const summary = (orgs || []).map((org: any) => {
                const orgRecords = (records || []).filter(r => (r as any).organization_id === org.id);
                const pendingRecords = orgRecords.filter(r => (r as any).status === 'pending');

                const totalDebt = pendingRecords.reduce((sum, r) => sum + ((r as any).amount + ((r as any).surcharge_amount || 0)), 0);
                const overdueCount = pendingRecords.filter(r => {
                    const dueDate = new Date((r as any).first_due_date || (r as any).due_date);
                    return dueDate < today;
                }).length;

                return {
                    id: org.id,
                    name: org.name,
                    status: org.org_status || 'active',
                    royalty: org.royalty_percentage || 0,
                    totalDebt,
                    overdueCount,
                    pendingCount: pendingRecords.length
                };
            });

            return NextResponse.json({ success: true, data: summary });
        }

        if (!organizationId) {
            // Si no hay id, devolvemos todo (paginado o limitado en el futuro)
            const { data, error } = await adminClient
                .from('billing_records')
                .select('*, organization:organizations(name)')
                .order('due_date', { ascending: false })
                .limit(100);

            if (error) throw error;
            return NextResponse.json({ success: true, data });
        }

        const { data, error } = await adminClient
            .from('billing_records')
            .select('*')
            .eq('organization_id', organizationId)
            .order('due_date', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching billing records:', err);
        return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 });
    }
}

// POST - Crear nuevo cargo
export async function POST(request: NextRequest) {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return NextResponse.json({ error: authError }, { status: 403 });
        }

        const body = await request.json();
        const {
            organization_id,
            concept,
            amount,
            due_date,
            notes,
            billing_type,
            internal_notes,
            payment_method,
            period,
            original_amount,
            surcharge_amount,
            first_due_date,
            second_due_date
        } = body;

        if (!organization_id || !concept || !amount || !due_date) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const query: any = adminClient.from('billing_records');
        const { data, error } = await query
            .insert({
                organization_id,
                concept,
                amount: parseFloat(amount),
                due_date,
                notes: notes || null,
                status: 'pending',
                billing_type: billing_type || 'royalty',
                internal_notes: internal_notes || null,
                payment_method: payment_method || null,
                period: period || null,
                original_amount: original_amount ? parseFloat(original_amount) : parseFloat(amount),
                surcharge_amount: surcharge_amount ? parseFloat(surcharge_amount) : 0,
                first_due_date: first_due_date || due_date,
                second_due_date: second_due_date || null,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error creating billing record:', err);
        return NextResponse.json({ error: 'Error al crear cargo' }, { status: 500 });
    }
}

// PUT - Actualizar registro (marcar como pagado, etc)
export async function PUT(request: NextRequest) {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return NextResponse.json({ error: authError }, { status: 403 });
        }

        const body = await request.json();
        const { id, status, notes, paid_at, payment_method, receipt_url, internal_notes, payment_details } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const query: any = adminClient.from('billing_records');

        // Construir objeto de actualización con tipos correctos
        const updateData: any = { updated_at: new Date().toISOString() };
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (paid_at) updateData.paid_at = paid_at;
        if (payment_method) updateData.payment_method = payment_method;
        if (receipt_url) updateData.receipt_url = receipt_url;
        if (internal_notes) updateData.internal_notes = internal_notes;
        if (payment_details) updateData.payment_details = payment_details;

        // Si se marca como pagado, establecer la fecha
        if (status === 'paid' && !paid_at) {
            updateData.paid_at = new Date().toISOString();
        }

        const { data, error } = await query
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error updating billing record:', err);
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
}

// DELETE - Eliminar/cancelar registro
export async function DELETE(request: NextRequest) {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return NextResponse.json({ error: authError }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const query: any = adminClient.from('billing_records');

        // En lugar de eliminar, marcamos como cancelado para mantener historial
        const { data, error } = await query
            .update({ status: 'cancelled', updated_at: new Date().toISOString() } as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error cancelling billing record:', err);
        return NextResponse.json({ error: 'Error al cancelar' }, { status: 500 });
    }
}
