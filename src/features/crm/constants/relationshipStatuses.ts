import {
    Phone, Handshake, FileSearch, Search, BarChart3, Home,
    MapPin, CheckCircle2, PenTool, Users
} from 'lucide-react';

export const RELATIONSHIP_STATUSES = [
    { value: 'contacto_telefonico', label: 'Contacto Telefónico', description: 'Primer contacto vía telefónica', icon: Phone },
    { value: 'reunion_verde', label: 'Reunión Verde', description: 'Primer contacto o reunión inicial', icon: Handshake },
    { value: 'pre_listing', label: 'Pre-Listing', description: 'Reunión de pre-captación', icon: FileSearch },
    { value: 'pre_buying', label: 'Pre-Buying', description: 'Reunión de pre-compra', icon: Search },
    { value: 'acm', label: 'ACM', description: 'Análisis Comparativo de Mercado', icon: BarChart3 },
    { value: 'captacion', label: 'Captación', description: 'Propiedad captada', icon: Home },
    { value: 'visita', label: 'Visita', description: 'Visita a propiedad', icon: MapPin },
    { value: 'reserva', label: 'Reserva', description: 'Reserva confirmada', icon: CheckCircle2 },
    { value: 'cierre', label: 'Cierre', description: 'Operación cerrada', icon: PenTool },
    { value: 'referido', label: 'Referido', description: 'Contacto referido', icon: Users },
] as const;

/**
 * Returns the human-readable label for a relationship status value.
 * Falls back to the raw value if not found.
 */
export function getStatusLabel(value: string | null | undefined): string {
    if (!value) return '';
    const found = RELATIONSHIP_STATUSES.find(s => s.value === value);
    return found ? found.label : value;
}
