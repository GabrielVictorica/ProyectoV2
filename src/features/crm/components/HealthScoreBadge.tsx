'use client';

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface HealthScoreBadgeProps {
    lastInteractionAt: string | null;
    className?: string;
}

export function HealthScoreBadge({ lastInteractionAt, className }: HealthScoreBadgeProps) {
    if (!lastInteractionAt) {
        return (
            <Badge variant="outline" className={cn("bg-slate-500/10 text-slate-400 border-slate-500/20 gap-1", className)}>
                <Activity className="w-3 h-3" />
                Sin Contacto
            </Badge>
        );
    }

    const normalizedDate = lastInteractionAt.split('T')[0];
    const days = differenceInDays(new Date(), new Date(normalizedDate + 'T12:00:00'));

    let status: 'fuerte' | 'riesgo' | 'critico' = 'fuerte';
    let colorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    let label = 'Fuerte';

    if (days > 45) {
        status = 'critico';
        colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        label = 'Crítico';
    } else if (days > 15) {
        status = 'riesgo';
        colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        label = 'En Riesgo';
    }

    return (
        <Badge variant="outline" className={cn(colorClass, "gap-1", className)}>
            <div className={cn("w-1.5 h-1.5 rounded-full",
                status === 'fuerte' ? 'bg-emerald-500 animate-pulse' :
                    status === 'riesgo' ? 'bg-amber-500' : 'bg-rose-500'
            )} />
            {label}
        </Badge>
    );
}
