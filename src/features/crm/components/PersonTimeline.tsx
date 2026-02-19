'use client';

import React, { useEffect, useState } from 'react';
import {
    Activity,
    Calendar,
    Clock,
    Edit3,
    PlusCircle,
    Phone,
    MessageSquare,
    UserCircle,
    FileText
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getStatusLabel } from '../constants/relationshipStatuses';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PersonHistoryEvent } from '@/features/clients/types';
import { getPersonHistoryAction } from '../actions/personActions';

interface PersonTimelineProps {
    personId: string;
}

const EVENT_CONFIG = {
    creation: {
        icon: PlusCircle,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        label: 'Lead Creado'
    },
    edit: {
        icon: Edit3,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        label: 'Perfil Editado'
    },
    status_change: {
        icon: Activity,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        label: 'Cambio de Estado'
    },
    lifecycle_change: {
        icon: Clock,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        label: 'Cambio de Etapa'
    },
    contact: {
        icon: Phone,
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10',
        label: 'Contacto Registrado'
    },
    note_added: {
        icon: MessageSquare,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        label: 'Nota Agregada'
    }
};

export function PersonTimeline({ personId }: PersonTimelineProps) {
    const [events, setEvents] = useState<PersonHistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            const result = await getPersonHistoryAction(personId);
            if (result.success && result.data) {
                setEvents(result.data);
            }
            setLoading(false);
        };
        loadHistory();
    }, [personId]);

    if (loading) {
        return (
            <div className="space-y-4 pr-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32 bg-white/5" />
                            <Skeleton className="h-4 w-full bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 opacity-50">
                <Calendar className="w-8 h-8 text-white/20" />
                <p className="text-sm text-white/50">No hay historial de actividad registrado aún.</p>
            </div>
        );
    }

    // Calcular métricas
    const creationEvent = [...events].reverse().find(e => e.event_type === 'creation');
    const lastLifecycleEvent = events.find(e => e.event_type === 'lifecycle_change');

    const daysInCRM = creationEvent ? differenceInDays(new Date(), new Date(creationEvent.created_at)) : 0;
    const daysInCurrentStage = lastLifecycleEvent ? differenceInDays(new Date(), new Date(lastLifecycleEvent.created_at)) : daysInCRM;

    return (
        <div className="space-y-8">
            {/* Métricas de tiempo */}
            <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex flex-col gap-1 transition-colors hover:bg-white/[0.04]">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Antigüedad en CRM</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-white/80">{daysInCRM}</span>
                        <span className="text-xs text-white/40">días</span>
                    </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex flex-col gap-1 transition-colors hover:bg-white/[0.04]">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Tiempo en Etapa Actual</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-amber-400/80">{daysInCurrentStage}</span>
                        <span className="text-xs text-white/40">días</span>
                    </div>
                </div>
            </div>

            <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                {events.map((event) => {
                    const config = (EVENT_CONFIG as any)[event.event_type] || {
                        icon: FileText,
                        color: 'text-white/50',
                        bgColor: 'bg-white/5',
                        label: event.event_type
                    };
                    const Icon = config.icon;

                    return (
                        <div key={event.id} className="relative flex gap-4 pr-4 group">
                            {/* Icono de la línea de tiempo */}
                            <div className={cn(
                                "z-10 flex items-center justify-center w-10 h-10 rounded-full border border-white/10 shrink-0 transition-transform group-hover:scale-110",
                                config.bgColor
                            )}>
                                <Icon className={cn("w-5 h-5", config.color)} />
                            </div>

                            {/* Contenido del evento */}
                            <div className="flex-1 pt-0.5 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white/90 truncate">
                                        {config.label}
                                    </span>
                                    <time className="text-[10px] text-white/40 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                                    </time>
                                </div>

                                <p className="text-xs text-white/60 leading-relaxed mb-2">
                                    {renderEventDescription(event)}
                                </p>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 opacity-60">
                                        <UserCircle className="w-3 h-3" />
                                        <span className="text-[10px] text-white/40">
                                            {event.agent ? `${event.agent.first_name} ${event.agent.last_name}` : 'Sistema'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-white/20">•</span>
                                    <span className="text-[10px] text-white/40">
                                        {format(new Date(event.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function renderEventDescription(event: PersonHistoryEvent) {
    switch (event.event_type) {
        case 'creation':
            return `Ingreso al sistema bajo la etapa "${event.metadata?.initial_lifecycle === 'active' ? 'Activo' : 'Seguimiento'}" y estado "${event.metadata?.initial_status || 'Sin definir'}".`;

        case 'lifecycle_change':
            if (event.new_value === 'lost') {
                return `El lead fue marcado como PERDIDO. Motivo: ${event.metadata?.lost_reason || 'No especificado'}.`;
            }
            const statusLabel = event.new_value === 'following_up' ? 'SEGUIMIENTO' : 'ACTIVO';
            return `Cambió su etapa en el embudo a ${statusLabel}.`;

        case 'status_change':
            return `El estado de la relación se actualizó a "${getStatusLabel(event.new_value)}".`;

        case 'contact':
            return `Interacción rápida registrada con el cliente.`;

        case 'edit':
            return `Información del perfil actualizada.`;

        default:
            return `Evento registrado en el historial del lead.`;
    }
}
