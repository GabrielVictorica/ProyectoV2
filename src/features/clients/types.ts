export type ClientType = 'buyer' | 'seller';
export type ClientStatus = 'active' | 'inactive' | 'closed' | 'archived';
export type ClientSource = 'referral' | 'portal' | 'social' | 'walk-in';

export interface Client {
    id: string;
    organization_id: string;
    agent_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    type: ClientType;
    status: ClientStatus;
    source: ClientSource;
    motivation: string | null;
    budget_min: number;
    budget_max: number;
    preferred_zones: string[];
    tags: string[];
    search_property_types: string[]; // UUIDs
    search_bedrooms: string[];
    search_payment_methods: string[];
    person_id?: string | null;
    last_interaction_at: string;
    created_at: string;
    updated_at: string;
}

export interface AnonymousClient {
    id: string;
    organization_id: string;
    agent_id: string;
    type: ClientType;
    status: ClientStatus;
    budget_min: number;
    budget_max: number;
    preferred_zones: string[];
    search_property_types: string[];
    search_bedrooms: string[];
    search_payment_methods: string[];
    motivation: string | null;
    created_at: string;
    anonymous_label: string;

    // Campos de visibilidad jerárquica (pueden ser PII o anonimizados)
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    source?: ClientSource;
    last_interaction_at?: string;
    updated_at?: string;
    person_id?: string | null;

    // Metadatos de la Red
    agent_name?: string;
    agent_phone?: string;
    organization_name?: string;
}

export type ClientWithAgent = Client & {
    agent: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        reports_to_organization_id: string | null;
    } | null;
    person?: {
        id: string;
        first_name: string;
        last_name: string;
        tags: string[];
        relationship_status: string;
    } | null;
    is_anonymous?: boolean; // Agregado por el server action strip_pii
};

// --- CRM Módulo de Relaciones (Nuevos Tipos) ---

export type RelationshipRole =
    | 'comprador'
    | 'vendedor'
    | 'inquilino'
    | 'colega'
    | 'referente'
    | 'familiar'
    | 'amigo'
    | 'conocido'
    | 'socio'
    | 'otro';
export type RelationshipStatus =
    | 'contacto_telefonico'
    | 'reunion_verde'
    | 'pre_listing'
    | 'pre_buying'
    | 'acm'
    | 'captacion'
    | 'visita'
    | 'reserva'
    | 'cierre'
    | 'referido'
    | 'prospecto' // Legacy
    | 'cliente activo' // Legacy
    | 'ex-cliente' // Legacy
    | 'socio'; // Legacy
export type LifecycleStatus = 'active' | 'following_up' | 'lost';
export type CommunicationChannel = 'WhatsApp' | 'Llamada' | 'Email' | 'LinkedIn';

export interface Person {
    id: string;
    organization_id: string;
    agent_id: string;

    // Identidad
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    dni_cuil: string | null;
    birthday: string | null;

    // Perfil Humano
    family_composition: string | null;
    family_notes: string | null;
    occupation_company: string | null;
    interests_hobbies: string | null;
    personality_notes: string | null;

    // Relacional
    contact_type: RelationshipRole[];
    source: string | null;
    referred_by_id: string | null;
    influence_level: number | null; // 1-5

    // Comunicación
    preferred_channel: CommunicationChannel | null;
    best_contact_time: string | null;


    // Gestión
    relationship_status: RelationshipStatus;
    lifecycle_status: LifecycleStatus;
    lost_reason: string | null;
    last_interaction_at: string | null;
    next_action_at: string | null;
    tags: string[];
    observations: string | null;

    created_at: string;
    updated_at: string;

    // Relaciones (Opcional para queries con JOIN)
    referred_by?: Person;
    agent?: {
        first_name: string;
        last_name: string;
    } | null;
}

export interface PersonSearch {
    id: string;
    person_id: string;
    organization_id: string;
    agent_id: string;

    search_type: ClientType;
    status: ClientStatus;

    budget_min: number;
    budget_max: number;
    currency: string;

    preferred_zones: string[];
    property_types: string[];
    bedrooms: string[];
    payment_methods: string[];

    motivation: string | null;
    urgency: string | null;
    notes: string | null;

    created_at: string;
    updated_at: string;
}

export interface PersonInteraction {
    id: string;
    person_id: string;
    agent_id: string;
    organization_id: string;

    type: string; // Llamada, Reunión, WhatsApp, Email, Nota
    content: string;

    created_at: string;
}

// --- Historial y Auditoría (Línea de Tiempo) ---

export type PersonHistoryEventType =
    | 'creation'
    | 'edit'
    | 'status_change'
    | 'lifecycle_change'
    | 'note_added'
    | 'contact'
    | 'acm_result'
    | 'visit_record';

export interface PersonHistoryEvent {
    id: string;
    person_id: string;
    agent_id: string | null;
    event_type: PersonHistoryEventType;
    field_name: string | null;
    old_value: string | null;
    new_value: string | null;
    metadata: Record<string, any>;
    created_at: string;

    // Virtual field for UI (joined)
    agent?: {
        first_name: string;
        last_name: string;
    } | null;
}
