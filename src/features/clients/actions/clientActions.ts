'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/features/admin/actions/adminActions';
import type { Client, AnonymousClient, ClientWithAgent } from '../types';

const clientSchema = z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(6, 'Teléfono inválido').optional().or(z.literal('')),
    type: z.enum(['buyer', 'seller']),
    status: z.enum(['active', 'inactive', 'closed', 'archived']).default('active'),
    source: z.enum(['referral', 'portal', 'social', 'walk-in']).default('referral'),
    motivation: z.string().optional(),
    budgetMin: z.coerce.number().min(0).default(0),
    budgetMax: z.coerce.number().min(0).default(0),
    preferredZones: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    preferences: z.any().optional(),
    searchPropertyTypes: z.array(z.string()).default([]),
    searchBedrooms: z.array(z.string()).default([]),
    searchPaymentMethods: z.array(z.string()).default([]),
    organizationId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
});

const updateClientSchema = clientSchema.partial().extend({ id: z.string().uuid() });

/**
 * Crea un nuevo cliente con lógica Anti-Conflicto.
 */
export async function createClientAction(
    formData: z.infer<typeof clientSchema>
): Promise<ActionResult<Client>> {
    try {
        const validatedData = clientSchema.parse(formData);
        const supabase = await createClient();

        // 1. Obtener sesión y perfil
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, first_name, last_name, role')
            .eq('id', user.id)
            .single();

        if (!profile) return { success: false, error: 'Perfil no encontrado' };

        const isGodOrParent = (profile as any).role === 'god' || (profile as any).role === 'parent';
        const isGod = (profile as any).role === 'god';

        // Determinar org y agent a usar basado en permisos
        let targetOrgId = (profile as any).organization_id;
        let targetAgentId = user.id;

        if (isGodOrParent && validatedData.agentId) {
            targetAgentId = validatedData.agentId;
        }
        if (isGod && validatedData.organizationId) {
            targetOrgId = validatedData.organizationId;
        }

        // Validar que el agente pertenece a la organización
        if (targetAgentId !== user.id) {
            const { data: targetAgent } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', targetAgentId)
                .single();

            if (!targetAgent || (targetAgent as any).organization_id !== targetOrgId) {
                return { success: false, error: 'El agente no pertenece a la organización seleccionada' };
            }
        }

        const organization_id = targetOrgId;

        // 2. Lógica de Duplicados: Buscar clientes ACTIVOS en la misma organización
        const normalizedPhone = validatedData.phone ? validatedData.phone.replace(/[^\d+]/g, '') : null;
        if (normalizedPhone || validatedData.email) {
            const query = supabase
                .from('clients' as any)
                .select('agent_id, status, profiles!clients_agent_id_fkey(first_name, last_name)' as any)
                .eq('organization_id', organization_id)
                .eq('status', 'active'); // Solo nos importan los registros activos

            const filters = [];
            if (normalizedPhone) filters.push(`phone.eq.${normalizedPhone}`);
            if (validatedData.email) filters.push(`email.eq.${validatedData.email}`);

            query.or(filters.join(','));

            const { data: existingClient } = await (query.maybeSingle() as any);

            if (existingClient) {
                const owner = (existingClient as any).profiles;
                const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : 'otro agente';
                return {
                    success: false,
                    error: `Cliente Registrado: Este cliente ya está siendo atendido por ${ownerName}. ¡Contacta a tu colega para trabajar en equipo y cerrar esta venta juntos!`
                };
            }
        }

        // 3. Insertar el nuevo cliente
        const { data, error } = await supabase
            .from('clients' as any)
            .insert({
                organization_id: organization_id,
                agent_id: targetAgentId,
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                email: validatedData.email || null,
                phone: validatedData.phone ? validatedData.phone.replace(/[^\d+]/g, '') : null,
                type: validatedData.type,
                status: validatedData.status,
                source: validatedData.source,
                motivation: validatedData.motivation || null,
                budget_min: validatedData.budgetMin,
                budget_max: validatedData.budgetMax,
                preferred_zones: validatedData.preferredZones,
                tags: validatedData.tags,
                search_property_types: validatedData.searchPropertyTypes,
                search_bedrooms: validatedData.searchBedrooms,
                search_payment_methods: validatedData.searchPaymentMethods,
                preferences: validatedData.preferences || {},
            } as any)
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/clients');
        return { success: true, data: data as Client };
    } catch (err) {
        console.error('Error in createClientAction:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al crear el cliente' };
    }
}

/**
 * Actualiza un cliente existente.
 */
export async function updateClientAction(
    formData: z.infer<typeof updateClientSchema>
): Promise<ActionResult<Client>> {
    try {
        const validatedData = updateClientSchema.parse(formData);
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        // Obtener rol del usuario
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isGodOrParent = (profile as any)?.role === 'god' || (profile as any)?.role === 'parent';

        // Construir payload de update
        const updatePayload: any = {
            first_name: validatedData.firstName,
            last_name: validatedData.lastName,
            email: validatedData.email || null,
            phone: validatedData.phone ? validatedData.phone.replace(/[^\\d+]/g, '') : null,
            type: validatedData.type,
            status: validatedData.status,
            motivation: validatedData.motivation,
            budget_min: validatedData.budgetMin,
            budget_max: validatedData.budgetMax,
            preferred_zones: validatedData.preferredZones,
            tags: validatedData.tags,
            search_property_types: validatedData.searchPropertyTypes,
            search_bedrooms: validatedData.searchBedrooms,
            search_payment_methods: validatedData.searchPaymentMethods,
        };

        // Solo God/Parent puede reasignar agente
        if (isGodOrParent && validatedData.agentId) {
            updatePayload.agent_id = validatedData.agentId;
        }

        const { data, error } = await (supabase
            .from('clients' as any) as any)
            .update(updatePayload)
            .eq('id', validatedData.id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/clients');
        return { success: true, data: data as Client };
    } catch (err) {
        console.error('Error in updateClientAction:', err);
        return { success: false, error: 'Error al actualizar el cliente' };
    }
}

/**
 * Elimina un cliente.
 */
export async function deleteClientAction(id: string): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/dashboard/clients');
        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error in deleteClientAction:', err);
        return { success: false, error: 'Error al eliminar el cliente' };
    }
}

import { applyPrivacyPolicy, type UserProfile } from '../utils/privacy';

/**
 * Helper interno para obtener el perfil del usuario actual de forma robusta.
 */
async function getCurrentUserProfile(supabase: any, userId: string): Promise<UserProfile | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, organization_id')
        .eq('id', userId)
        .single();

    if (error || !profile) return null;
    return profile as UserProfile;
}

/**
 * Obtiene los clientes con soporte para paginación y visibilidad jerárquica.
 */
export async function getClientsAction(
    filters?: {
        type?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
        agentId?: string;
        organizationId?: string;
    }
): Promise<ActionResult<{ clients: any[], total: number }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const profile = await getCurrentUserProfile(supabase, user.id);
        if (!profile) return { success: false, error: 'Perfil de usuario no encontrado' };

        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('clients')
            .select('*, agent:profiles(id, first_name, last_name, phone, reports_to_organization_id)', { count: 'exact' });

        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.agentId && filters.agentId !== 'all') query = query.eq('agent_id', filters.agentId);
        if (filters?.organizationId && filters.organizationId !== 'all') query = query.eq('organization_id', filters.organizationId);

        if (filters?.search) {
            query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Aplicar política de privacidad robusta
        const processedClients = (data || []).map(client =>
            applyPrivacyPolicy(client, profile, user.id)
        );

        return {
            success: true,
            data: {
                clients: processedClients,
                total: count || 0
            }
        };
    } catch (err) {
        console.error('Error fetching clients:', err);
        return { success: false, error: 'Error al obtener clientes' };
    }
}

/**
 * Obtiene los clientes de la red con visibilidad jerárquica robusta.
 * Estándar REMAX: Los datos sensibles se filtran en el servidor, no en el cliente.
 */
export async function getNetworkClientsAction(filters?: { organizationId?: string }): Promise<ActionResult<any[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const profile = await getCurrentUserProfile(supabase, user.id);
        if (!profile) return { success: false, error: 'Perfil de usuario no encontrado' };

        const isGod = profile.role === 'god';
        const isParent = profile.role === 'parent';

        let query;

        if (isGod) {
            // DIOS: Visibilidad absoluta sobre la tabla maestra
            query = supabase
                .from('clients')
                .select(`
                    *,
                    organization:organizations(name),
                    agent:profiles(id, first_name, last_name, phone, reports_to_organization_id)
                `)
                .neq('agent_id', user.id);
        } else if (isParent) {
            // PADRE: Ve su oficina con PII y el resto anónimo
            // Usamos una consulta que traiga los datos necesarios para que applyPrivacyPolicy decida
            query = supabase
                .from('clients')
                .select(`
                    *,
                    organization:organizations(name),
                    agent:profiles(id, first_name, last_name, phone, reports_to_organization_id)
                `)
                .neq('agent_id', user.id);
        } else {
            // HIJO: Solo ve la red anónima
            query = supabase
                .from('view_anonymous_clients')
                .select('*')
                .neq('agent_id', user.id);
        }

        if (filters?.organizationId && filters.organizationId !== 'all') {
            query = (query as any).eq('organization_id', filters.organizationId);
        }

        const { data, error } = await (query as any).order('created_at', { ascending: false });
        if (error) throw error;

        // Mapeo defensivo y aplicación de política de privacidad
        const processed = (data || []).map((c: any) => {
            const clientData = {
                ...c,
                // Priorizar display_name de la vista anónima para evitar fugas
                first_name: c.display_name || c.first_name || 'Cliente',
                last_name: c.display_name ? '' : (c.last_name || ''),
                organization_name: c.organization?.name || c.organization_name || 'Inmobiliaria',
                agent_name: c.agent ? `${c.agent.first_name || ''} ${c.agent.last_name || ''}`.trim() : (c.agent_name || 'Agente'),
                agent_phone: c.agent?.phone || c.agent_phone || null
            };
            return applyPrivacyPolicy(clientData, profile, user.id);
        });

        return { success: true, data: processed };
    } catch (err) {
        console.error('Error fetching network clients:', err);
        return { success: false, error: 'Error al obtener clientes de la red' };
    }
}

/**
 * Agrega una nota o interacción a un cliente.
 */
export async function addClientInteractionAction(
    clientId: string,
    type: 'nota' | 'propiedad_enviada' | 'llamada' | 'whatsapp' | 'email' | 'otro',
    content: string
): Promise<ActionResult<any>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data, error } = await (supabase
            .from('client_interactions' as any)
            .insert({
                client_id: clientId,
                agent_id: user.id,
                type,
                content
            } as any) as any)
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/clients');
        return { success: true, data };
    } catch (err) {
        console.error('Error in addClientInteractionAction:', err);
        return { success: false, error: 'Error al agregar la nota' };
    }
}

/**
 * Obtiene el historial de interacciones de un cliente.
 */
export async function getClientInteractionsAction(clientId: string): Promise<ActionResult<any[]>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('client_interactions')
            .select('*, agent:profiles(first_name, last_name)')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('Error in getClientInteractionsAction:', err);
        return { success: false, error: 'Error al obtener el historial' };
    }
}
