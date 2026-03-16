'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Medal, TrendingUp, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TEAMS_CONFIG, POINTS_TABLE } from '../constants';
import type { AgentScore } from '../actions/competitionActions';

interface AgentRankingTableProps {
    agents: AgentScore[];
    title?: string;
    delay?: number;
}

const ACTIVITY_LABELS: Record<string, { label: string; color: string }> = {
    reunion_verde: { label: 'Reunión Verde', color: 'text-emerald-400' },
    pre_listing: { label: 'Pre-Listing', color: 'text-violet-400' },
    pre_buying: { label: 'Pre-Buying', color: 'text-fuchsia-400' },
    acm: { label: 'ACM', color: 'text-blue-400' },
    captacion: { label: 'Captación', color: 'text-amber-400' },
    visita: { label: 'Visita', color: 'text-rose-400' },
    cierre: { label: 'Reserva', color: 'text-indigo-400' },
    nuevo_contacto: { label: 'Contacto', color: 'text-cyan-400' },
    nueva_busqueda: { label: 'Búsqueda', color: 'text-teal-400' },
    referido_bonus: { label: 'Referido', color: 'text-orange-400' },
    perfect_weeks: { label: 'Semanas Perf.', color: 'text-yellow-400' },
};

function getMedalColor(index: number) {
    if (index === 0) return 'text-amber-400';
    if (index === 1) return 'text-slate-300';
    if (index === 2) return 'text-amber-600';
    return 'text-slate-600';
}

export function AgentRankingTable({ agents, title = 'Ranking Individual', delay = 0 }: AgentRankingTableProps) {
    const [teamFilter, setTeamFilter] = useState<'all' | 'negro' | 'dorado'>('all');

    const filteredAgents = agents.filter(a => teamFilter === 'all' || a.team === teamFilter);

    // Sort by total points DESC, tiebreak by PL count DESC
    const sorted = [...filteredAgents].sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return (b.counts.pre_listing || 0) - (a.counts.pre_listing || 0);
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-xl overflow-hidden"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    <h3 className="text-base font-bold text-white">{title}</h3>
                </div>

                {/* Team Filter */}
                <div className="flex items-center gap-2 text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <Select value={teamFilter} onValueChange={(value) => setTeamFilter(value as 'all' | 'negro' | 'dorado')}>
                        <SelectTrigger className="h-8 bg-[#09090b] border-white/10 text-slate-300 text-xs w-[150px] focus:ring-1 focus:ring-violet-500">
                            <SelectValue placeholder="Ambos equipos" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#09090b] border-white/10 text-slate-300">
                            <SelectItem value="all" className="text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer transition-colors">
                                Ambos equipos
                            </SelectItem>
                            <SelectItem value="negro" className="text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer transition-colors">
                                <span className="flex items-center gap-2">{TEAMS_CONFIG.negro.emoji} Equipo Negro</span>
                            </SelectItem>
                            <SelectItem value="dorado" className="text-xs hover:bg-white/5 focus:bg-white/5 focus:text-white cursor-pointer transition-colors">
                                <span className="flex items-center gap-2">{TEAMS_CONFIG.dorado.emoji} Equipo Dorado</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto elegant-scrollbar">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/[0.04]">
                            <th className="text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-8">#</th>
                            <th className="text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider px-3 py-3">Agente</th>
                            {Object.entries(ACTIVITY_LABELS).map(([key, { label, color }]) => (
                                <th key={key} className="text-center text-[10px] font-medium text-slate-500 uppercase tracking-wider px-2 py-3">
                                    <span className={color}>{label}</span>
                                </th>
                            ))}
                            <th className="text-right text-[10px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((agent, idx) => {
                            const config = TEAMS_CONFIG[agent.team];
                            return (
                                <motion.tr
                                    key={agent.agent_id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: delay + idx * 0.04 }}
                                    className={cn(
                                        'border-b border-white/[0.03] transition-colors hover:bg-white/[0.04]',
                                        idx === 0 && 'bg-amber-500/[0.04]',
                                    )}
                                >
                                    {/* Rank */}
                                    <td className="px-4 py-3">
                                        {idx < 3 ? (
                                            <Medal className={cn('w-4 h-4', getMedalColor(idx))} />
                                        ) : (
                                            <span className="text-slate-500 text-xs">{idx + 1}</span>
                                        )}
                                    </td>

                                    {/* Agent */}
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border',
                                                agent.team === 'negro'
                                                    ? 'bg-slate-800 border-slate-600 text-slate-200'
                                                    : 'bg-amber-900/40 border-amber-600/40 text-amber-200',
                                            )}>
                                                {agent.first_name?.[0]}{agent.last_name?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white text-xs font-semibold truncate">
                                                    {agent.first_name} {agent.last_name?.[0]}.
                                                </p>
                                                <p className="text-[10px] text-slate-500">{config.emoji}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Breakdown */}
                                    {Object.keys(ACTIVITY_LABELS).map((key) => {
                                        const value = agent.breakdown[key as keyof typeof agent.breakdown] || 0;
                                        return (
                                            <td key={key} className="text-center px-2 py-3">
                                                <span className={cn(
                                                    'text-xs tabular-nums',
                                                    value > 0 ? 'text-slate-200' : 'text-slate-700',
                                                )}>
                                                    {value > 0 ? value : '-'}
                                                </span>
                                            </td>
                                        );
                                    })}

                                    {/* Total */}
                                    <td className="text-right px-4 py-3">
                                        <span className={cn(
                                            'text-sm font-bold tabular-nums',
                                            idx === 0 ? 'text-amber-300' : 'text-white',
                                        )}>
                                            {agent.totalPoints}
                                        </span>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
