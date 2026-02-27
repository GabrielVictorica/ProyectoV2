'use client';

import { motion } from 'framer-motion';
import { Calendar, Sword, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEAMS_CONFIG } from '../constants';
import type { WeeklyResult } from '../actions/competitionActions';

interface WeeklyMatchCardProps {
    results: WeeklyResult[];
    delay?: number;
}

function formatDateShort(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export function WeeklyMatchCard({ results, delay = 0 }: WeeklyMatchCardProps) {
    // Show most recent weeks first
    const reversed = [...results].reverse();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-xl overflow-hidden"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <Sword className="w-5 h-5 text-rose-400" />
                    <h3 className="text-base font-bold text-white">Partidos Semanales</h3>
                    <span className="text-xs text-slate-500 ml-auto">
                        {results.length} semana{results.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Weeks list */}
            <div className="max-h-[400px] overflow-y-auto elegant-scrollbar divide-y divide-white/[0.04]">
                {reversed.length === 0 && (
                    <div className="px-5 py-10 text-center text-slate-500 text-sm">
                        La competencia aún no ha comenzado
                    </div>
                )}

                {reversed.map((week, idx) => {
                    const negroWins = week.negro > week.dorado;
                    const doradoWins = week.dorado > week.negro;
                    const tie = week.negro === week.dorado;

                    return (
                        <motion.div
                            key={week.weekStart}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: delay + idx * 0.05 }}
                            className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                        >
                            {/* Week header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-xs text-slate-400">
                                        Semana {week.weekNumber}
                                    </span>
                                    <span className="text-[10px] text-slate-600">
                                        {formatDateShort(week.weekStart)} — {formatDateShort(week.weekEnd)}
                                    </span>
                                </div>
                            </div>

                            {/* Score matchup */}
                            <div className="flex items-center gap-3">
                                {/* Negro */}
                                <div className={cn(
                                    'flex-1 flex items-center gap-2 rounded-lg px-3 py-2',
                                    negroWins ? 'bg-slate-700/30' : 'bg-white/[0.02]',
                                )}>
                                    <span className="text-sm">{TEAMS_CONFIG.negro.emoji}</span>
                                    <span className={cn(
                                        'text-lg font-bold tabular-nums',
                                        negroWins ? 'text-white' : 'text-slate-400',
                                    )}>
                                        {week.negro}
                                    </span>
                                    {negroWins && <Star className="w-3 h-3 text-amber-400 fill-amber-400 ml-auto" />}
                                </div>

                                {/* VS */}
                                <span className="text-[10px] text-slate-600 font-bold">VS</span>

                                {/* Dorado */}
                                <div className={cn(
                                    'flex-1 flex items-center justify-end gap-2 rounded-lg px-3 py-2',
                                    doradoWins ? 'bg-amber-900/20' : 'bg-white/[0.02]',
                                )}>
                                    {doradoWins && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                    <span className={cn(
                                        'text-lg font-bold tabular-nums',
                                        doradoWins ? 'text-amber-300' : 'text-slate-400',
                                    )}>
                                        {week.dorado}
                                    </span>
                                    <span className="text-sm">{TEAMS_CONFIG.dorado.emoji}</span>
                                </div>
                            </div>

                            {/* MVP and Perfect Weeks */}
                            <div className="flex items-center gap-3 mt-2">
                                {week.mvp && (
                                    <div className="flex items-center gap-1.5">
                                        <Star className="w-3 h-3 text-amber-400" />
                                        <span className="text-[10px] text-slate-400">
                                            MVP: <span className="text-slate-200 font-medium">{week.mvp.first_name} {week.mvp.last_name?.[0]}.</span>
                                            <span className="text-amber-400/70 ml-1">({week.mvp.points} pts)</span>
                                        </span>
                                    </div>
                                )}
                                {week.perfectWeeks.length > 0 && (
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <Sparkles className="w-3 h-3 text-yellow-400" />
                                        <span className="text-[10px] text-yellow-400/70">
                                            {week.perfectWeeks.length} SP
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
