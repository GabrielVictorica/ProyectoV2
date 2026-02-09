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
    motivation: string | null; // Agregado para NURC
    created_at: string;
    anonymous_label: string;
    first_name?: string;     // Para visibilidad jerárquica
    last_name?: string;      // Para visibilidad jerárquica
    email?: string | null;   // Para visibilidad jerárquica
    phone?: string | null;   // Para visibilidad jerárquica
    agent_name?: string;     // Para la RED
    agent_phone?: string;    // Para la RED
    organization_name?: string; // Para la RED
}

export type ClientWithAgent = Client & {
    agent: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null; // Agregado para contacto
    } | null;
    is_anonymous?: boolean; // Agregado por el server action strip_pii
};
