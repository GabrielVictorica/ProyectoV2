import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Verificar que el usuario tiene permisos
async function verifyUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, profile: null, error: 'No autenticado' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id, default_split_percentage')
        .eq('id', user.id)
        .single();

    const profileData = profile as any;

    return { user, profile: profileData, error: null };
}

// GET - Obtener transacciones
export async function GET(request: NextRequest) {
    try {
        const { user, profile, error: authError } = await verifyUser();
        if (authError || !profile || !user) {
            return NextResponse.json({ error: authError || 'No autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');
        const propertyId = searchParams.get('propertyId');
        const agentId = searchParams.get('agentId');
        const year = searchParams.get('year');
        const month = searchParams.get('month');

        const adminClient = createAdminClient();
        let query = (adminClient as any)
            .from('transactions')
            .select(`
                *,
                property:properties(id, title, address),
                agent:profiles(id, first_name, last_name, default_split_percentage),
                organization:organizations(id, name)
            `)
            .order('transaction_date', { ascending: false });

        // Filtros según rol
        if (profile.role === 'god') {
            if (organizationId) query = query.eq('organization_id', organizationId);
        } else if (profile.role === 'parent') {
            query = query.eq('organization_id', profile.organization_id);
        } else {
            // Child solo ve sus propias transacciones
            query = query.eq('agent_id', user.id);
        }

        // Filtros adicionales
        if (propertyId) query = query.eq('property_id', propertyId);
        if (agentId) query = query.eq('agent_id', agentId);

        if (year) {
            query = query.gte('transaction_date', `${year}-01-01`)
                .lte('transaction_date', `${year}-12-31`);
        }
        if (month && year) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
    }
}

// POST - Crear transacción (Cerrar Operación)
export async function POST(request: NextRequest) {
    try {
        const { user, profile, error: authError } = await verifyUser();
        if (authError || !profile || !user) {
            return NextResponse.json({ error: authError || 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const {
            property_id,
            transaction_date,
            actual_price,
            sides = 1,
            commission_percentage = 3.0,
            agent_split_percentage,
            buyer_name,
            seller_name,
            buyer_id,
            seller_id,
            notes,
            organization_id, // Solo para GOD
            custom_property_title
        } = body;

        if (!actual_price) {
            return NextResponse.json({ error: 'El precio es requerido' }, { status: 400 });
        }

        // Determinar organization_id y agent_id
        let orgId = profile.organization_id;
        let finalAgentId = user.id;

        if (profile.role === 'god') {
            if (organization_id) orgId = organization_id;
            if (body.agent_id) finalAgentId = body.agent_id;
        } else if (profile.role === 'parent') {
            // Un Parent puede asignar a sus agentes
            if (body.agent_id) finalAgentId = body.agent_id;
        }

        if (!orgId) {
            return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Obtener royalty de la organización (destino)
        const { data: orgData } = await (adminClient as any)
            .from('organizations')
            .select('royalty_percentage')
            .eq('id', orgId)
            .single();

        const royaltyPercent = (orgData as any)?.royalty_percentage ?? 0;

        // 2. Obtener split del agente asignado (si no se proporciona)
        let splitPercentage = agent_split_percentage;
        if (splitPercentage === undefined) {
            const { data: agentProfile } = await (adminClient as any)
                .from('profiles')
                .select('default_split_percentage')
                .eq('id', finalAgentId)
                .single();
            splitPercentage = agentProfile?.default_split_percentage ?? 45.0;
        }

        // 3. Calcular reparto triple
        // El bruto total contempla los lados (puntas)
        const gross_commission = parseFloat(actual_price) * (parseFloat(commission_percentage) / 100) * parseInt(sides);

        // Monto para Dios (Master Fee)
        const master_commission_amount = gross_commission * (royaltyPercent / 100);

        // Monto para Agente (Split)
        const net_commission = gross_commission * (parseFloat(splitPercentage) / 100);

        // Monto para Oficina (Resto)
        const office_commission_amount = gross_commission - master_commission_amount - net_commission;

        const { data, error } = await (adminClient as any)
            .from('transactions')
            .insert({
                organization_id: orgId,
                property_id: property_id || null,
                agent_id: finalAgentId,
                transaction_date: transaction_date || new Date().toISOString().split('T')[0],
                actual_price: parseFloat(actual_price),
                sides: parseInt(sides),
                commission_percentage: parseFloat(commission_percentage),
                agent_split_percentage: parseFloat(splitPercentage as any),
                gross_commission,
                net_commission,
                master_commission_amount,
                office_commission_amount,
                royalty_percentage_at_closure: royaltyPercent,
                buyer_name: buyer_name || null,
                seller_name: seller_name || null,
                buyer_id: buyer_id || null,
                seller_id: seller_id || null,
                notes: notes || null,
                custom_property_title: custom_property_title || null,
            })
            .select(`
                *,
                property:properties(id, title, address),
                agent:profiles(id, first_name, last_name, default_split_percentage)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error creating transaction:', err);
        return NextResponse.json({ error: 'Error al crear transacción' }, { status: 500 });
    }
}

// PUT - Actualizar transacción
export async function PUT(request: NextRequest) {
    try {
        const { user, profile, error: authError } = await verifyUser();
        if (authError || !profile || !user) {
            return NextResponse.json({ error: authError || 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Obtener transacción actual para verificar permisos
        const { data: currentTx } = await (adminClient as any)
            .from('transactions')
            .select('agent_id, organization_id, actual_price, commission_percentage, agent_split_percentage')
            .eq('id', id)
            .single();

        const txData = currentTx as any;

        if (!txData) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
        }

        // Verificar permisos
        if (profile.role === 'child' && txData.agent_id !== user.id) {
            return NextResponse.json({ error: 'Sin permisos para editar esta transacción' }, { status: 403 });
        }
        if (profile.role === 'parent' && txData.organization_id !== profile.organization_id) {
            return NextResponse.json({ error: 'Sin permisos para editar esta transacción' }, { status: 403 });
        }

        // Construir objeto de actualización
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        // Copiar campos actualizables
        const allowedFields = [
            'transaction_date', 'actual_price', 'sides',
            'commission_percentage', 'agent_split_percentage',
            'buyer_name', 'seller_name', 'buyer_id', 'seller_id', 'notes',
            'custom_property_title', 'agent_id', 'organization_id'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        }

        // Recalcular comisiones si se actualizaron campos relevantes
        const price = parseFloat(updates.actual_price ?? currentTx.actual_price);
        const commPercent = parseFloat(updates.commission_percentage ?? currentTx.commission_percentage);
        const splitPercent = parseFloat(updates.agent_split_percentage ?? currentTx.agent_split_percentage);
        const sides = parseInt(updates.sides ?? currentTx.sides);

        if (updates.actual_price !== undefined || updates.commission_percentage !== undefined || updates.agent_split_percentage !== undefined || updates.sides !== undefined) {
            // 1. Obtener royalty de la organización
            const { data: orgData } = await (adminClient as any)
                .from('organizations')
                .select('royalty_percentage')
                .eq('id', txData.organization_id)
                .single();

            const royaltyPercent = orgData?.royalty_percentage ?? 0;

            const gross_commission = price * (commPercent / 100) * sides;
            const master_commission_amount = gross_commission * (royaltyPercent / 100);
            const net_commission = gross_commission * (splitPercent / 100);
            const office_commission_amount = gross_commission - master_commission_amount - net_commission;

            updateData.gross_commission = gross_commission;
            updateData.net_commission = net_commission;
            updateData.master_commission_amount = master_commission_amount;
            updateData.office_commission_amount = office_commission_amount;
            updateData.royalty_percentage_at_closure = royaltyPercent;
        }

        const { data, error } = await (adminClient as any)
            .from('transactions')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                property:properties(id, title, address),
                agent:profiles(id, first_name, last_name, default_split_percentage)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error updating transaction:', err);
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
}

// DELETE - Eliminar transacción
export async function DELETE(request: NextRequest) {
    try {
        const { user, profile, error: authError } = await verifyUser();
        if (authError || !profile || !user) {
            return NextResponse.json({ error: authError || 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Obtener transacción actual para verificar permisos
        const { data: currentTx } = await (adminClient as any)
            .from('transactions')
            .select('agent_id, organization_id')
            .eq('id', id)
            .single();

        const txDataDel = currentTx as any;

        if (!txDataDel) {
            return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
        }

        // Solo God y Parent pueden eliminar, Child solo sus propias
        if (profile.role === 'child' && txDataDel.agent_id !== user.id) {
            return NextResponse.json({ error: 'Sin permisos para eliminar esta transacción' }, { status: 403 });
        }
        if (profile.role === 'parent' && txDataDel.organization_id !== profile.organization_id) {
            return NextResponse.json({ error: 'Sin permisos para eliminar esta transacción' }, { status: 403 });
        }

        const { error } = await (adminClient as any)
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error deleting transaction:', err);
        return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }
}
