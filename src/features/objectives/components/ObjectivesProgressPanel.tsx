'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { ViewAgentProgress, ViewTeamObjectivesSummary } from '../types/supabase';

interface ObjectivesProgressPanelProps {
    isTeamView: boolean;
    teamSummary: ViewTeamObjectivesSummary | null;
    progress: ViewAgentProgress | null;
    isLoading: boolean;
    onOpenDialog: () => void;
}

export function ObjectivesProgressPanel({
    isTeamView,
    teamSummary,
    progress,
    isLoading,
    onOpenDialog,
}: ObjectivesProgressPanelProps) {
    if (isLoading) {
        return (
            <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 overflow-hidden">
                <CardContent className="py-12 text-center">
                    <div className="animate-pulse space-y-4">
                        <div className="h-16 bg-slate-700 rounded w-48 mx-auto" />
                        <div className="h-4 bg-slate-700 rounded w-full max-w-2xl mx-auto" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <AnimatePresence mode="wait">
            {isTeamView ? (
                <motion.div
                    key="team-progress"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 overflow-hidden">
                        <CardContent className="py-12 text-center space-y-8">
                            <div className="space-y-2">
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                                    Progreso Colectivo del Equipo
                                </p>
                                <p className="text-7xl font-black text-white">
                                    {(teamSummary?.avg_progress || 0).toFixed(1)}%
                                </p>
                            </div>
                            <div className="max-w-2xl mx-auto">
                                <div className="relative h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(teamSummary?.avg_progress || 0, 100)}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-2">
                                    <span>Ingresos: {formatCurrency(teamSummary?.total_team_income || 0)}</span>
                                    <span>Meta: {formatCurrency(teamSummary?.total_team_goal || 0)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : progress ? (
                <motion.div
                    key="individual-progress"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 overflow-hidden">
                        <CardContent className="py-10 px-6 md:px-10">
                            {(() => {
                                const isOnTrack = (progress.run_rate_projection || 0) >= progress.annual_billing_goal;
                                const progressPercentage = Math.min(progress.progress_percentage || 0, 100);

                                return (
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
                                        {/* Banner de Facturación (Ocupa 3/4 en desktop) */}
                                        <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group shadow-2xl">
                                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Target className="w-64 h-64 -mr-20 -mt-20" />
                                            </div>

                                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                                <div className="text-center md:text-left">
                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                                                        Ingresos Actuales
                                                    </p>
                                                    <p className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-sm">
                                                        {formatCurrency(progress.actual_gross_income)}
                                                    </p>
                                                </div>

                                                <div className="hidden md:block w-px h-16 bg-slate-800" />

                                                <div className="text-center md:text-right">
                                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                                                        Meta Anual {progress.year}
                                                    </p>
                                                    <p className="text-3xl md:text-4xl font-black text-blue-400/90 tracking-tight">
                                                        {formatCurrency(progress.annual_billing_goal)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Barra de Progreso Principal */}
                                            <div className="mt-10 relative">
                                                <div className="h-4 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 p-1">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progressPercentage}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center mt-3 px-1">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        {progressPercentage.toFixed(1)}% completado
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        Faltan {formatCurrency(progress.gap_to_goal || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sidebar de Status (Ocupa 1/4 en desktop) */}
                                        <div className="lg:col-span-1 flex flex-col gap-4">
                                            {/* Proyección */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex-1"
                                            >
                                                <div className="h-full bg-gradient-to-br from-purple-900/30 to-slate-900/50 border border-purple-500/20 rounded-2xl p-5 flex flex-col justify-center gap-2 group hover:border-purple-500/40 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Proyección</p>
                                                        <Activity className="w-4 h-4 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <p className="text-2xl font-black text-white leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {formatCurrency(progress.run_rate_projection || 0)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Ritmo anual estimado</p>
                                                </div>
                                            </motion.div>

                                            {/* Estado */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="flex-1"
                                            >
                                                <div className={`h-full bg-gradient-to-br ${isOnTrack ? 'from-emerald-900/30 to-slate-900/50 border-emerald-500/20' : 'from-amber-900/30 to-slate-900/50 border-amber-500/20'} rounded-2xl p-5 flex flex-col justify-center gap-2 group hover:opacity-90 transition-all border`}>
                                                    <div className="flex items-center justify-between">
                                                        <p className={`text-[10px] font-bold ${isOnTrack ? 'text-emerald-300' : 'text-amber-300'} uppercase tracking-widest`}>Estado</p>
                                                        {isOnTrack ?
                                                            <ArrowUpRight className="w-4 h-4 text-emerald-400" /> :
                                                            <ArrowDownRight className="w-4 h-4 text-amber-400" />
                                                        }
                                                    </div>
                                                    <p className="text-2xl font-black text-white leading-none">{isOnTrack ? 'En Camino' : 'Reforzar'}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{isOnTrack ? 'Vas directo a la meta' : 'Aumenta tu actividad'}</p>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <motion.div
                    key="no-goal"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 overflow-hidden">
                        <CardContent className="py-16 text-center space-y-6">
                            <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
                                <Target className="w-10 h-10 text-slate-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">
                                    No tienes un objetivo configurado
                                </h3>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    Define tu meta anual para empezar a trackear tu progreso y recibir insights personalizados.
                                </p>
                            </div>
                            <Button
                                size="lg"
                                onClick={onOpenDialog}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                            >
                                <Zap className="w-5 h-5 mr-2" />
                                Configurar Mi Meta
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )
            }
        </AnimatePresence >
    );
}
