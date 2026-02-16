/**
 * Utilidades para el manejo de datos de clientes.
 */

export interface NURCProfile {
    n: string; // Necesidad
    u: string; // Urgencia
    r: string; // Realismo
    c: string; // Capacidad
}

export function parseNURC(motivation: string | null): NURCProfile {
    const defaultProfile = { n: '', u: '', r: '', c: '' };
    if (!motivation) return defaultProfile;

    const profile = { ...defaultProfile };

    // El formato esperado es "N: ...\nU: ...\nR: ...\nC: ..."
    const lines = motivation.split('\n');

    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length < 2) return;

        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim(); // Tomar todo lo que está después del primer ":"

        if (key === 'n') profile.n = value;
        if (key === 'u') profile.u = value;
        if (key === 'r') profile.r = value;
        if (key === 'c') profile.c = value;
    });

    return profile;
}
// Helper para generar texto de búsqueda apto para portapapeles (WhatsApp)
// Helper para generar texto de búsqueda apto para portapapeles (WhatsApp)
export function generateSearchClipboardText(client: any, propertyTypes: any[]): string {
    // Tipos de Propiedad
    const types = (client.search_property_types || [])
        .map((id: string) => propertyTypes.find(t => t.id === id)?.name || '')
        .filter(Boolean)
        .join(', ');

    // NURC
    const motivation = client.motivation || client.anonymous_label || '';
    const nurc = parseNURC(motivation);

    // Construcción del mensaje sin datos personales del cliente
    const lines = [
        `🔍 *Búsqueda Activa*: ${client.type === 'buyer' ? 'Comprador' : 'Vendedor'}`,
        '',
        `🏠 *Propiedad*: ${types || 'No especificado'}`,
        `📍 *Zonas*: ${(client.preferred_zones || []).join(', ') || 'A definir'}`,
        `💰 *Presupuesto*: USD ${client.budget_min?.toLocaleString()} - ${client.budget_max?.toLocaleString()}`,
        `🛏️ *Dormitorios*: ${(client.search_bedrooms || []).join(', ') || 'Indistinto'}`,
        '',
        `🎯 *Perfil NURC*:`,
        `• N (Necesidad): ${nurc.n || '-'}`,
        `• U (Urgencia): ${nurc.u || '-'}`,
        `• R (Realismo): ${nurc.r || '-'}`,
        `• C (Capacidad): ${nurc.c || '-'}`
    ];

    return lines.filter(line => line !== null).join('\n');
}

export function toTitleCase(str: string): string {
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}
