'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Target, ArrowRight, CalendarDays, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import type { ViewAgentProgress } from '../types/supabase';
import { cn } from '@/lib/utils';
import { MagicCard } from '@/components/ui/magic-card';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';

interface ObjectivesListingsFunnelProps {
    progress: ViewAgentProgress | null;
    isLoading: boolean;
}

export function ObjectivesListingsFunnel({ progress, isLoading }: ObjectivesListingsFunnelProps) {
    if (isLoading) {
        return <div className="h-48 bg-slate-800/50 animate-pulse rounded-xl" />;
    }

    if (!progress || !progress.listings_goal_annual) {
        return null;
    }

    // --- Datos principales ---
    const plNeeded = progress.required_prelistings_annual || 0;
    const conversion = progress.pl_to_listing_conversion_target || 40;
    const listingsGoal = progress.listings_goal_annual;
    const weeklyPl = progress.required_prelistings_weekly || 0;
    const minimumRequiredAnnual = progress.minimum_listings_required || 0;
    const actualListings = progress.actual_active_listings_count || 0;
    const weeklyActivities = progress.weekly_critical_activities_count || 0;

    // --- Periodo ---
    const startDate = progress.listings_goal_start_date;
    const endDate = progress.listings_goal_end_date;
    const hasPeriod = startDate && endDate;

    // --- Alerta de periodo vencido ---
    const isExpired = hasPeriod ? new Date() > new Date(`${endDate}T23:59:59`) : false;
    const missedGoal = Boolean(isExpired && actualListings < listingsGoal && listingsGoal > 0);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    // --- Cálculo proporcional del mínimo al periodo (Opción B) ---
    let periodWeeks = progress.working_weeks || 48;
    if (hasPeriod) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        periodWeeks = Math.max(1, diffDays / 7);
    }
    const annualWeeks = progress.working_weeks || 48;
    const periodRatio = hasPeriod ? periodWeeks / annualWeeks : 1;
    const minimumForPeriod = Math.ceil(minimumRequiredAnnual * periodRatio);

    // --- Porcentajes de progreso ---
    const listingsProgressPct = Math.min((actualListings / Math.max(listingsGoal, 1)) * 100, 100);
    const weeklyProgressPct = Math.min((weeklyActivities / Math.max(weeklyPl, 1)) * 100, 100);

    // --- Color del progreso de captaciones ---
    const getProgressColor = (pct: number) => {
        if (pct >= 100) return 'text-green-400';
        if (pct >= 67) return 'text-emerald-400';
        if (pct >= 34) return 'text-yellow-400';
        return 'text-rose-400';
    };

    const getProgressBg = (pct: number) => {
        if (pct >= 100) return 'from-green-500 to-emerald-500';
        if (pct >= 67) return 'from-emerald-500 to-teal-500';
        if (pct >= 34) return 'from-yellow-500 to-amber-500';
        return 'from-rose-500 to-red-500';
    };

    // --- Subtitle dinámico ---
    const subtitleText = `Necesitás ${plNeeded} pre-listings con ${conversion}% de conversión para captar ${listingsGoal} propiedades.`;

    return (
        <Card className={cn(
            "bg-slate-900/40 backdrop-blur-xl col-span-1 lg:col-span-2 overflow-hidden relative transition-colors duration-500",
            missedGoal ? "border-red-900/50" : "border-slate-800"
        )}>
            <BorderBeam
                size={200}
                duration={15}
                colorFrom={missedGoal ? "#ef4444" : "#a855f7"}
                colorTo={missedGoal ? "#f97316" : "#6366f1"}
                borderWidth={1.5}
            />
            <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Motor de Captaciones
                    {hasPeriod && (
                        <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(startDate)} - {formatDate(endDate)}
                        </span>
                    )}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">{subtitleText}</p>
            </CardHeader>
            <CardContent>
                <div className="relative py-4">
                    {/* Línea conectora animada */}
                    <div className="absolute top-1/2 left-[15%] w-[70%] h-px -translate-y-1/2 hidden md:block overflow-hidden">
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            className="h-full w-1/2 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-indigo-900/20" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 relative z-10 items-center">

                        {/* === PASO 1: PROSPECCIONES === */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                        >
                            <MagicCard
                                className="bg-slate-900/80 border-purple-500/20 rounded-xl p-5 shadow-lg shadow-purple-900/10 cursor-default"
                                gradientColor="rgba(168, 85, 247, 0.08)"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-purple-400">1</span>
                                    </div>
                                    <span className="text-[11px] uppercase font-bold text-purple-400 tracking-wider">Pre-listings</span>
                                </div>

                                {/* Número grande animado */}
                                <div className="flex items-baseline gap-2 mb-3">
                                    <div className="text-4xl font-black text-white">
                                        {plNeeded > 0 ? (
                                            <NumberTicker value={plNeeded} className="text-white" />
                                        ) : (
                                            <span>0</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {hasPeriod ? 'en el periodo' : 'anuales'}
                                    </span>
                                </div>

                                {/* Barra de progreso semanal */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold">Esta semana</span>
                                        <span className={cn("text-xs font-bold", getProgressColor(weeklyProgressPct))}>
                                            {weeklyActivities} / {Math.ceil(weeklyPl)}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-purple-900/30 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${weeklyProgressPct}%` }}
                                            transition={{ delay: 0.5, duration: 0.8 }}
                                            className={cn("h-full rounded-full bg-gradient-to-r", getProgressBg(weeklyProgressPct))}
                                        />
                                    </div>
                                </div>

                                {/* Meta semanal */}
                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5">
                                    <CalendarDays className="w-3 h-3 text-purple-400" />
                                    <span className="text-sm font-bold text-purple-300">
                                        ~{Math.ceil(weeklyPl)} / semana
                                    </span>
                                </div>
                            </MagicCard>
                        </motion.div>

                        {/* === PASO 2: CONVERSIÓN (Gauge Central) === */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25, duration: 0.5 }}
                            className="flex flex-col items-center justify-center py-2"
                        >
                            {/* Flechas de entrada/salida en desktop */}
                            <div className="hidden md:flex items-center gap-3">
                                <ArrowRight className="w-4 h-4 text-purple-500/40" />
                                <div className="relative">
                                    <AnimatedCircularProgressBar
                                        value={conversion}
                                        max={100}
                                        min={0}
                                        gaugePrimaryColor="#a855f7"
                                        gaugeSecondaryColor="rgba(168, 85, 247, 0.15)"
                                        className="size-28"
                                        showValue={false}
                                    />
                                    {/* Overlay con el label */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-white">{conversion}%</span>
                                        <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Conversión</span>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-indigo-500/40" />
                            </div>

                            {/* Mobile: sin flechas */}
                            <div className="md:hidden relative">
                                <AnimatedCircularProgressBar
                                    value={conversion}
                                    max={100}
                                    min={0}
                                    gaugePrimaryColor="#a855f7"
                                    gaugeSecondaryColor="rgba(168, 85, 247, 0.15)"
                                    className="size-28"
                                    showValue={false}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-white">{conversion}%</span>
                                    <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Conversión</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-2 text-center max-w-[140px]">
                                De cada 10 pre-listings, {Math.round(conversion / 10)} se convierten en captaciones
                            </p>
                        </motion.div>

                        {/* === PASO 3: CAPTACIONES === */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <MagicCard
                                className="bg-slate-900/80 border-indigo-500/20 rounded-xl p-5 shadow-lg shadow-indigo-900/10 cursor-default"
                                gradientColor="rgba(99, 102, 241, 0.08)"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-indigo-400">3</span>
                                    </div>
                                    <span className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider">Captaciones</span>
                                </div>

                                {/* Número grande + progreso */}
                                <div className="flex items-baseline gap-2 mb-1">
                                    <div className="text-4xl font-black text-white">
                                        {listingsGoal > 0 ? (
                                            <NumberTicker value={listingsGoal} className="text-white" />
                                        ) : (
                                            <span>0</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">meta</span>
                                </div>

                                {/* Actual vs meta */}
                                <div className="flex items-baseline gap-1.5 mb-3">
                                    <span className={cn("text-lg font-bold", getProgressColor(listingsProgressPct))}>
                                        {actualListings}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        captadas ({listingsProgressPct.toFixed(0)}%)
                                    </span>
                                </div>

                                {/* Barra de progreso */}
                                <div className="h-2 w-full bg-indigo-900/30 rounded-full overflow-hidden mb-3">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${listingsProgressPct}%` }}
                                        transition={{ delay: 0.7, duration: 0.8 }}
                                        className={cn("h-full rounded-full bg-gradient-to-r", getProgressBg(listingsProgressPct))}
                                    />
                                </div>

                                {/* Estado vs mínimo proporcional */}
                                <div className="pt-3 border-t border-white/5">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                                        <span className="text-[11px] text-slate-400">
                                            Faltan <span className="font-bold text-white">{Math.max(0, listingsGoal - actualListings)}</span> para la meta
                                        </span>
                                    </div>
                                </div>
                            </MagicCard>
                        </motion.div>
                    </div>
                </div>

                {/* Alerta de objetivo no cumplido */}
                {missedGoal && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                        className="mt-6 mb-2 p-4 rounded-xl bg-red-950/40 border border-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 animate-pulse" />
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-2.5 bg-red-500/20 rounded-xl relative">
                                <div className="absolute inset-0 bg-red-500/20 animate-ping rounded-xl" />
                                <AlertTriangle className="w-6 h-6 text-red-500 relative z-10" />
                            </div>
                            <div className="flex-1">
                                <div className="mb-0.5">
                                    <AnimatedShinyText className="inline-flex items-center justify-center px-0 py-0 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                                        <span className="text-[13px] font-black text-red-400 uppercase tracking-widest">¡Plazo Vencido!</span>
                                    </AnimatedShinyText>
                                </div>
                                <p className="text-xs text-red-300/80 leading-relaxed max-w-lg mt-1">
                                    El periodo finalizó el <span className="font-bold text-red-200">{formatDate(endDate!)}</span> y no se alcanzó la meta de <span className="font-bold text-red-200">{listingsGoal}</span> captaciones. 
                                    Actualmente tienes <span className="font-bold text-red-200">{actualListings}</span>.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Nota informativa: Mínimo anual proporcional */}
                {minimumRequiredAnnual > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-2 px-4 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-start gap-2.5"
                    >
                        <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div className="text-[11px] text-slate-500 leading-relaxed">
                            {hasPeriod ? (
                                <>
                                    Tu facturación anual requiere un mínimo de{' '}
                                    <span className="font-bold text-slate-300">{minimumRequiredAnnual}</span> captaciones/año.
                                    {' '}Proporcionalmente, necesitás al menos{' '}
                                    <span className={cn(
                                        "font-bold",
                                        listingsGoal >= minimumForPeriod ? "text-emerald-400" : "text-amber-400"
                                    )}>
                                        {minimumForPeriod}
                                    </span>
                                    {' '}en este periodo.
                                    {listingsGoal >= minimumForPeriod ? (
                                        <span className="text-emerald-400/80"> ✓ Tu meta de {listingsGoal} está por encima.</span>
                                    ) : (
                                        <span className="text-amber-400/80"> Tu meta de {listingsGoal} está por debajo del mínimo proporcional.</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    Para alcanzar tu facturación, necesitás un inventario mínimo de{' '}
                                    <span className={cn(
                                        "font-bold",
                                        listingsGoal >= minimumRequiredAnnual ? "text-emerald-400" : "text-amber-400"
                                    )}>
                                        {minimumRequiredAnnual}
                                    </span>
                                    {' '}captaciones anuales.
                                    {listingsGoal >= minimumRequiredAnnual ? (
                                        <span className="text-emerald-400/80"> ✓ Tu meta está alineada.</span>
                                    ) : (
                                        <span className="text-amber-400/80"> Tu meta actual está por debajo.</span>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
