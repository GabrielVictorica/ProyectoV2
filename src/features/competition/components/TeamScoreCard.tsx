'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEAMS_CONFIG, TEAM_BILLING_GOAL_USD, type TeamId } from '../constants';
import type { TeamScore } from '../actions/competitionActions';

interface TeamScoreCardProps {
    team: TeamScore;
    opponentPoints: number;
    isWinning: boolean;
    delay?: number;
}

export function TeamScoreCard({ team, opponentPoints, isWinning, delay = 0 }: TeamScoreCardProps) {
    const config = TEAMS_CONFIG[team.team];
    const diff = team.totalPoints - opponentPoints;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="relative group"
        >
            <div
                className={cn(
                    'relative overflow-hidden rounded-2xl border transition-all duration-500',
                    'backdrop-blur-xl shadow-2xl',
                    team.team === 'negro'
                        ? 'bg-slate-950/80 border-slate-700/50 hover:border-slate-600/70'
                        : 'bg-amber-950/30 border-amber-700/30 hover:border-amber-600/50',
                    isWinning && 'ring-2',
                    isWinning && team.team === 'negro' ? 'ring-slate-400/40' : '',
                    isWinning && team.team === 'dorado' ? 'ring-amber-400/40' : '',
                )}
            >
                {/* Gradient overlay */}
                <div className={cn(
                    'absolute inset-0 opacity-20',
                    team.team === 'negro'
                        ? 'bg-gradient-to-br from-slate-600/30 via-transparent to-slate-900/50'
                        : 'bg-gradient-to-br from-amber-500/20 via-transparent to-amber-900/30',
                )} />

                {/* Content */}
                <div className="relative p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{config.emoji}</span>
                            <div>
                                <h3 className="text-lg font-bold text-white">{config.name}</h3>
                                <p className="text-xs text-slate-400">
                                    {team.members.length} agentes
                                </p>
                            </div>
                        </div>
                        {isWinning && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: delay + 0.3 }}
                            >
                                <Trophy className="w-6 h-6 text-amber-400" />
                            </motion.div>
                        )}
                    </div>

                    {/* Score */}
                    <div className="text-center mb-6">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', delay: delay + 0.2 }}
                            className={cn(
                                'text-5xl font-black tabular-nums',
                                team.team === 'negro' ? 'text-white' : 'text-amber-300',
                            )}
                        >
                            {team.totalPoints.toLocaleString()}
                        </motion.div>
                        <p className="text-xs text-slate-400 mt-1">puntos totales</p>
                        {diff !== 0 && (
                            <p className={cn(
                                'text-sm font-semibold mt-2',
                                diff > 0 ? 'text-emerald-400' : 'text-red-400',
                            )}>
                                {diff > 0 ? '+' : ''}{diff} pts
                            </p>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-400">Facturación</p>
                            <p className="text-lg font-bold text-emerald-400">
                                ${team.facturacion.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-400">Semanas Perfectas</p>
                            <p className="text-lg font-bold text-violet-400">
                                {team.perfectWeekBonuses}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
