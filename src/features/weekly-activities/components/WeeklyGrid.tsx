'use client';

import React, { useState } from 'react';
import { WeeklyDataMap } from '../hooks/useWeeklyActivities';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { ActivityDialog } from './ActivityDialog';

interface WeeklyGridProps {
    weekStart: Date;
    data: WeeklyDataMap;
    isLoading: boolean;
    agentId?: string;
}

const ROWS = [
    { id: 'reunion_verde', label: 'Reunión Verde', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    { id: 'pre_listing', label: 'Pre-Listing', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    { id: 'pre_buying', label: 'Pre-Buying', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/10' },
    { id: 'acm', label: 'ACM', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { id: 'captacion', label: 'Captación', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    { id: 'visita', label: 'Visita', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
    { id: 'reserva', label: 'Reserva', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { id: 'cierre', label: 'Cierre', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', isVirtual: true },
    { id: 'referido', label: 'Referido', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
];

export function WeeklyGrid({ weekStart, data, isLoading, agentId }: WeeklyGridProps) {
    const [dialogConfig, setDialogConfig] = useState<{
        open: boolean;
        date: string;
        type: string;
        label: string;
        activities: any[];
        initialEditId: string | null;
    }>({
        open: false,
        date: '',
        type: '',
        label: '',
        activities: [],
        initialEditId: null,
    });

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const todayStr = new Date().toISOString().split('T')[0];

    const handleCellClick = (dateStr: string, row: typeof ROWS[0], activities: any[], initialEditId: string | null = null) => {
        if (row.isVirtual) return;
        if (dateStr > todayStr) return; // Block future dates
        setDialogConfig({
            open: true,
            date: dateStr,
            type: row.id,
            label: row.label,
            activities,
            initialEditId,
        });
    };

    if (isLoading) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                            <th className="p-6 text-left w-64 border-r border-white/[0.04]">
                                <span className="text-xs font-bold uppercase tracking-widest text-white/30">Actividad</span>
                            </th>
                            {days.map((day, i) => {
                                const dayStr = day.toISOString().split('T')[0];
                                const isFuture = dayStr > todayStr;
                                return (
                                    <th key={i} className={`p-6 text-center border-r last:border-r-0 border-white/[0.04] ${isFuture ? 'opacity-30' : ''}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-bold uppercase tracking-widest text-white/30">
                                                {format(day, 'EEE', { locale: es })}
                                            </span>
                                            <span className="text-lg font-bold text-white">
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr key={row.id} className="group border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.01] transition-colors">
                                <td className="p-6 border-r border-white/[0.04]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${row.color} shadow-[0_0_8px] shadow-current opacity-60`} />
                                        <span className="font-medium text-white/80 group-hover:text-white transition-colors">
                                            {row.label}
                                        </span>
                                    </div>
                                </td>
                                {days.map((day, dIdx) => {
                                    const dateStr = day.toISOString().split('T')[0];
                                    const isFuture = dateStr > todayStr;
                                    const cellData = data[dateStr];
                                    const activities = cellData?.activities.filter(a => a.type === row.id) || [];
                                    let count = 0;
                                    if (row.isVirtual) {
                                        count = cellData?.transactionCount || 0;
                                    } else {
                                        if (row.id === 'visita') {
                                            count = activities.reduce((acc, a) => acc + (a.visit_metadata?.punta === 'ambas' ? 2 : 1), 0);
                                        } else {
                                            count = activities.length;
                                        }
                                    }

                                    return (
                                        <td key={dIdx} className={`p-4 text-center border-r last:border-r-0 border-white/[0.04] relative ${isFuture ? 'opacity-20 pointer-events-none' : ''}`}>
                                            <div className="flex items-center justify-center min-h-[48px]">
                                                {count > 0 ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => handleCellClick(dateStr, row, activities)}
                                                                className={`h-10 w-10 flex items-center justify-center rounded-xl ${row.bgColor} border border-white/[0.08] hover:border-white/[0.2] transition-all duration-200 group/cell`}
                                                            >
                                                                <span className={`text-sm font-bold ${row.color}`}>{count}</span>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-[#09090b] border border-white/10 text-white p-3 min-w-[240px] space-y-2 shadow-2xl z-[9999] opacity-100">
                                                            <p className="font-bold border-b border-white/10 pb-1 mb-1 flex justify-between">
                                                                <span>{row.label}</span>
                                                                <span className="text-white/40 font-normal">{format(day, 'd MMM')}</span>
                                                            </p>
                                                            {row.isVirtual ? (
                                                                <div className="space-y-3">
                                                                    {(cellData?.transactions || []).map((trans, tIdx) => (
                                                                        <div key={tIdx} className="text-xs space-y-1 border-l-2 border-indigo-500/50 pl-2 py-0.5">
                                                                            <div className="flex justify-between items-start gap-2">
                                                                                <p className="font-bold text-white text-sm leading-tight max-w-[160px] truncate">
                                                                                    {trans.property?.title || 'Propiedad sin título'}
                                                                                </p>
                                                                                <span className="text-emerald-400 font-mono text-xs whitespace-nowrap">
                                                                                    ${trans.actual_price?.toLocaleString() || '0'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-[10px] text-white/50 flex flex-col gap-0.5">
                                                                                <span>Vendedor: {trans.seller_name || '-'}</span>
                                                                                <span>Comprador: {trans.buyer_name || '-'}</span>
                                                                            </div>
                                                                            {trans.notes && (
                                                                                <p className="text-white/60 italic leading-tight mt-1 line-clamp-2 text-[10px]">
                                                                                    "{trans.notes}"
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {activities.flatMap((act, aIdx) => {
                                                                        const activityNotes = act.notes || '';

                                                                        if (act.type === 'visita' && act.visit_metadata?.punta === 'ambas') {
                                                                            const buyerName = act.visit_metadata.buyer_name || (act.person?.id === act.visit_metadata.buyer_person_id ? `${act.person?.first_name} ${act.person?.last_name}` : 'Comprador');
                                                                            const sellerName = act.visit_metadata.seller_name || (act.person?.id === act.visit_metadata.seller_person_id ? `${act.person?.first_name} ${act.person?.last_name}` : 'Vendedor');

                                                                            return [
                                                                                <div
                                                                                    key={`${aIdx}-buyer`}
                                                                                    className="text-xs space-y-0.5 border-l-2 border-amber-500/50 pl-2 hover:border-amber-400 hover:bg-white/[0.02] cursor-pointer p-1 rounded-r-lg transition-all group/item mb-1"
                                                                                    onClick={() => handleCellClick(dateStr, row, activities, act.id)}
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <p className="font-bold text-white leading-tight">
                                                                                            {buyerName}
                                                                                        </p>
                                                                                        <span className="text-[9px] text-amber-400 font-medium uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 shrink-0">Comprador</span>
                                                                                    </div>
                                                                                    {activityNotes && (
                                                                                        <p className="text-white/60 italic leading-tight line-clamp-2">
                                                                                            {activityNotes}
                                                                                        </p>
                                                                                    )}
                                                                                </div>,
                                                                                <div
                                                                                    key={`${aIdx}-seller`}
                                                                                    className="text-xs space-y-0.5 border-l-2 border-emerald-500/50 pl-2 hover:border-emerald-400 hover:bg-white/[0.02] cursor-pointer p-1 rounded-r-lg transition-all group/item"
                                                                                    onClick={() => handleCellClick(dateStr, row, activities, act.id)}
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <p className="font-bold text-white leading-tight">
                                                                                            {sellerName}
                                                                                        </p>
                                                                                        <span className="text-[9px] text-emerald-400 font-medium uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 shrink-0">Vendedor</span>
                                                                                    </div>
                                                                                    {activityNotes && (
                                                                                        <p className="text-white/60 italic leading-tight line-clamp-2">
                                                                                            {activityNotes}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ];
                                                                        }

                                                                        const personName = act.person
                                                                            ? `${act.person.first_name} ${act.person.last_name}`
                                                                            : null;

                                                                        return [
                                                                            <div
                                                                                key={aIdx}
                                                                                className="text-xs space-y-0.5 border-l-2 border-white/20 pl-2 hover:border-violet-500/50 hover:bg-white/[0.02] cursor-pointer p-1 rounded-r-lg transition-all group/item"
                                                                                onClick={() => handleCellClick(dateStr, row, activities, act.id)}
                                                                            >
                                                                                {personName && (
                                                                                    <p className="font-bold text-white leading-tight">
                                                                                        {personName}
                                                                                    </p>
                                                                                )}
                                                                                {activityNotes && (
                                                                                    <p className="text-white/60 italic leading-tight line-clamp-2">
                                                                                        {activityNotes}
                                                                                    </p>
                                                                                )}
                                                                                {!personName && !activityNotes && (
                                                                                    <p className="text-white/40 italic">Sin detalle</p>
                                                                                )}
                                                                            </div>
                                                                        ];
                                                                    })}
                                                                </div>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    !row.isVirtual && (
                                                        <button
                                                            onClick={() => handleCellClick(dateStr, row, [])}
                                                            className="h-10 w-10 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0] hover:border-white/[0.08] transition-all duration-200 text-white/40 hover:text-white"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <ActivityDialog
                    open={dialogConfig.open}
                    onOpenChange={(open) => setDialogConfig(prev => ({ ...prev, open }))}
                    date={dialogConfig.date}
                    type={dialogConfig.type}
                    label={dialogConfig.label}
                    existingActivities={dialogConfig.activities}
                    agentId={agentId}
                    initialEditId={dialogConfig.initialEditId}
                />
            </div>
        </TooltipProvider>
    );
}
