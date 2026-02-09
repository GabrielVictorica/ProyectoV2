import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
    const adminClient = createAdminClient();
    const email = 'gabriel.v.g06@gmail.com';
    const password = 'Melchora!!';

    try {
        // 1. Intentar crear el usuario en Auth
        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (error && !error.message.includes('already been registered')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Si ya existe en auth, necesitamos su ID
        let userId: string;
        if (error && error.message.includes('already been registered')) {
            // Esta parte es difícil sin el ID, pero como count era 0, no debería pasar.
            return NextResponse.json({ error: 'El usuario ya existe en Auth pero no se pudo recuperar el ID via API pública' }, { status: 409 });
        } else {
            userId = data.user!.id;
        }

        // 2. Crear o actualizar el perfil como 'god'
        const { error: profileError } = await adminClient
            .from('profiles' as any)
            .upsert({
                id: userId,
                first_name: 'Gabriel',
                last_name: 'Victorica',
                role: 'god',
                is_active: true
            } as any);

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Usuario Dios restaurado correctamente.',
            credentials: {
                email,
                role: 'god'
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
