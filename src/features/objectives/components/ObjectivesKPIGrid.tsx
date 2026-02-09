'use client';

import { motion } from 'framer-motion';
import { ObjectivesKPICard } from './ObjectivesKPICard';
import {
    Target,
    DollarSign,
    Percent,
    CheckCircle2,
    Layers,
    TrendingUp,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    BarChart3,
    Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { ViewAgentProgress, ViewTeamObjectivesSummary } from '../types/supabase';

interface ObjectivesKPIGridProps {
    isTeamView: boolean;
    teamSummary: ViewTeamObjectivesSummary | null;
    progress: ViewAgentProgress | null;
    isLoading: boolean;
    variant?: 'financial' | 'operational';
}

export function ObjectivesKPIGrid({
    isTeamView,
    teamSummary,
    progress,
    isLoading,
    variant = 'financial', // Por defecto financiero si no se especifica
}: ObjectivesKPIGridProps) {
    // Modo Equipo
    if (isTeamView) {
        if (variant === 'operational') return null; // En team view por defecto mostramos el resumen financiero arriba
        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <ObjectivesKPICard
                        title="Agentes con Meta"
                        value={teamSummary?.agents_with_goals || 0}
                        icon={<Users className="h-5 w-5" />}
                        loading={isLoading}
                        color="purple"
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
                    <ObjectivesKPICard
                        title="Meta Total"
                        value={formatCurrency(teamSummary?.total_team_goal || 0)}
                        icon={<Target className="h-5 w-5" />}
                        loading={isLoading}
                        color="blue"
                        isString
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
                    <ObjectivesKPICard
                        title="Ingresos Brutos"
                        value={formatCurrency(teamSummary?.total_team_income || 0)}
                        icon={<DollarSign className="h-5 w-5" />}
                        loading={isLoading}
                        color="green"
                        isString
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
                    <ObjectivesKPICard
                        title="Progreso Prom."
                        value={`${(teamSummary?.avg_progress || 0).toFixed(1)}%`}
                        icon={<Percent className="h-5 w-5" />}
                        loading={isLoading}
                        color="cyan"
                        isString
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.2 }}>
                    <ObjectivesKPICard
                        title="Puntas Cerradas"
                        value={teamSummary?.total_puntas_closed || 0}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        loading={isLoading}
                        color="green"
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.25 }}>
                    <ObjectivesKPICard
                        title="Puntas Faltantes"
                        value={teamSummary?.total_puntas_needed || 0}
                        icon={<Layers className="h-5 w-5" />}
                        loading={isLoading}
                        color="amber"
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.3 }} className="col-span-2">
                    <ObjectivesKPICard
                        title="Gap al Objetivo"
                        value={formatCurrency((teamSummary?.total_team_goal || 0) - (teamSummary?.total_team_income || 0))}
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={isLoading}
                        color="yellow"
                        isString
                    />
                </motion.div>
            </div>
        );
    }

    if (progress) {
        const isOnTrack = (progress.run_rate_projection || 0) >= progress.annual_billing_goal;
        const hasListingsGoal = (progress.listings_goal_annual || 0) > 0;

        // MODO INDIVIDUAL UNIFICADO (7 Tarjetas)
        // Eliminamos variantes 'financial' vs 'operational' para la vista individual.
        // Mostramos todo en un solo bloque limpio.

        // Si se nos pasa 'variant="operational"', retornamos null para no renderizar nada (ya que todo estará en el principal)
        // O mejor, modificaremos ObjectivesPage para no llamarlo.
        // Aquí asumiremos que si variant es 'financial' (default), renderizamos TODO el set unificado.

        if (variant === 'operational') return null;

        const criticalNumberTarget = Math.ceil(progress.weekly_pl_pb_target || 5.1);

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Reuniones Verdes (Semanal) */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <ObjectivesKPICard
                        title="Reuniones Verdes"
                        value={progress.weekly_green_meetings_count || 0}
                        icon={<Users className="h-5 w-5" />}
                        loading={isLoading}
                        color="green"
                        showProgress={true}
                        progressValue={progress.weekly_green_meetings_count || 0}
                        progressTotal={15}
                        subtitle="Semana Actual"
                    />
                </motion.div>

                {/* 2. Puntas Cerradas (Anual) */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
                    <ObjectivesKPICard
                        title="Puntas Cerradas"
                        value={progress.actual_puntas_count || 0}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        loading={isLoading}
                        color="blue"
                        showProgress={true}
                        progressValue={progress.actual_puntas_count || 0}
                        progressTotal={Math.ceil((progress.actual_puntas_count || 0) + (progress.estimated_puntas_needed || 0))}
                        subtitle={`Meta Anual: ${Math.ceil((progress.actual_puntas_count || 0) + (progress.estimated_puntas_needed || 0))}`}
                    />
                </motion.div>

                {/* 3. Número Crítico (Semanal) */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
                    <ObjectivesKPICard
                        title="Número Crítico"
                        value={progress.weekly_critical_activities_count || 0}
                        icon={<Activity className="h-5 w-5" />}
                        loading={isLoading}
                        color="amber"
                        showProgress={true}
                        progressValue={progress.weekly_critical_activities_count || 0}
                        progressTotal={criticalNumberTarget}
                        subtitle={`Meta Semanal: ${criticalNumberTarget}`}
                    />
                </motion.div>
            </div>
        );

    }

    // Empty state - no goal configured
    const isFinancial = variant === 'financial';
    const gridClass = isFinancial ? 'lg:grid-cols-5' : 'lg:grid-cols-4';
    const count = isFinancial ? 5 : 4;

    return (
        <div className={`grid grid-cols-2 sm:grid-cols-4 ${gridClass} gap-4`}>
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                    <ObjectivesKPICard
                        title="—"
                        value="—"
                        icon={<Target className="h-5 w-5" />}
                        loading={false}
                        color="blue"
                        isString
                    />
                </motion.div>
            ))}
        </div>
    );
}
