'use client';

import { motion } from 'framer-motion';
import { Star, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEAMS_CONFIG } from '../constants';
import type { AgentScore } from '../actions/competitionActions';
import type { TeamId } from '../constants';

interface MvpCardProps {
    title: string;
    mvp: {
        first_name: string;
        last_name: string;
        team: TeamId;
        totalPoints?: number;
        points?: number;
        pl_count?: number;
        counts?: { pre_listing: number };
    } | null;
    delay?: number;
}

export function MvpCard({ title, mvp, delay = 0 }: MvpCardProps) {
    if (!mvp) return null;

    const config = TEAMS_CONFIG[mvp.team];
    const points = mvp.totalPoints ?? mvp.points ?? 0;
    const plCount = mvp.pl_count ?? mvp.counts?.pre_listing ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-950/80 backdrop-blur-xl"
        >
            {/* Golden shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-shimmer" />

            <div className="relative p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">{title}</h3>
                </div>

                <div className="flex items-center gap-4">
                    {/* Avatar with team color */}
                    <div className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 shadow-lg',
                        mvp.team === 'negro'
                            ? 'bg-slate-800 border-slate-600 text-white'
                            : 'bg-amber-900/60 border-amber-500/50 text-amber-200',
                    )}>
                        {mvp.first_name?.[0]}{mvp.last_name?.[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-white truncate">
                            {mvp.first_name} {mvp.last_name}
                        </p>
                        <p className="text-xs text-slate-400">
                            {config.emoji} {config.name}
                        </p>
                    </div>

                    {/* Points badge */}
                    <div className="text-right">
                        <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-2xl font-black text-amber-300 tabular-nums">{points}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">{plCount} PLs</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
