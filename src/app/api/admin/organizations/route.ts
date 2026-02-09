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
        .from('profiles' as any)
        .select('role')
        .eq('id', user.id)
        .single();

    if ((profile as any)?.role !== 'god') {
        return { isGod: false, error: 'No autorizado' };
    }

    return { isGod: true };
}

// PUT - Actualizar organización
export async function PUT(request: NextRequest) {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return NextResponse.json({ error: authError }, { status: 403 });
        }

        const body = await request.json();
        const {
            id,
            name,
            slug,
            email,
            phone,
            address,
            // Campos fiscales
            legal_name,
            cuit,
            billing_address,
            // Campos comerciales (GOD only)
            royalty_percentage,
            org_status,
            // Direcciones estructuradas
            officeAddress,
            billingAddress
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Actualizar tabla principal (organizations)
        const { data: org, error: orgError } = await adminClient
            .from('organizations' as any)
            .update({
                name,
                slug,
                email: email || null,
                phone: phone || null,
                address: address || null, // Legacy string
                legal_name: legal_name || null,
                cuit: cuit || null,
                billing_address: billing_address || null, // Legacy string
                royalty_percentage: royalty_percentage ?? null,
                org_status: org_status || 'active',
            } as any)
            .eq('id', id)
            .select()
            .single();

        if (orgError) {
            if (orgError.code === '23505') {
                return NextResponse.json({ error: 'Ya existe una organización con ese slug' }, { status: 400 });
            }
            throw orgError;
        }

        // 2. Sincronizar direcciones estructuradas en la tabla organization_addresses
        // Usamos upsert basado en organization_id y address_type

        if (officeAddress && (officeAddress.street || officeAddress.city)) {
            await adminClient
                .from('organization_addresses' as any)
                .upsert({
                    organization_id: id,
                    address_type: 'office',
                    street: officeAddress.street || null,
                    number: officeAddress.number || null,
                    floor: officeAddress.floor || null,
                    city: officeAddress.city || null,
                    postal_code: officeAddress.postalCode || null,
                    province: officeAddress.province || null,
                } as any, { onConflict: 'organization_id, address_type' });
        }

        if (billingAddress && (billingAddress.street || billingAddress.city)) {
            await adminClient
                .from('organization_addresses' as any)
                .upsert({
                    organization_id: id,
                    address_type: 'billing',
                    street: billingAddress.street || null,
                    number: billingAddress.number || null,
                    floor: billingAddress.floor || null,
                    city: billingAddress.city || null,
                    postal_code: billingAddress.postalCode || null,
                    province: billingAddress.province || null,
                } as any, { onConflict: 'organization_id, address_type' });
        }

        return NextResponse.json({ success: true, data: org });
    } catch (err) {
        console.error('Error updating organization:', err);
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
}

// DELETE - Eliminar organización
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
        const { error } = await adminClient
            .from('organizations' as any)
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error deleting organization:', err);
        return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }
}
