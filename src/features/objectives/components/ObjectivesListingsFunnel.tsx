'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Target, ArrowDown, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ViewAgentProgress } from '../types/supabase';
import { cn } from '@/lib/utils';

interface ObjectivesListingsFunnelProps {
    progress: ViewAgentProgress | null;
    isLoading: boolean;
}

export function ObjectivesListingsFunnel({ progress, isLoading }: ObjectivesListingsFunnelProps) {
    if (isLoading) {
        return <div className="h-48 bg-slate-800/50 animate-pulse rounded-xl" />;
    }

    if (!progress || !progress.listings_goal_annual) {
        return null; // No mostrar si no hay meta de captaciones
    }

    const plNeeded = progress.required_prelistings_annual || 0;
    const conversion = progress.pl_to_listing_conversion_target || 40;
    const listingsGoal = progress.listings_goal_annual;
    const weeklyPl = progress.required_prelistings_weekly || 0;
    const minimumRequired = progress.minimum_listings_required || 0;

    const startDate = progress.listings_goal_start_date;
    const endDate = progress.listings_goal_end_date;
    const hasPeriod = startDate && endDate;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 col-span-1 lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Motor de Captaciones
                    {hasPeriod && (
                        <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            {formatDate(startDate)} - {formatDate(endDate)}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative py-6">
                    {/* Línea conectora de fondo */}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-purple-900 via-pink-900 to-indigo-900 -translate-y-1/2 hidden md:block opacity-30" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">

                        {/* Paso 1: Esfuerzo (PLs) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-4 text-center relative shadow-lg shadow-purple-900/10"
                        >
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold text-purple-400">
                                Esfuerzo Necesario
                            </div>
                            <div className="mt-2 text-left">
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className="text-4xl font-black text-white">{plNeeded}</p>
                                    <div className="flex flex-col items-end">
                                        <p className="text-xs text-purple-300 font-bold">
                                            {(progress.weekly_critical_activities_count || 0)} actual / {Math.ceil(weeklyPl)} meta sem
                                        </p>
                                        <span className={cn(
                                            "text-[10px] font-bold mt-0.5",
                                            ((progress.weekly_critical_activities_count || 0) / Math.max(weeklyPl, 1)) * 100 >= 100 ? "text-green-400" :
                                                ((progress.weekly_critical_activities_count || 0) / Math.max(weeklyPl, 1)) * 100 >= 67 ? "text-emerald-400" :
                                                    ((progress.weekly_critical_activities_count || 0) / Math.max(weeklyPl, 1)) * 100 >= 34 ? "text-yellow-400" : "text-rose-400"
                                        )}>
                                            {(((progress.weekly_critical_activities_count || 0) / Math.max(weeklyPl, 1)) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-purple-900/30 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(((progress.weekly_critical_activities_count || 0) / Math.max(weeklyPl, 1)) * 100, 100)}%` }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider text-center w-full">
                                    {hasPeriod ? 'Prelistings Periodo' : 'Prelistings Anuales'}
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5">
                                <p className="text-sm font-bold text-pink-400 flex items-center justify-center gap-1">
                                    <Calculator className="w-3 h-3" />
                                    {weeklyPl.toFixed(1)} / semana
                                </p>
                            </div>

                            {/* Flecha móvil para desktop */}
                            <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 text-purple-500/50">
                                <ArrowDown className="-rotate-90 w-6 h-6" />
                            </div>
                        </motion.div>

                        {/* Paso 2: Conversión */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-1 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                <div className="bg-slate-900 rounded-full w-32 h-32 flex flex-col items-center justify-center border-4 border-transparent">
                                    <span className="text-3xl font-black text-white">{conversion}%</span>
                                    <span className="text-[10px] uppercase text-slate-400 font-bold mt-1">Efectividad</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 text-center max-w-[150px]">
                                De cada 10 Prelistings, conviertes {Math.round(conversion / 10)} en captaciones.
                            </p>
                        </motion.div>

                        {/* Paso 3: Resultado (Listings) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-indigo-500/30 rounded-xl p-4 text-center relative shadow-lg"
                        >
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-900/80 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold text-indigo-300">
                                Objetivo Final
                            </div>
                            <div className="mt-2 text-left">
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className="text-4xl font-black text-white">{listingsGoal}</p>
                                    <div className="flex flex-col items-end">
                                        <p className="text-xs text-indigo-300 font-bold">
                                            {(progress.actual_active_listings_count || 0)} activos / {listingsGoal} meta
                                        </p>
                                        <span className={cn(
                                            "text-[10px] font-bold mt-0.5",
                                            ((progress.actual_active_listings_count || 0) / Math.max(listingsGoal, 1)) * 100 >= 100 ? "text-green-400" :
                                                ((progress.actual_active_listings_count || 0) / Math.max(listingsGoal, 1)) * 100 >= 67 ? "text-emerald-400" :
                                                    ((progress.actual_active_listings_count || 0) / Math.max(listingsGoal, 1)) * 100 >= 34 ? "text-yellow-400" : "text-rose-400"
                                        )}>
                                            {(((progress.actual_active_listings_count || 0) / Math.max(listingsGoal, 1)) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-indigo-900/30 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(((progress.actual_active_listings_count || 0) / Math.max(listingsGoal, 1)) * 100, 100)}%` }}
                                        className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
                                    />
                                </div>
                                <p className="text-xs text-indigo-200/70 font-medium uppercase tracking-wider text-center w-full">
                                    {hasPeriod ? 'Captaciones Periodo' : 'Captaciones Anuales'}
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-indigo-500/20 space-y-2">
                                <p className="text-xs text-indigo-300 w-full text-center">
                                    Base de tu inventario vendible
                                </p>
                                {minimumRequired > 0 && (
                                    <div className={cn(
                                        "flex items-center justify-center gap-1.5 text-[10px] font-bold rounded-full px-3 py-1 mx-auto w-fit",
                                        listingsGoal > minimumRequired
                                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                            : listingsGoal === minimumRequired
                                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                                : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                    )}>
                                        {listingsGoal > minimumRequired ? (
                                            <><CheckCircle2 className="w-3 h-3" /> Por encima del mínimo ({minimumRequired})</>
                                        ) : listingsGoal === minimumRequired ? (
                                            <><AlertTriangle className="w-3 h-3" /> Mínimo requerido</>
                                        ) : (
                                            <><AlertTriangle className="w-3 h-3" /> Por debajo del mínimo ({minimumRequired})</>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Flecha móvil para desktop (entrada) */}
                            <div className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 text-purple-500/50">
                                <ArrowDown className="-rotate-90 w-6 h-6" />
                            </div>
                        </motion.div>

                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
