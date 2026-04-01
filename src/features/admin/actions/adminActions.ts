'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database, Profile, Organization } from '@/types/database.types';

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

// Validación server-side de CUIT (Módulo 11)
function validateCUITServer(cuit: string): boolean {
    const digits = cuit.replace(/\D/g, '');
    if (digits.length !== 11) return false;

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
        sum += parseInt(digits[i]) * multipliers[i];
    }

    const remainder = sum % 11;
    const expected = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

    return expected === parseInt(digits[10]);
}

const addressSchema = z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    floor: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    province: z.string().optional(),
}).optional();

const createOrganizationSchema = z.object({
    // Datos de la Organización
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    slug: z.string()
        .min(2, 'El slug debe tener al menos 2 caracteres')
        .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
    email: z.string().email('Email de oficina inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    // Direcciones estructuradas
    officeAddress: addressSchema,
    billingAddress: addressSchema,
    // Backward compatibility - strings concatenados (legacy)
    address: z.string().optional(),
    billing_address: z.string().optional().or(z.literal('')),
    // Datos Fiscales
    legal_name: z.string().optional().or(z.literal('')),
    cuit: z.string().optional().or(z.literal(''))
        .refine(
            (val) => !val || val.replace(/\D/g, '').length !== 11 || validateCUITServer(val),
            'CUIT inválido (dígito verificador incorrecto)'
        ),
    // Datos Comerciales
    royalty_percentage: z.coerce.number().min(0).max(100).optional(),
    // Datos del Usuario Broker (Administrador Inicial)
    brokerEmail: z.string().email('Email del broker inválido'),
    brokerPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    brokerFirstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    brokerLastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    brokerSplitPercentage: z.coerce.number().min(0).max(100).optional().default(100),
});

const createUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    role: z.enum(['parent', 'child'], { message: 'Rol inválido' }),
    organizationId: z.string().uuid('ID de organización inválido'),
    supervisorIds: z.array(z.string().uuid()).optional().default([]),
    phone: z.string().optional(),
    defaultSplitPercentage: z.coerce.number().min(0).max(100).default(45),
});

const updateUserSchema = z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    phone: z.string().optional().or(z.literal('')),
    supervisorIds: z.array(z.string().uuid()).optional().default([]),
    defaultSplitPercentage: z.coerce.number().min(0).max(100),
    organizationId: z.string().uuid('ID de organización inválido').optional().or(z.literal('')),
});

const upsertGoalSchema = z.object({
    agentId: z.string().uuid('ID de agente inválido'),
    year: z.number().int().min(2000).max(2100),
    annualBillingGoal: z.coerce.number().min(0, 'La meta debe ser mayor o igual a 0'),
    monthlyLivingExpenses: z.coerce.number().min(0, 'Los gastos deben ser mayor o igual a 0'),
    averageTicketTarget: z.coerce.number().min(0, 'El ticket promedio debe ser mayor o igual a 0'),
    averageCommissionTarget: z.coerce.number().min(0, 'La comisión debe ser mayor o igual a 0').max(100),
    currency: z.string().min(1, 'La moneda es requerida'),
    splitPercentage: z.coerce.number().min(0).max(100).default(50),
    conversionRate: z.coerce.number().min(1).default(6),
    workingWeeks: z.coerce.number().min(1).max(52).default(48),
    listingsGoalAnnual: z.coerce.number().min(0).optional().default(0),
    plToListingConversionTarget: z.coerce.number().min(1).max(100).optional().default(40),
    salesEffectivenessRatio: z.coerce.number().min(1).max(20).optional().default(2),
    listingsGoalStartDate: z.string().optional().nullable(),
    listingsGoalEndDate: z.string().optional().nullable(),
});

// ============================================
// TIPOS
// ============================================

export type ActionResult<T = unknown> =
    | { success: true; data: T }
    | { success: false; error: string };

// ============================================
// HELPER: Verificar que el usuario actual es Dios
// ============================================

export async function verifyGodUser(): Promise<{
    isGod: boolean;
    user?: any;
    profile?: any;
    error?: string;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { isGod: false, error: 'No autenticado' };
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            return { isGod: false, error: 'Perfil no encontrado' };
        }

        // Usamos as any para evitar problemas de inferencia con el enum user_role si es necesario
        // pero profile.role debería ser 'god' | 'parent' | 'child'
        if ((profile.role as string) !== 'god') {
            return { isGod: false, error: 'No tienes permisos de administrador (Dios)' };
        }

        return { isGod: true };
    } catch (err) {
        console.error('Error in verifyGodUser:', err);
        return { isGod: false, error: 'Error interno de validación' };
    }
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Crear una nueva organización + Usuario Broker inicial
 */
export async function createOrganizationAction(
    formData: z.infer<typeof createOrganizationSchema>
): Promise<ActionResult<{ organizationId: string; brokerId: string }>> {
    try {
        // 1. Verificar permisos
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado' };
        }

        // 2. Validar datos
        const validatedData = createOrganizationSchema.parse(formData);
        const adminClient = createAdminClient();

        // 3. Crear organización
        const { data: org, error: orgError } = await adminClient
            .from('organizations')
            .insert({
                name: validatedData.name,
                slug: validatedData.slug,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                address: validatedData.address || null,
                legal_name: validatedData.legal_name || null,
                cuit: validatedData.cuit || null,
                billing_address: validatedData.billing_address || null,
                royalty_percentage: validatedData.royalty_percentage ?? 0,
                is_active: true,
            })
            .select('id')
            .single();

        if (orgError || !org) {
            if (orgError?.code === '23505') {
                return { success: false, error: 'Ya existe una inmobiliaria con ese slug' };
            }
            throw orgError || new Error('No se pudo crear la organización');
        }

        const orgId = (org as any).id as string;

        // 3.5. Insertar direcciones estructuradas en la nueva tabla
        const officeAddr = validatedData.officeAddress;
        const billingAddr = validatedData.billingAddress;

        if (officeAddr && (officeAddr.street || officeAddr.city)) {
            await adminClient
                .from('organization_addresses')
                .insert({
                    organization_id: orgId,
                    address_type: 'office',
                    street: officeAddr.street || null,
                    number: officeAddr.number || null,
                    floor: officeAddr.floor || null,
                    city: officeAddr.city || null,
                    postal_code: officeAddr.postalCode || null,
                    province: officeAddr.province || null,
                });
        }

        if (billingAddr && (billingAddr.street || billingAddr.city)) {
            await adminClient
                .from('organization_addresses')
                .insert({
                    organization_id: orgId,
                    address_type: 'billing',
                    street: billingAddr.street || null,
                    number: billingAddr.number || null,
                    floor: billingAddr.floor || null,
                    city: billingAddr.city || null,
                    postal_code: billingAddr.postalCode || null,
                    province: billingAddr.province || null,
                });
        }

        // 4. Verificar si el usuario ya existe en Auth
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === validatedData.brokerEmail.toLowerCase());

        let userId: string;

        if (existingUser) {
            // El usuario ya existe, lo usamos
            userId = existingUser.id;

            // Actualizar su perfil para vincularlo a la nueva organización
            const { error: updateError } = await adminClient
                .from('profiles')
                .update({
                    organization_id: orgId,
                })
                .eq('id', userId);

            if (updateError) {
                // Rollback organización
                await adminClient.from('organizations').delete().eq('id', orgId);
                throw updateError;
            }
        } else {
            // El usuario no existe, lo creamos
            const { data: authData, error: authError2 } = await adminClient.auth.admin.createUser({
                email: validatedData.brokerEmail,
                password: validatedData.brokerPassword,
                email_confirm: true,
            });

            if (authError2 || !authData.user) {
                // Rollback organización
                await adminClient.from('organizations').delete().eq('id', orgId);

                if (authError2?.message.includes('already been registered')) {
                    return { success: false, error: 'Email del broker ya está en uso' };
                }
                throw authError2 || new Error('No se pudo crear el usuario de autenticación');
            }

            userId = authData.user.id;

            // 5. Crear perfil del Broker (Solo si es nuevo)
            const { error: profileError } = await adminClient
                .from('profiles')
                .insert({
                    id: userId,
                    first_name: validatedData.brokerFirstName,
                    last_name: validatedData.brokerLastName,
                    role: 'parent',
                    organization_id: orgId,
                    is_active: true,
                    default_split_percentage: validatedData.brokerSplitPercentage,
                });

            if (profileError) {
                // Rollback usuario y organización
                await adminClient.auth.admin.deleteUser(userId);
                await adminClient.from('organizations').delete().eq('id', orgId);
                throw profileError;
            }
        }

        revalidatePath('/dashboard/admin/organizations');
        revalidatePath('/dashboard/admin/users');

        return {
            success: true,
            data: { organizationId: orgId, brokerId: userId }
        };
    } catch (err) {
        console.error('Error in createOrganizationAction:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al crear la organización y sus datos' };
    }
}

/**
 * Crear un nuevo usuario (Parent o Child)
 */
export async function createUserAction(
    formData: z.infer<typeof createUserSchema>
): Promise<ActionResult<{ id: string; email: string; role: string }>> {
    try {
        // 1. Verificar permisos (Solo Dios puede crear usuarios)
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado. Solo Dios puede gestionar usuarios.' };
        }

        const validatedData = createUserSchema.parse(formData);
        const adminClient = createAdminClient();

        // 2. Validar que todos los supervisores pertenecen a la misma organización
        if (validatedData.supervisorIds && validatedData.supervisorIds.length > 0) {
            const { data: supervisors, error: supervisorCheckError } = await adminClient
                .from('profiles')
                .select('id, organization_id')
                .in('id', validatedData.supervisorIds);

            if (supervisorCheckError) throw supervisorCheckError;

            const invalidSupervisors = supervisors?.filter(s => s.organization_id !== validatedData.organizationId);
            if (invalidSupervisors && invalidSupervisors.length > 0) {
                return {
                    success: false,
                    error: 'Todos los supervisores deben pertenecer a la misma organización que el agente.'
                };
            }
        }

        // 2. Crear usuario en Auth
        const { data: authData, error: authError2 } = await adminClient.auth.admin.createUser({
            email: validatedData.email,
            password: validatedData.password,
            email_confirm: true,
        });

        if (authError2 || !authData.user) {
            if (authError2?.message.includes('already been registered')) {
                return { success: false, error: 'Ya existe un usuario con ese email' };
            }
            throw authError2 || new Error('No se pudo crear el usuario en Auth');
        }

        const userId = authData.user.id;

        // 3. Crear perfil
        const { error: profileError } = await adminClient
            .from('profiles')
            .insert({
                id: userId,
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                role: validatedData.role as Database['public']['Enums']['user_role'],
                organization_id: validatedData.organizationId,
                phone: validatedData.phone || null,
                is_active: true,
                default_split_percentage: validatedData.defaultSplitPercentage,
            });

        if (profileError) {
            // Rollback: eliminar usuario de auth si falla el perfil
            await adminClient.auth.admin.deleteUser(userId);
            throw profileError;
        }

        // 4. Insertar supervisores en la nueva tabla (N:N)
        if (validatedData.supervisorIds && validatedData.supervisorIds.length > 0) {
            const supervisorInserts = validatedData.supervisorIds.map(sid => ({
                agent_id: userId,
                supervisor_id: sid
            }));

            const { error: supervisorError } = await adminClient
                .from('profile_supervisors')
                .insert(supervisorInserts);

            if (supervisorError) {
                console.error('Error inserting supervisors:', supervisorError);
                // No hacemos rollback completo aquí para evitar borrar la cuenta ya creada, 
                // pero informamos un error parcial si fuera necesario.
                // En este caso, continuamos ya que el perfil principal está bien.
            }
        }

        revalidatePath('/dashboard/admin/users');
        revalidatePath('/dashboard/team');

        return {
            success: true,
            data: {
                id: userId,
                email: authData.user.email!,
                role: validatedData.role
            }
        };
    } catch (err) {
        console.error('Error creating user:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al crear el usuario' };
    }
}

/**
 * Actualizar un usuario existente
 */
export async function updateUserAction(
    userId: string,
    formData: z.infer<typeof updateUserSchema>
): Promise<ActionResult<void>> {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado' };
        }

        const validatedData = updateUserSchema.parse(formData);
        const adminClient = createAdminClient();

        // 1.5 Validar que todos los supervisores pertenecen a la misma organización
        if (validatedData.supervisorIds && validatedData.supervisorIds.length > 0) {
            // Obtener la organización del usuario (si no se pasó en el form)
            let orgId = validatedData.organizationId;
            if (!orgId) {
                const { data: currentProfile } = await adminClient
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', userId)
                    .single();
                orgId = currentProfile?.organization_id || undefined;
            }

            if (orgId) {
                const { data: supervisors, error: supervisorCheckError } = await adminClient
                    .from('profiles')
                    .select('id, organization_id')
                    .in('id', validatedData.supervisorIds);

                if (supervisorCheckError) throw supervisorCheckError;

                const invalidSupervisors = supervisors?.filter(s => s.organization_id !== orgId);
                if (invalidSupervisors && invalidSupervisors.length > 0) {
                    return {
                        success: false,
                        error: 'Todos los supervisores deben pertenecer a la misma organización que el agente.'
                    };
                }
            }
        }

        const { error } = await adminClient
            .from('profiles')
            .update({
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                phone: validatedData.phone || null,
                default_split_percentage: validatedData.defaultSplitPercentage,
                organization_id: validatedData.organizationId || undefined,
            })
            .eq('id', userId);

        if (error) throw error;

        // 2. Sincronizar supervisores (N:N)
        // Eliminamos los actuales y re-insertamos los nuevos
        const { error: deleteError } = await adminClient
            .from('profile_supervisors')
            .delete()
            .eq('agent_id', userId);

        if (deleteError) {
            console.error('Error deleting old supervisors:', deleteError);
        }

        if (validatedData.supervisorIds && validatedData.supervisorIds.length > 0) {
            const supervisorInserts = validatedData.supervisorIds.map(sid => ({
                agent_id: userId,
                supervisor_id: sid
            }));

            const { error: insertError } = await adminClient
                .from('profile_supervisors')
                .insert(supervisorInserts);

            if (insertError) {
                console.error('Error inserting new supervisors:', insertError);
            }
        }

        revalidatePath('/dashboard/admin/users');
        revalidatePath('/dashboard/team');

        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error updating user:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al actualizar el usuario' };
    }
}

/**
 * Obtener lista de organizaciones
 */
export async function getOrganizationsAction(): Promise<ActionResult<Array<{ id: string; name: string; slug: string }>>> {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado' };
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('organizations')
            .select('id, name, slug')
            .order('name');
        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('Error fetching organizations:', err);
        return { success: false, error: 'Error al obtener organizaciones' };
    }
}

/**
 * Obtener usuarios de una organización (para selector de parent)
 */
export async function getParentUsersAction(
    organizationId: string
): Promise<ActionResult<Array<{ id: string; name: string }>>> {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado' };
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('organization_id', organizationId)
            .eq('role', 'parent')
            .eq('is_active', true);

        if (error) throw error;

        const parents = (data || []).map(p => ({
            id: p.id,
            name: `${p.first_name} ${p.last_name}`,
        }));

        return { success: true, data: parents };
    } catch (err) {
        console.error('Error fetching parent users:', err);
        return { success: false, error: 'Error al obtener supervisores' };
    }
}

/**
 * Eliminar un usuario
 */
export async function deleteUserAction(
    userId: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return { success: false, error: 'No autenticado' };
        }

        const { data: currentUserProfile } = await (supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', authUser.id)
            .single() as any);

        if (!currentUserProfile) {
            return { success: false, error: 'Perfil no encontrado' };
        }

        const adminClient = createAdminClient();

        // 1. Obtener el perfil del usuario a eliminar para verificar permisos
        const { data: targetProfile, error: targetError } = await (adminClient
            .from('profiles')
            .select('role, organization_id')
            .eq('id', userId)
            .single() as any);

        if (targetError || !targetProfile) {
            return { success: false, error: 'Usuario a eliminar no encontrado' };
        }

        const currentRole = (currentUserProfile as any).role as string;
        const currentOrg = (currentUserProfile as any).organization_id;
        const targetRole = (targetProfile as any).role as string;
        const targetOrg = (targetProfile as any).organization_id;

        // Reglas de permisos:
        // - GOD puede borrar a cualquiera (menos a sí mismo, validado por auth)
        // - PARENT puede borrar solo a CHILD de su propia organización
        const canDelete =
            currentRole === 'god' ||
            (currentRole === 'parent' &&
                targetRole === 'child' &&
                targetOrg === currentOrg);

        if (!canDelete) {
            return { success: false, error: 'No tienes permisos para eliminar este usuario' };
        }

        // Eliminar de auth (el perfil y otros datos se eliminan por CASCADE en la DB)
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;

        revalidatePath('/dashboard/admin/users');
        revalidatePath('/dashboard/team');

        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error deleting user:', err);
        return { success: false, error: 'Error al eliminar el usuario' };
    }
}

/**
 * Eliminar una organización y todos sus usuarios asociados
 */
export async function deleteOrganizationAction(
    orgId: string
): Promise<ActionResult<void>> {
    try {
        // Solo GOD puede borrar organizaciones
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado' };
        }

        const adminClient = createAdminClient();

        // 1. Eliminar propiedades de la organización
        const { error: propertiesDeleteError } = await adminClient
            .from('properties')
            .delete()
            .eq('organization_id', orgId);
        if (propertiesDeleteError) {
            console.error('Error eliminando propiedades:', propertiesDeleteError);
        }

        // 2. Eliminar transacciones de la organización (Importante: antes que los usuarios por el FK agent_id)
        const { error: txDeleteError } = await adminClient
            .from('transactions')
            .delete()
            .eq('organization_id', orgId);
        if (txDeleteError) {
            console.error('Error eliminando transacciones:', txDeleteError);
        }

        // 3. Eliminar clientes de la organización
        const { error: clientsDeleteError } = await adminClient
            .from('clients')
            .delete()
            .eq('organization_id', orgId);
        if (clientsDeleteError) {
            console.error('Error eliminando clientes:', clientsDeleteError);
        }

        // 4. Obtener todos los usuarios de la organización
        const { data: profiles, error: profilesError } = await (adminClient
            .from('profiles')
            .select('id')
            .eq('organization_id', orgId) as any);

        if (profilesError) throw profilesError;

        // 5. Eliminar cada usuario de Auth
        if (profiles && profiles.length > 0) {
            for (const profile of (profiles as any[])) {
                // Primero limpiamos parent_id para evitar problemas de recursividad en el borrado
                await adminClient.from('profiles').update({ parent_id: null } as any).eq('id', profile.id);

                const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(profile.id);
                if (deleteAuthError && !deleteAuthError.message.includes('User not found')) {
                    console.error(`Error eliminando usuario ${profile.id} de Auth:`, deleteAuthError);
                }
            }
        }

        // 5. Eliminar la organización
        const { error: orgDeleteError } = await adminClient
            .from('organizations')
            .delete()
            .eq('id', orgId);

        if (orgDeleteError) throw orgDeleteError;

        revalidatePath('/dashboard/admin/organizations');
        revalidatePath('/dashboard/admin/users');
        revalidatePath('/dashboard/team');

        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error deleting organization:', err);
        return { success: false, error: 'Error al eliminar la organización y sus datos' };
    }
}

/**
 * Alternar estado activo/inactivo de un usuario
 */
export async function toggleUserStatusAction(
    userId: string,
    isActive: boolean
): Promise<ActionResult<void>> {
    try {
        const { isGod, error: authError } = await verifyGodUser();
        if (!isGod) {
            return { success: false, error: authError || 'No autorizado' };
        }

        const adminClient = createAdminClient();

        const { error } = await (adminClient
            .from('profiles')
            .update({ is_active: isActive } as any)
            .eq('id', userId) as any);

        if (error) throw error;

        revalidatePath('/dashboard/admin/users');
        revalidatePath('/dashboard/team');

        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error toggling user status:', err);
        return { success: false, error: 'Error al cambiar el estado del usuario' };
    }
}

/**
 * Guardar o actualizar objetivos financieros de un agente
 */
export async function upsertGoalAction(
    formData: any
): Promise<ActionResult<void>> {
    try {
        const validatedData = upsertGoalSchema.parse(formData);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data: profile } = await (supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single() as any);

        if (!profile) return { success: false, error: 'Perfil no encontrado' };

        // Validar permisos
        const isGod = profile.role === 'god';
        const isParent = profile.role === 'parent';

        if (!isGod && !isParent && user.id !== validatedData.agentId) {
            return { success: false, error: 'No tienes permisos para editar estos objetivos' };
        }

        const { error } = await (supabase
            .from('agent_objectives')
            .upsert({
                agent_id: validatedData.agentId,
                year: validatedData.year,
                annual_billing_goal: validatedData.annualBillingGoal,
                monthly_living_expenses: validatedData.monthlyLivingExpenses,
                average_ticket_target: validatedData.averageTicketTarget,
                average_commission_target: validatedData.averageCommissionTarget,
                currency: validatedData.currency,
                split_percentage: validatedData.splitPercentage,
                conversion_rate: validatedData.conversionRate,
                working_weeks: validatedData.workingWeeks,
                listings_goal_annual: validatedData.listingsGoalAnnual,
                pl_to_listing_conversion_target: validatedData.plToListingConversionTarget,
                sales_effectiveness_ratio: validatedData.salesEffectivenessRatio,
                listings_goal_start_date: validatedData.listingsGoalStartDate,
                listings_goal_end_date: validatedData.listingsGoalEndDate,
            } as any, { onConflict: 'agent_id, year' }));

        if (error) throw error;

        revalidatePath('/dashboard/objectives');
        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error upserting goal:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al guardar los objetivos' };
    }
}

/**
 * Obtener progreso de objetivos de un agente (Admin/Broker access)
 */
export async function getAgentProgressAction(agentId: string, year: number, startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();

        // OPTIMIZACIÓN: Obtener usuario primero
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const [profileResult, targetProfileResult] = await Promise.all([
            (supabase.from('profiles') as any).select('role, organization_id').eq('id', user.id).single(),
            (adminClient.from('profiles') as any).select('organization_id, reports_to_organization_id').eq('id', agentId).single(),
        ]);

        if (!profileResult.data) return { success: false, error: 'Perfil no encontrado' };
        if (!targetProfileResult.data) return { success: false, error: 'Agente no encontrado' };

        const userProfile = profileResult.data as { role: string; organization_id: string };
        const targetProfile = targetProfileResult.data as { organization_id: string; reports_to_organization_id: string | null };
        const isSameOrg = userProfile.organization_id === targetProfile.organization_id;
        const reportsToMyOrg = targetProfile.reports_to_organization_id === userProfile.organization_id;

        const canSee = userProfile.role === 'god' || user.id === agentId || (userProfile.role === 'parent' && (isSameOrg || reportsToMyOrg));
        if (!canSee) return { success: false, error: 'No autorizado para ver estos objetivos' };

        // Siempre obtener vista + transacciones para métricas operacionales
        const txSelect = 'gross_commission, actual_price, net_commission, master_commission_amount, office_commission_amount, sides, status, transaction_date';

        let txQuery = (adminClient.from('transactions') as any)
            .select(txSelect)
            .eq('agent_id', agentId);

        // Filtro de fechas: período específico o año completo
        if (startDate && endDate) {
            txQuery = txQuery.gte('transaction_date', startDate).lte('transaction_date', endDate);
        } else {
            txQuery = txQuery.gte('transaction_date', `${year}-01-01`).lte('transaction_date', `${year}-12-31`);
        }

        const [progressResult, transactionsResult] = await Promise.all([
            (adminClient.from('view_agent_progress') as any)
                .select('*').eq('agent_id', agentId).eq('year', year).maybeSingle(),
            txQuery,
        ]);

        if (progressResult.error) throw progressResult.error;
        if (transactionsResult.error) throw transactionsResult.error;

        const baseData = progressResult.data;
        if (!baseData) return { success: true, data: null };

        // Calcular métricas operacionales desde transacciones
        const txns = (transactionsResult.data || []) as { gross_commission: number; actual_price: number; net_commission: number; master_commission_amount: number; office_commission_amount: number; sides: number; status: string; transaction_date: string }[];

        const nonCancelled = txns.filter(t => t.status !== 'cancelled');
        const completed = txns.filter(t => t.status === 'completed');
        const pending = txns.filter(t => t.status === 'pending');

        const operationalMetrics = {
            operations_count: nonCancelled.length,
            double_sided_count: nonCancelled.filter(t => t.sides === 2).length,
            single_sided_count: nonCancelled.filter(t => t.sides === 1).length,
            total_net_income: nonCancelled.reduce((s, t) => s + Number(t.net_commission || 0), 0),
            total_master_income: nonCancelled.reduce((s, t) => s + Number(t.master_commission_amount || 0), 0),
            total_office_income: nonCancelled.reduce((s, t) => s + Number(t.office_commission_amount || 0), 0),
            completed_sales_volume: completed.reduce((s, t) => s + Number(t.actual_price || 0), 0),
            reserved_sales_volume: pending.reduce((s, t) => s + Number(t.actual_price || 0), 0),
        };

        // Si no hay rango de fechas (anual), usar vista pre-agregada + métricas operacionales
        if (!startDate || !endDate) {
            return { success: true, data: { ...baseData, ...operationalMetrics } };
        }

        // Con rango de fechas: recalcular métricas financieras del período
        const periodIncome = nonCancelled.reduce((s, t) => s + Number(t.gross_commission || 0), 0);
        const completedIncome = completed.reduce((s, t) => s + Number(t.gross_commission || 0), 0);
        const reservedIncome = pending.reduce((s, t) => s + Number(t.gross_commission || 0), 0);
        const periodSalesVolume = nonCancelled.reduce((s, t) => s + Number(t.actual_price || 0), 0);

        const periodData = {
            ...baseData,
            ...operationalMetrics,
            actual_gross_income: periodIncome,
            actual_puntas_count: nonCancelled.length,
            completed_gross_income: completedIncome,
            reserved_gross_income: reservedIncome,
            completed_puntas_count: completed.length,
            reserved_puntas_count: pending.length,
            total_sales_volume: periodSalesVolume,
            progress_percentage: baseData.annual_billing_goal > 0
                ? (periodIncome / baseData.annual_billing_goal) * 100
                : 0,
            gap_to_goal: Math.max(0, baseData.annual_billing_goal - periodIncome),
            estimated_puntas_needed: baseData.average_ticket_target > 0 && baseData.average_commission_target > 0
                ? Math.ceil(Math.max(0, baseData.annual_billing_goal - periodIncome) / (baseData.average_ticket_target * (baseData.average_commission_target / 100)))
                : 0,
        };

        return { success: true, data: periodData };
    } catch (err: any) {
        console.error('Error in getAgentProgressAction:', err);
        return { success: false, error: err.message };
    }
}


/**
 * Obtener resumen de objetivos del equipo (Admin/Broker access)
 */
export async function getTeamObjectivesSummaryAction(year: number, organizationId?: string, startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
        if (!profile) return { success: false, error: 'Perfil no encontrado' };

        const userProfile = profile as { role: string; organization_id: string };
        const isGod = userProfile.role === 'god';

        // Si no es God, solo puede ver su propia organización
        const targetOrgId = isGod ? organizationId : userProfile.organization_id;

        const adminClient = createAdminClient();

        // Siempre obtener transacciones para métricas operacionales
        const txSelect = 'agent_id, gross_commission, net_commission, master_commission_amount, office_commission_amount, actual_price, sides, status, organization_id, transaction_date';

        let summaryQuery = (adminClient.from('view_team_objectives_summary') as any).select('*').eq('year', year);
        if (targetOrgId && targetOrgId !== 'all') {
            summaryQuery = summaryQuery.eq('organization_id', targetOrgId);
        }

        let txnQuery = (adminClient.from('transactions') as any).select(txSelect);
        if (startDate && endDate) {
            txnQuery = txnQuery.gte('transaction_date', startDate).lte('transaction_date', endDate);
        } else {
            txnQuery = txnQuery.gte('transaction_date', `${year}-01-01`).lte('transaction_date', `${year}-12-31`);
        }
        if (targetOrgId && targetOrgId !== 'all') {
            txnQuery = txnQuery.eq('organization_id', targetOrgId);
        }

        const [summaryResult, txnResult] = await Promise.all([summaryQuery, txnQuery]);
        if (summaryResult.error) throw summaryResult.error;
        if (txnResult.error) throw txnResult.error;

        const baseSummaries = (summaryResult.data || []) as any[];
        const txns = (txnResult.data || []) as { agent_id: string; gross_commission: number; net_commission: number; master_commission_amount: number; office_commission_amount: number; actual_price: number; sides: number; status: string; organization_id: string; transaction_date: string }[];

        // Helper para calcular métricas operacionales de un set de transacciones
        const calcOperational = (orgTxns: typeof txns) => {
            const nonCancelled = orgTxns.filter(t => t.status !== 'cancelled');
            const completed = orgTxns.filter(t => t.status === 'completed');
            const pending = orgTxns.filter(t => t.status === 'pending');

            return {
                totalIncome: nonCancelled.reduce((s, t) => s + Number(t.gross_commission || 0), 0),
                completedIncome: completed.reduce((s, t) => s + Number(t.gross_commission || 0), 0),
                reservedIncome: pending.reduce((s, t) => s + Number(t.gross_commission || 0), 0),
                nonCancelledCount: nonCancelled.length,
                completedCount: completed.length,
                pendingCount: pending.length,
                // Métricas operacionales
                total_sales_volume: nonCancelled.reduce((s, t) => s + Number(t.actual_price || 0), 0),
                total_operations_count: nonCancelled.length,
                total_double_sided_count: nonCancelled.filter(t => t.sides === 2).length,
                total_single_sided_count: nonCancelled.filter(t => t.sides === 1).length,
                total_net_income: nonCancelled.reduce((s, t) => s + Number(t.net_commission || 0), 0),
                total_master_income: nonCancelled.reduce((s, t) => s + Number(t.master_commission_amount || 0), 0),
                total_office_income: nonCancelled.reduce((s, t) => s + Number(t.office_commission_amount || 0), 0),
                total_completed_volume: completed.reduce((s, t) => s + Number(t.actual_price || 0), 0),
                total_reserved_volume: pending.reduce((s, t) => s + Number(t.actual_price || 0), 0),
            };
        };

        return {
            success: true,
            data: baseSummaries.map((summary: any) => {
                const orgTxns = summary.organization_id
                    ? txns.filter(t => t.organization_id === summary.organization_id)
                    : txns;

                const ops = calcOperational(orgTxns);

                const result: any = {
                    ...summary,
                    // Métricas operacionales
                    total_sales_volume: ops.total_sales_volume,
                    total_operations_count: ops.total_operations_count,
                    total_double_sided_count: ops.total_double_sided_count,
                    total_single_sided_count: ops.total_single_sided_count,
                    total_net_income: ops.total_net_income,
                    total_master_income: ops.total_master_income,
                    total_office_income: ops.total_office_income,
                    total_completed_volume: ops.total_completed_volume,
                    total_reserved_volume: ops.total_reserved_volume,
                };

                // Recalcular métricas financieras si hay filtro de período
                if (startDate && endDate) {
                    result.total_team_income = ops.totalIncome;
                    result.total_completed_income = ops.completedIncome;
                    result.total_reserved_income = ops.reservedIncome;
                    result.total_puntas_closed = ops.nonCancelledCount;
                    result.total_completed_puntas = ops.completedCount;
                    result.total_reserved_puntas = ops.pendingCount;
                    result.avg_progress = summary.total_team_goal > 0
                        ? (ops.totalIncome / summary.total_team_goal) * 100
                        : 0;
                }

                return result;
            }),
        };
    } catch (err: any) {
        console.error('Error in getTeamObjectivesSummaryAction:', err);
        return { success: false, error: err.message };
    }
}
