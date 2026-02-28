'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/features/admin/actions/adminActions';
import type { Person, RelationshipRole, RelationshipStatus, CommunicationChannel, LifecycleStatus, PersonHistoryEventType, PersonHistoryEvent } from '@/features/clients/types';
import { toTitleCase } from '@/features/clients/utils/clientUtils';

import { personSchema } from '../schemas/personSchema';

const normalizeTags = (tags: string[]): string[] => {
    return Array.from(new Set(
        tags
            .map(t => toTitleCase(t.trim()))
            .filter(Boolean)
    ));
};

/**
 * Helper privado para registrar eventos en el historial de la persona.
 */
async function recordPersonEvent(params: {
    personId: string;
    eventType: PersonHistoryEventType;
    agentId?: string | null;
    fieldName?: string;
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: Record<string, any>;
}): Promise<void> {
    try {
        const supabase = await createClient();
        const { error } = await (supabase as any)
            .from('person_history')
            .insert({
                person_id: params.personId,
                event_type: params.eventType,
                agent_id: params.agentId,
                field_name: params.fieldName,
                old_value: params.oldValue,
                new_value: params.newValue,
                metadata: params.metadata || {}
            });

        if (error) {
            console.error('Error recording person event:', error);
        }
    } catch (err) {
        console.error('Failed to record person event:', err);
    }
}

/**
 * Busca personas por coincidencia parcial en nombre, teléfono o email.
 */
export async function searchPersonsAction(query: string): Promise<ActionResult<Person[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        // El RLS se encargará de filtrar por org/agent basado en el usuario logueado
        let sqlQuery = supabase
            .from('persons')
            .select('*');

        if (query) {
            sqlQuery = sqlQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
        }

        const { data, error } = await sqlQuery.limit(10);
        if (error) throw error;

        return { success: true, data: data as Person[] };
    } catch (err) {
        console.error('Error in searchPersonsAction:', err);
        return { success: false, error: 'Error al buscar personas' };
    }
}

/**
 * Crea una nueva persona en la base de relaciones.
 */
export async function createPersonAction(formData: z.infer<typeof personSchema>): Promise<ActionResult<Person>> {
    try {
        const validatedData = personSchema.parse(formData);
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data: profile } = await supabase
            .from('profiles' as any)
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile) return { success: false, error: 'Perfil no encontrado' };

        // Lógica de organización y agente (respetando permisos)
        let targetOrgId = (profile as any).organization_id;
        let targetAgentId = user.id;

        if (((profile as any).role === 'god' || (profile as any).role === 'parent') && validatedData.agentId) {
            targetAgentId = validatedData.agentId;
        }
        if ((profile as any).role === 'god' && validatedData.organizationId) {
            targetOrgId = validatedData.organizationId;
        }

        const { data, error } = await supabase
            .from('persons' as any)
            .insert({
                organization_id: targetOrgId,
                agent_id: targetAgentId,
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                dni_cuil: validatedData.dniCuil || null,
                birthday: validatedData.birthday || null,
                family_composition: validatedData.familyComposition || null,
                family_notes: validatedData.familyNotes || null,
                occupation_company: validatedData.occupationCompany || null,
                interests_hobbies: validatedData.interestsHobbies || null,
                personality_notes: validatedData.personalityNotes || null,
                contact_type: validatedData.contactType,
                source: validatedData.source || null,
                referred_by_id: validatedData.referredById || null,
                influence_level: validatedData.influenceLevel,
                preferred_channel: validatedData.preferredChannel || null,
                best_contact_time: validatedData.bestContactTime || null,
                relationship_status: validatedData.relationshipStatus,
                lifecycle_status: validatedData.lifecycleStatus,
                lost_reason: validatedData.lostReason || null,
                next_action_at: validatedData.nextActionAt || null,
                tags: normalizeTags(validatedData.tags),
                observations: validatedData.observations || null,
            } as any)
            .select()
            .single();

        if (error) throw error;

        // Registrar evento de creación
        await recordPersonEvent({
            personId: (data as any).id,
            eventType: 'creation',
            agentId: user.id,
            metadata: {
                initial_status: validatedData.relationshipStatus,
                initial_lifecycle: validatedData.lifecycleStatus
            }
        });

        revalidatePath('/dashboard/crm');
        return { success: true, data: (data as unknown) as Person };
    } catch (err) {
        console.error('Error in createPersonAction:', err);
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        return { success: false, error: 'Error al crear la persona' };
    }
}

/**
 * Actualiza una persona existente.
 */
export async function updatePersonAction(id: string, formData: Partial<z.infer<typeof personSchema>>): Promise<ActionResult<Person>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        // Mapear campos de camelCase a snake_case para la DB
        const dbData: any = {};
        if (formData.firstName) dbData.first_name = formData.firstName;
        if (formData.lastName) dbData.last_name = formData.lastName;
        if (formData.email !== undefined) dbData.email = formData.email || null;
        if (formData.phone !== undefined) dbData.phone = formData.phone || null;
        if (formData.dniCuil !== undefined) dbData.dni_cuil = formData.dniCuil || null;
        if (formData.birthday !== undefined) dbData.birthday = formData.birthday || null;

        if (formData.familyComposition !== undefined) dbData.family_composition = formData.familyComposition || null;
        if ((formData as any).familyNotes !== undefined) dbData.family_notes = (formData as any).familyNotes || null;
        if (formData.occupationCompany !== undefined) dbData.occupation_company = formData.occupationCompany || null;
        if (formData.interestsHobbies !== undefined) dbData.interests_hobbies = formData.interestsHobbies || null;
        if (formData.personalityNotes !== undefined) dbData.personality_notes = formData.personalityNotes || null;

        if (formData.contactType) dbData.contact_type = formData.contactType;
        if (formData.source !== undefined) dbData.source = formData.source || null;
        if (formData.referredById !== undefined) dbData.referred_by_id = formData.referredById || null;
        if (formData.influenceLevel) dbData.influence_level = formData.influenceLevel;

        if (formData.preferredChannel !== undefined) dbData.preferred_channel = formData.preferredChannel || null;
        if (formData.bestContactTime !== undefined) dbData.best_contact_time = formData.bestContactTime || null;

        if (formData.relationshipStatus) dbData.relationship_status = formData.relationshipStatus;
        if (formData.lifecycleStatus) dbData.lifecycle_status = formData.lifecycleStatus;
        if (formData.lostReason !== undefined) dbData.lost_reason = formData.lostReason || null;
        if (formData.nextActionAt !== undefined) dbData.next_action_at = formData.nextActionAt || null;
        if (formData.lastInteractionAt !== undefined) dbData.last_interaction_at = formData.lastInteractionAt || null;
        if (formData.tags) dbData.tags = normalizeTags(formData.tags);
        if (formData.observations !== undefined) dbData.observations = formData.observations || null;
        if (formData.agentId) dbData.agent_id = formData.agentId;

        const { data, error } = await (supabase as any)
            .from('persons')
            .update(dbData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Registrar cambios significativos
        if (formData.relationshipStatus) {
            await recordPersonEvent({
                personId: id,
                eventType: 'status_change',
                agentId: user.id,
                fieldName: 'relationship_status',
                newValue: formData.relationshipStatus,
            });
        }

        if (formData.lifecycleStatus) {
            await recordPersonEvent({
                personId: id,
                eventType: 'lifecycle_change',
                agentId: user.id,
                fieldName: 'lifecycle_status',
                newValue: formData.lifecycleStatus,
                metadata: { lost_reason: formData.lostReason }
            });
        }

        // Registrar evento de edición general si hubo cambios y no son solo estados
        const genericFields = ['firstName', 'lastName', 'email', 'phone', 'dniCuil', 'birthday', 'occupationCompany', 'familyComposition', 'tags', 'observations'];
        const hasGenericChanges = genericFields.some(field => (formData as any)[field] !== undefined);

        if (hasGenericChanges && !formData.relationshipStatus && !formData.lifecycleStatus) {
            await recordPersonEvent({
                personId: id,
                eventType: 'edit',
                agentId: user.id
            });
        }

        revalidatePath('/dashboard/crm');
        return { success: true, data: (data as unknown) as Person };
    } catch (err) {
        console.error('Error in updatePersonAction:', err);
        return { success: false, error: 'Error al actualizar la persona' };
    }
}

/**
 * Registra un contacto inmediato (actualiza el semáforo).
 */
export async function touchPersonAction(id: string): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { error } = await (supabase as any)
            .from('persons')
            .update({ last_interaction_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Registrar evento de contacto
        await recordPersonEvent({
            personId: id,
            eventType: 'contact',
            agentId: user.id,
            metadata: { type: 'quick_touch' }
        });

        revalidatePath('/dashboard/crm');
        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error in touchPersonAction:', err);
        return { success: false, error: 'Error al actualizar el contacto' };
    }
}

/**
 * Obtiene todas las personas con filtros avanzados.
 */
/**
 * Obtiene todas las personas con filtros avanzados.
 */
export async function getPersonsAction(filters: {
    relationshipStatus?: string[];
    tags?: string[];
    search?: string;
    organizationId?: string;
    agentId?: string[];
    healthScore?: string;
    influenceLevel?: number[];
    contactType?: string[];
    source?: string[];
    referredById?: string[];
    lifecycleStatus?: LifecycleStatus[];
} = {}): Promise<ActionResult<Person[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        // Incluimos el JOIN con profiles y con la propia tabla persons (para el referidor)
        let query = supabase
            .from('persons' as any)
            .select(`
                *,
                agent:profiles!persons_agent_id_fkey (
                    first_name,
                    last_name
                ),
                referred_by:referred_by_id (
                    id,
                    first_name,
                    last_name
                )
            `)
            .order('last_interaction_at', { ascending: false, nullsFirst: false });

        // --- Filtros Básicos ---

        // Estado Proceso (Array de strings)
        if (filters.relationshipStatus && filters.relationshipStatus.length > 0) {
            query = query.in('relationship_status', filters.relationshipStatus);
        }

        // Estado Lead / Lifecycle (Array de strings)
        // Por defecto: 'active' y 'following_up' si no se especifica nada
        if (filters.lifecycleStatus && filters.lifecycleStatus.length > 0) {
            query = query.in('lifecycle_status', filters.lifecycleStatus);
        } else {
            // Si no hay filtro explícito, ocultamos los 'lost' por defecto
            query = query.in('lifecycle_status', ['active', 'following_up']);
        }

        // Search
        if (filters.search) {
            query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        }

        // --- Filtros de Visibilidad ---

        if (filters.organizationId && filters.organizationId !== 'all') {
            query = query.eq('organization_id', filters.organizationId);
        }

        // Agent (Array de strings)
        if (filters.agentId && filters.agentId.length > 0) {
            const agentIds = filters.agentId
                .filter(id => id !== 'all')
                .map(id => id === 'me' ? user.id : id);

            if (agentIds.length > 0) {
                query = query.in('agent_id', agentIds);
            }
        }

        // --- Filtros Avanzados (Multi-Opción) ---

        // Tags: Usamos contains para filtrar si tiene AL MENOS una de las etiquetas (OR logic simulado con overlaps)
        // PostgreSQL array operator && (overlaps) es lo ideal. Supabase filter: .overlaps('tags', ['a', 'b'])
        if (filters.tags && filters.tags.length > 0) {
            query = query.overlaps('tags', filters.tags);
        }

        // Nivel de Influencia (Array de números)
        if (filters.influenceLevel && filters.influenceLevel.length > 0) {
            query = query.in('influence_level', filters.influenceLevel);
        }

        // Tipo de Contacto (Array de strings)
        if (filters.contactType && filters.contactType.length > 0) {
            query = query.in('contact_type', filters.contactType);
        }

        // Fuente (Array de strings)
        if (filters.source && filters.source.length > 0) {
            query = query.in('source', filters.source);
        }

        // Referidor (Array de IDs)
        if (filters.referredById && filters.referredById.length > 0) {
            query = query.in('referred_by_id', filters.referredById);
        }

        // Semáforo (HealthScore)
        if (filters.healthScore && filters.healthScore !== 'all') {
            const now = new Date();
            const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
            const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString();

            if (filters.healthScore === 'fuerte') {
                query = query.gte('last_interaction_at', fifteenDaysAgo);
            } else if (filters.healthScore === 'riesgo') {
                query = query.lt('last_interaction_at', fifteenDaysAgo).gte('last_interaction_at', fortyFiveDaysAgo);
            } else if (filters.healthScore === 'critico') {
                query = query.lt('last_interaction_at', fortyFiveDaysAgo);
            } else if (filters.healthScore === 'sin_contacto') {
                query = query.is('last_interaction_at', null);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        return { success: true, data: (data as unknown) as Person[] };
    } catch (err) {
        console.error('Error in getPersonsAction:', err);
        return { success: false, error: 'Error al obtener personas' };
    }
}

/**
 * Obtiene todas las etiquetas únicas asociadas a personas (Atributos CRM).
 */
export async function getExistingTagsAction(): Promise<ActionResult<string[]>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('persons')
            .select('tags');

        if (error) throw error;

        const allTags = data.flatMap((p: any) => p.tags || []);
        const uniqueTags = Array.from(new Set(allTags)).sort();

        return { success: true, data: uniqueTags };
    } catch (err) {
        console.error('Error in getExistingTagsAction:', err);
        return { success: false, error: 'Error al obtener etiquetas CRM' };
    }
}

/**
 * Obtiene todas las etiquetas únicas asociadas a búsquedas (Criterios de búsqueda).
 */
export async function getExistingSearchTagsAction(): Promise<ActionResult<string[]>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('person_searches')
            .select('tags');

        if (error) throw error;

        const allTags = data.flatMap((p: any) => p.tags || []);
        const uniqueTags = Array.from(new Set(allTags)).sort();

        return { success: true, data: uniqueTags };
    } catch (err) {
        console.error('Error in getExistingSearchTagsAction:', err);
        return { success: false, error: 'Error al obtener etiquetas de búsqueda' };
    }
}

/**
 * Obtiene todas las fuentes únicas usadas (para el filtro).
 */
export async function getExistingSourcesAction(): Promise<ActionResult<string[]>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('persons')
            .select('source');

        if (error) throw error;

        // Filtrar nulos y obtener únicos
        const allSources = data.map((p: any) => p.source).filter(Boolean);
        const uniqueSources = Array.from(new Set(allSources)).sort();

        return { success: true, data: uniqueSources };
    } catch (err) {
        console.error('Error in getExistingSourcesAction:', err);
        return { success: false, error: 'Error al obtener fuentes' };
    }
}

/**
 * Obtiene la lista de agentes disponibles para filtrar (solo para roles God/Parent).
 */
export async function getCRMAgentsAction(): Promise<ActionResult<{ id: string, first_name: string, last_name: string }[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        // Obtenemos el perfil del usuario actual
        const { data: profile } = await supabase
            .from('profiles' as any)
            .select('organization_id, role')
            .eq('id', user.id)
            .single() as any;

        if (!profile) return { success: false, error: 'Perfil no encontrado' };

        let query = supabase
            .from('profiles' as any)
            .select('id, first_name, last_name')
            .order('first_name', { ascending: true });

        // Si es God, puede ver todos. Si es Parent, solo su organización.
        if (profile.role === 'parent') {
            query = query.eq('organization_id', profile.organization_id);
        } else if (profile.role !== 'god') {
            // Un Child no debería llamar a esto, pero si lo hace, solo se ve a sí mismo
            query = query.eq('id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { success: true, data: data as any };
    } catch (err) {
        console.error('Error in getCRMAgentsAction:', err);
        return { success: false, error: 'Error al obtener agentes' };
    }
}

/**
 * Obtiene las personas con las que se interactuó recientemente.
 */
export async function getRecentPersonsAction(): Promise<ActionResult<Person[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data, error } = await supabase
            .from('persons')
            .select('*')
            .order('last_interaction_at', { ascending: false, nullsFirst: false })
            .limit(3);

        if (error) throw error;

        return { success: true, data: (data as unknown) as Person[] };
    } catch (err) {
        console.error('Error in getRecentPersonsAction:', err);
        return { success: false, error: 'Error al obtener contactos recientes' };
    }
}
/**
 * Obtiene una persona por su ID.
 */
export async function getPersonByIdAction(id: string): Promise<ActionResult<Person>> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('persons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return { success: true, data: (data as unknown) as Person };
    } catch (err) {
        console.error('Error in getPersonByIdAction:', err);
        return { success: false, error: 'Error al obtener la persona' };
    }
}

/**
 * Actualiza el estado de disposición (lifecycle) de una persona de forma rápida.
 */
export async function updatePersonLifecycleStatusAction(
    id: string,
    status: LifecycleStatus,
    lostReason?: string | null
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const dbData: any = {
            lifecycle_status: status,
            updated_at: new Date().toISOString()
        };

        if (status === 'lost') {
            dbData.lost_reason = lostReason || null;
        } else {
            dbData.lost_reason = null;
        }

        const { error } = await (supabase as any)
            .from('persons')
            .update(dbData)
            .eq('id', id);

        if (error) throw error;

        // Registro de historial específico para cambio de disposición
        await recordPersonEvent({
            personId: id,
            eventType: 'lifecycle_change',
            agentId: user.id,
            fieldName: 'lifecycle_status',
            newValue: status,
            metadata: { lost_reason: lostReason }
        });

        revalidatePath('/dashboard/crm');
        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error in updatePersonLifecycleStatusAction:', err);
        return { success: false, error: 'Error al actualizar el estado del lead' };
    }
}
/**
 * Obtiene el historial (línea de tiempo) de una persona.
 */
export async function getPersonHistoryAction(personId: string): Promise<ActionResult<PersonHistoryEvent[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data, error } = await (supabase as any)
            .from('person_history')
            .select(`
                *,
                agent:profiles!person_history_agent_id_fkey (
                    first_name,
                    last_name
                )
            `)
            .eq('person_id', personId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data as PersonHistoryEvent[] };
    } catch (err) {
        console.error('Error in getPersonHistoryAction:', err);
        return { success: false, error: 'Error al obtener el historial' };
    }
}

/**
 * Elimina una persona de la base de relaciones.
 */
export async function deletePersonAction(id: string): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        // El borrado en cascada debería encargarse del historial si está configurado en DB,
        // de lo contrario habría que borrarlo manualmente aquí.
        // Dado que es un CRM, a veces preferimos un "soft delete", pero por el pedido del usuario
        // procederemos con un borrado físico.

        const { error } = await supabase
            .from('persons')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/dashboard/crm');
        return { success: true, data: undefined };
    } catch (err) {
        console.error('Error in deletePersonAction:', err);
        return { success: false, error: 'Error al eliminar la relación' };
    }
}

/**
 * Obtiene el historial de visitas acumulativas de una persona.
 * Filtra solo los eventos de tipo 'visit_record' del person_history.
 */
export async function getPersonVisitHistoryAction(personId: string): Promise<ActionResult<PersonHistoryEvent[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autorizado' };

        const { data, error } = await (supabase as any)
            .from('person_history')
            .select(`
                id,
                person_id,
                event_type,
                field_name,
                old_value,
                new_value,
                metadata,
                created_at,
                agent_id,
                agent:profiles!person_history_agent_id_fkey (
                    first_name,
                    last_name
                )
            `)
            .eq('person_id', personId)
            .eq('event_type', 'visit_record')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: (data || []) as PersonHistoryEvent[] };
    } catch (err) {
        console.error('Error in getPersonVisitHistoryAction:', err);
        return { success: false, error: 'Error al obtener historial de visitas' };
    }
}
