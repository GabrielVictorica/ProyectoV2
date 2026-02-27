'use client';

import { motion } from 'framer-motion';
import { DollarSign, Target } from 'lucide-react';
import { TEAM_BILLING_GOAL_USD, TEAMS_CONFIG, type TeamId } from '../constants';

interface BillingProgressBarProps {
    teamId: TeamId;
    facturacion: number;
    delay?: number;
}

export function BillingProgressBar({ teamId, facturacion, delay = 0 }: BillingProgressBarProps) {
    const config = TEAMS_CONFIG[teamId];
    const percentage = Math.min((facturacion / TEAM_BILLING_GOAL_USD) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{config.emoji}</span>
                    <div>
                        <p className="text-sm font-semibold text-white">{config.name}</p>
                        <p className="text-[10px] text-slate-500">Facturación</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">
                        ${facturacion.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        de ${TEAM_BILLING_GOAL_USD.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.2, delay: delay + 0.3, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-full ${teamId === 'negro'
                            ? 'bg-gradient-to-r from-slate-500 to-slate-300'
                            : 'bg-gradient-to-r from-amber-600 to-amber-400'
                        }`}
                />
            </div>

            <p className="text-right text-xs text-slate-400 mt-1.5 tabular-nums">
                {percentage.toFixed(1)}%
            </p>
        </motion.div>
    );
}
