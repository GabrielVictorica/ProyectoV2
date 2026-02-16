'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { Thermometer, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface HealthScoreBadgeProps {
    lastInteractionAt: string | null | undefined;
    className?: string;
    showLabel?: boolean;
}

export function HealthScoreBadge({ lastInteractionAt, className, showLabel = true }: HealthScoreBadgeProps) {
    if (!lastInteractionAt) {
        return (
            <Badge
                variant="outline"
                className={cn("bg-slate-500/10 border-slate-500/20 text-slate-400 gap-1.5", className)}
            >
                <Clock className="w-3 h-3" />
                {showLabel && "Sin contacto"}
            </Badge>
        );
    }

    const lastDate = typeof lastInteractionAt === 'string' ? parseISO(lastInteractionAt) : lastInteractionAt;
    const daysSince = differenceInDays(new Date(), lastDate);

    // Semáforo Logic:
    // 🟢 Verde (Activo): < 30 días
    // 🟡 Amarillo (Enfriándose): 31-90 días
    // 🔴 Rojo (Crítico): > 90 días

    if (daysSince <= 30) {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
                    className
                )}
            >
                <CheckCircle2 className="w-3 h-3" />
                {showLabel && "Activo"}
            </Badge>
        );
    }

    if (daysSince <= 90) {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "bg-amber-500/10 border-amber-500/30 text-amber-400 gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
                    className
                )}
            >
                <Clock className="w-3 h-3" />
                {showLabel && "Enfriándose"}
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "bg-rose-500/10 border-rose-500/30 text-rose-400 gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.1)]",
                className
            )}
        >
            <ShieldAlert className="w-3 h-3" />
            {showLabel && "Crítico"}
        </Badge>
    );
}
