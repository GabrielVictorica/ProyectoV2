'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/features/admin/actions/adminActions';
import type { Client, AnonymousClient, ClientWithAgent } from '../types';

const clientSchema = z.object({
    firstName: z.string().optional().default(''),
    lastName: z.string().optional().default(''),
    email: z.string().optional().default(''),
    phone: z.string().optional().default(''),
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
    personId: z.string().uuid('Debes vincular una persona del CRM'),
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

        // 1.1 Si tenemos personId pero no firstName/lastName, los buscamos de la tabla persons
        let firstName = validatedData.firstName;
        let lastName = validatedData.lastName;

        if (validatedData.personId && (!firstName || !lastName)) {
            const { data: person } = await supabase
                .from('persons')
                .select('first_name, last_name')
                .eq('id', validatedData.personId)
                .single();

            if (person) {
                firstName = firstName || person.first_name;
                lastName = lastName || person.last_name;
            }
        }

        // 2. Insertar los criterios de búsqueda en person_searches
        const { data, error } = await supabase
            .from('person_searches' as any)
            .insert({
                organization_id: organization_id,
                agent_id: targetAgentId,
                person_id: validatedData.personId,
                first_name: firstName || '', // Requerido por DB
                last_name: lastName || '',   // Requerido por DB
                search_type: validatedData.type,
                status: validatedData.status,
                source: validatedData.source,
                motivation: validatedData.motivation || null,
                budget_min: validatedData.budgetMin,
                budget_max: validatedData.budgetMax,
                preferred_zones: validatedData.preferredZones,
                property_types: validatedData.searchPropertyTypes,
                bedrooms: validatedData.searchBedrooms,
                payment_methods: validatedData.searchPaymentMethods,
                notes: (validatedData as any).notes || null,
            } as any)
            .select()
            .single();

        if (error) {
            // Manejo de errores de constraint
            if (error.code === '23505') { // Unique violation
                return {
                    success: false,
                    error: 'Esta búsqueda ya existe en la organización.'
                };
            }
            throw error;
        }

        // Side-effect: Actualizar último contacto de la persona vinculada
        if (validatedData.personId) {
            const personUpdateData: any = { last_interaction_at: new Date().toISOString() };
            const { error: syncError } = await supabase
                .from('persons')
                // @ts-ignore — Supabase generated types resolve Update to 'never' for this table
                .update(personUpdateData)
                .eq('id', validatedData.personId);

            if (syncError) {
                console.error('Error syncing person last_interaction_at:', syncError);
            }
        }

        revalidatePath('/dashboard/clients');
        return { success: true, data: data as Client };
    } catch (err) {
        console.error('Error in createClientAction:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al crear la búsqueda' };
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

        // Construir payload de update de forma segura (solo lo definido)
        const updatePayload: any = {};

        if (validatedData.firstName !== undefined) updatePayload.first_name = validatedData.firstName;
        if (validatedData.lastName !== undefined) updatePayload.last_name = validatedData.lastName;
        if (validatedData.email !== undefined) updatePayload.email = validatedData.email || null;
        if (validatedData.phone !== undefined) {
            updatePayload.phone = validatedData.phone ? validatedData.phone.replace(/[^\d+]/g, '') : null;
        }
        if (validatedData.type !== undefined) updatePayload.search_type = validatedData.type;
        if (validatedData.status !== undefined) updatePayload.status = validatedData.status;
        if (validatedData.source !== undefined) updatePayload.source = validatedData.source;
        if (validatedData.motivation !== undefined) updatePayload.motivation = validatedData.motivation;
        if (validatedData.budgetMin !== undefined) updatePayload.budget_min = validatedData.budgetMin;
        if (validatedData.budgetMax !== undefined) updatePayload.budget_max = validatedData.budgetMax;
        if (validatedData.preferredZones !== undefined) updatePayload.preferred_zones = validatedData.preferredZones;
        if (validatedData.searchPropertyTypes !== undefined) updatePayload.property_types = validatedData.searchPropertyTypes;
        if (validatedData.searchBedrooms !== undefined) updatePayload.bedrooms = validatedData.searchBedrooms;
        if (validatedData.searchPaymentMethods !== undefined) updatePayload.payment_methods = validatedData.searchPaymentMethods;
        if (validatedData.personId !== undefined) updatePayload.person_id = validatedData.personId;

        // Solo God/Parent puede reasignar agente
        if (isGodOrParent && validatedData.agentId) {
            updatePayload.agent_id = validatedData.agentId;
        }

        const { data, error } = await (supabase
            .from('person_searches' as any) as any)
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
            .from('person_searches')
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
        propertyTypes?: string[];
        paymentMethods?: string[];
        budgetMin?: number | null;
        budgetMax?: number | null;
        bedrooms?: string[];
        statusFilter?: string[];
        tags?: string[];
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
            .select(`
                *,
                agent:profiles(id, first_name, last_name, phone, reports_to_organization_id),
                person:persons(id, first_name, last_name, tags, relationship_status)
            `, { count: 'exact' });

        const isGod = (profile as any).role === 'god';
        const isParent = (profile as any).role === 'parent';
        const isChild = !isGod && !isParent;

        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.status) query = query.eq('status', filters.status);

        // REGLA DE VISIBILIDAD ESTRICTA:
        // Si es Child, SOLO ve sus propios clientes en esta acción ("Mis Clientes").
        // Si es God/Parent, puede filtrar por agente.
        if (isChild) {
            query = query.eq('agent_id', user.id);
        } else {
            if (filters?.agentId && filters.agentId !== 'all') query = query.eq('agent_id', filters.agentId);
        }

        if (filters?.organizationId && filters.organizationId !== 'all') query = query.eq('organization_id', filters.organizationId);

        if (filters?.search) {
            query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
        }

        // Filtros avanzados de búsqueda
        if (filters?.statusFilter && filters.statusFilter.length > 0) {
            query = query.in('status', filters.statusFilter);
        }

        if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
            query = query.overlaps('search_property_types', filters.propertyTypes);
        }

        if (filters?.paymentMethods && filters.paymentMethods.length > 0) {
            query = query.overlaps('search_payment_methods', filters.paymentMethods);
        }

        if (filters?.budgetMin) {
            query = query.gte('budget_max', filters.budgetMin);
        }

        if (filters?.budgetMax) {
            query = query.lte('budget_min', filters.budgetMax);
        }

        if (filters?.bedrooms && filters.bedrooms.length > 0) {
            query = query.overlaps('search_bedrooms', filters.bedrooms);
        }

        if (filters?.tags && filters.tags.length > 0) {
            query = query.overlaps('tags', filters.tags);
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
export async function getNetworkClientsAction(
    filters?: {
        organizationId?: string,
        page?: number,
        limit?: number
    }
): Promise<ActionResult<{ clients: any[], total: number }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const profile = await getCurrentUserProfile(supabase, user.id);
        if (!profile) return { success: false, error: 'Perfil de usuario no encontrado' };

        const page = filters?.page || 1;
        const limit = filters?.limit || 12;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const isGod = profile.role === 'god';
        const isParent = profile.role === 'parent';

        let query;

        if (isGod) {
            // DIOS: No debería usar esta acción si tiene su propia vista global, pero por si acaso ve todo de todos.
            query = supabase
                .from('clients')
                .select(`
                    *,
                    organization:organizations(name),
                    agent:profiles(id, first_name, last_name, phone, reports_to_organization_id)
                `, { count: 'exact' })
                .neq('agent_id', user.id); // Networking = "Lo que no soy yo"
        } else if (isParent) {
            // PADRE: En "Red" ve clientes de OTRAS organizaciones (Anónimos)
            // Su propia organización la ve en "Mis Clientes" (Oficina)
            query = supabase
                .from('view_anonymous_clients') // Usar vista por seguridad
                .select('*', { count: 'exact' })
                .neq('organization_id', profile.organization_id);
        } else {
            // HIJO: Ve toda la red (incluyendo compañeros) de forma anónima
            // "Mis Clientes" solo muestra los suyos.
            query = supabase
                .from('view_anonymous_clients')
                .select('*', { count: 'exact' })
                .neq('agent_id', user.id);
        }

        if (filters?.organizationId && filters.organizationId !== 'all') {
            query = (query as any).eq('organization_id', filters.organizationId);
        }

        const { data, error, count } = await (query as any)
            .order('created_at', { ascending: false })
            .range(from, to);

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

        return {
            success: true,
            data: {
                clients: processed,
                total: count || 0
            }
        };
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

/**
 * Verifica si una persona tiene búsquedas activas o cerradas (no archivadas).
 */
export async function checkPersonHasSearchAction(
    personId: string,
    type?: 'buyer' | 'seller'
): Promise<ActionResult<{ hasSearch: boolean; searches: Client[] }>> {
    try {
        const supabase = await createClient();
        let query = supabase
            .from('person_searches')
            .select('*')
            .eq('person_id', personId)
            .neq('status', 'archived');

        if (type) {
            query = query.eq('search_type', type);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            success: true,
            data: {
                hasSearch: (data || []).length > 0,
                searches: (data as Client[]) || []
            }
        };
    } catch (err) {
        console.error('Error checking person search:', err);
        return { success: false, error: 'Error al verificar búsquedas' };
    }
}
