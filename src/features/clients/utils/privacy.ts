import type { Client, AnonymousClient, ClientWithAgent } from '../types';

export interface ClientDisplay extends Client {
    is_anonymous: boolean;
    anonymous_label?: string;
    agent_name?: string;
    agent_phone?: string;
    organization_name?: string;
    motivation: string | null;
}

export interface UserProfile {
    id: string;
    role: 'god' | 'parent' | 'child' | string;
    organization_id: string | null;
}

/**
 * Aplica la lógica de privacidad jerárquica de forma robusta.
 * Estándar de calidad: No muta el objeto original, maneja nulos y asegura consistencia.
 */
export function applyPrivacyPolicy(
    client: any,
    userProfile: UserProfile,
    currentUserId: string
): ClientDisplay {
    const isGod = userProfile.role === 'god';
    const isParent = userProfile.role === 'parent';
    const isOwner = client.agent_id === currentUserId;
    const isSameOrg = client.organization_id === userProfile.organization_id;
    // Cross-org: El agente del cliente reporta a la org del Parent
    const agentReportsToMyOrg = client.agent?.reports_to_organization_id === userProfile.organization_id;

    // Lógica Regla de Oro: Visibilidad jerárquica + cross-org
    const canSeePII = isGod || (isParent && (isSameOrg || agentReportsToMyOrg)) || isOwner;

    // Mapeo base de datos auxiliares (Network info)
    const organizationName = client.organization?.name || client.organization_name || 'Inmobiliaria';
    const agentName = client.agent
        ? `${client.agent.first_name || ''} ${client.agent.last_name || ''}`.trim()
        : (client.agent_name || 'Agente Externo');
    const agentPhone = client.agent?.phone || client.agent_phone || null;

    if (canSeePII) {
        return {
            ...client,
            first_name: client.first_name || 'Cliente',
            last_name: client.last_name || '',
            email: client.email || null,
            phone: client.phone || null,
            is_anonymous: false,
            organization_name: organizationName,
            agent_name: agentName,
            agent_phone: agentPhone,
            motivation: client.motivation || null
        };
    }

    // Retorno Anonimizado (Strip PII)
    return {
        ...client,
        first_name: 'Cliente',
        last_name: '(Oculto)',
        email: null,
        phone: null,
        is_anonymous: true,
        anonymous_label: client.anonymous_label || `Cliente Activo (${client.type || 'Interesado'})`,
        organization_name: organizationName,
        agent_name: agentName,
        agent_phone: agentPhone,
        motivation: client.motivation || null
    };
}
