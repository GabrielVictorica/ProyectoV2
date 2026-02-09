import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Este endpoint crea el usuario GOD inicial
// IMPORTANTE: Eliminar este archivo después de usarlo
export async function GET() {
    try {
        // Usar service_role key para bypass de RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json(
                { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.local' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // 1. Crear la organización "Headquarters"
        console.log('Creando organización Headquarters...');
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name: 'Headquarters',
                slug: 'headquarters',
                email: 'admin@entreinmobiliarios.com',
                is_active: true,
            })
            .select()
            .single();

        if (orgError) {
            // Si ya existe, intentar obtenerla
            if (orgError.code === '23505') {
                const { data: existingOrg } = await supabase
                    .from('organizations')
                    .select()
                    .eq('slug', 'headquarters')
                    .single();

                if (existingOrg) {
                    console.log('Organización ya existía:', existingOrg.id);
                }
            } else {
                throw orgError;
            }
        }

        const organizationId = org?.id;
        console.log('Organización creada/encontrada:', organizationId);

        // 2. Crear el usuario en Auth
        console.log('Creando usuario en Auth...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: 'gabriel.v.g06@gmail.com',
            password: 'Melchora!!',
            email_confirm: true,
        });

        if (authError) {
            // Si el usuario ya existe, intentar obtenerlo
            if (authError.message.includes('already been registered')) {
                const { data: users } = await supabase.auth.admin.listUsers();
                const existingUser = users?.users?.find(u => u.email === 'gabriel.v.g06@gmail.com');

                if (existingUser) {
                    // Verificar si ya tiene perfil
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select()
                        .eq('id', existingUser.id)
                        .single();

                    if (existingProfile) {
                        return NextResponse.json({
                            success: true,
                            message: 'Usuario GOD ya existe',
                            user: {
                                id: existingUser.id,
                                email: existingUser.email,
                                role: existingProfile.role,
                            },
                        });
                    }

                    // Crear perfil si no existe
                    const { data: newProfile, error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: existingUser.id,
                            first_name: 'Gabriel',
                            last_name: 'Admin',
                            role: 'god',
                            organization_id: organizationId,
                            is_active: true,
                        })
                        .select()
                        .single();

                    if (profileError) throw profileError;

                    return NextResponse.json({
                        success: true,
                        message: 'Perfil GOD creado para usuario existente',
                        user: {
                            id: existingUser.id,
                            email: existingUser.email,
                            role: 'god',
                        },
                        profile: newProfile,
                    });
                }
            }
            throw authError;
        }

        if (!authData.user) {
            throw new Error('No se pudo crear el usuario');
        }

        console.log('Usuario Auth creado:', authData.user.id);

        // 3. Crear el perfil GOD
        console.log('Creando perfil GOD...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                first_name: 'Gabriel',
                last_name: 'Admin',
                role: 'god',
                organization_id: organizationId,
                is_active: true,
            })
            .select()
            .single();

        if (profileError) {
            throw profileError;
        }

        console.log('Perfil GOD creado:', profile.id);

        return NextResponse.json({
            success: true,
            message: '¡Usuario GOD creado exitosamente!',
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: 'god',
            },
            organization: org,
            profile: profile,
            instructions: 'Ahora puedes iniciar sesión en /login con gabriel.v.g06@gmail.com',
        });

    } catch (error: unknown) {
        console.error('Error en seed:', error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: message, details: error },
            { status: 500 }
        );
    }
}
