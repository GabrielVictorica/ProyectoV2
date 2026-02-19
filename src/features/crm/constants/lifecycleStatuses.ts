import { Activity, Clock, XCircle } from 'lucide-react';

export const LIFECYCLE_STATUSES = [
    {
        value: 'active',
        label: 'Activo',
        icon: Activity,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30'
    },
    {
        value: 'following_up',
        label: 'Seguimiento',
        icon: Clock,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30'
    },
    {
        value: 'lost',
        label: 'Perdido',
        icon: XCircle,
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30'
    },
] as const;

export const LOST_REASONS = [
    'Precio fuera de mercado',
    'Eligió otra inmobiliaria',
    'Canceló la venta/búsqueda',
    'Falta de interés',
    'Problemas de documentación',
    'No se pudo contactar',
    'Otro'
];

export function getLifecycleLabel(value: string | undefined): string {
    if (!value) return 'Activo';
    const status = LIFECYCLE_STATUSES.find(s => s.value === value);
    return status ? status.label : value;
}
