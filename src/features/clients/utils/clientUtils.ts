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
