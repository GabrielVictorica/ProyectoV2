'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Filter, Loader2, AlertCircle, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCompetition } from '../hooks/useCompetition';
import { COMPETITION_START_DATE, COMPETITION_END_DATE, TEAMS_CONFIG } from '../constants';
import { TeamScoreCard } from './TeamScoreCard';
import { MvpCard } from './MvpCard';
import { BillingProgressBar } from './BillingProgressBar';
import { AgentRankingTable } from './AgentRankingTable';
import { WeeklyMatchCard } from './WeeklyMatchCard';
import { TeamManagement } from './TeamManagement';

export function CompetitionDashboard() {
    const [startDate, setStartDate] = useState(COMPETITION_START_DATE);
    const [endDate, setEndDate] = useState(COMPETITION_END_DATE);
    const [showFilters, setShowFilters] = useState(false);

    const { data: auth } = useAuth();
    const isGod = auth?.role === 'god';

    const { data, isLoading, error } = useCompetition(startDate, endDate);

    // Current week's MVP (last week in results)
    const currentWeekMvp = useMemo(() => {
        if (!data?.weeklyResults?.length) return null;
        const lastWeek = data.weeklyResults[data.weeklyResults.length - 1];
        return lastWeek?.mvp || null;
    }, [data]);

    // All agents combined for the global ranking
    const allAgents = useMemo(() => {
        if (!data?.teams) return [];
        return [
            ...(data.teams.negro?.members || []),
            ...(data.teams.dorado?.members || []),
        ].sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return (b.counts?.pre_listing || 0) - (a.counts?.pre_listing || 0);
        });
    }, [data]);

    // Win/Loss record
    const record = useMemo(() => {
        if (!data?.weeklyResults) return { negro: 0, dorado: 0, ties: 0 };
        return data.weeklyResults.reduce(
            (acc, w) => {
                if (w.negro > w.dorado) acc.negro++;
                else if (w.dorado > w.negro) acc.dorado++;
                else acc.ties++;
                return acc;
            },
            { negro: 0, dorado: 0, ties: 0 }
        );
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando datos de la Copa...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Error al cargar datos</p>
                    <p className="text-slate-600 text-xs mt-1">{(error as Error).message}</p>
                </div>
            </div>
        );
    }

    const negro = data?.teams?.negro;
    const dorado = data?.teams?.dorado;
    const negroWinning = (negro?.totalPoints || 0) >= (dorado?.totalPoints || 0);
    const doradoWinning = (dorado?.totalPoints || 0) > (negro?.totalPoints || 0);

    return (
        <div className="space-y-6 pb-10">
            {/* ── Header ───────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Copa de Productividad</h1>
                        <p className="text-xs text-slate-500">
                            {TEAMS_CONFIG.negro.emoji} Equipo Negro vs Equipo Dorado {TEAMS_CONFIG.dorado.emoji}
                            {record.negro + record.dorado + record.ties > 0 && (
                                <span className="ml-2 text-slate-600">
                                    ({record.negro}W - {record.dorado}W - {record.ties}E)
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                >
                    <CalendarRange className="w-4 h-4 mr-2" />
                    Filtrar fechas
                </Button>
            </motion.div>

            {/* ── Date Filters ────────────────────────────────────── */}
            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-end gap-3 bg-white/[0.03] rounded-xl border border-white/[0.06] p-4"
                >
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Desde</label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-white/5 border-white/10 text-white text-sm h-9"
                        />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Hasta</label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-white/5 border-white/10 text-white text-sm h-9"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setStartDate(COMPETITION_START_DATE);
                            setEndDate(COMPETITION_END_DATE);
                        }}
                        className="text-violet-400 hover:text-violet-300 text-xs"
                    >
                        Reset
                    </Button>
                </motion.div>
            )}

            {/* ── Scoreboard: Team vs Team ────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {negro && (
                    <TeamScoreCard
                        team={negro}
                        opponentPoints={dorado?.totalPoints || 0}
                        isWinning={negroWinning && !doradoWinning}
                        delay={0.1}
                    />
                )}
                {dorado && (
                    <TeamScoreCard
                        team={dorado}
                        opponentPoints={negro?.totalPoints || 0}
                        isWinning={doradoWinning}
                        delay={0.2}
                    />
                )}
            </div>

            {/* ── Billing Progress ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BillingProgressBar teamId="negro" facturacion={negro?.facturacion || 0} delay={0.3} />
                <BillingProgressBar teamId="dorado" facturacion={dorado?.facturacion || 0} delay={0.35} />
            </div>

            {/* ── MVP Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MvpCard title="MVP de la Semana" mvp={currentWeekMvp} delay={0.4} />
                <MvpCard title="MVP General" mvp={data?.overallMvp || null} delay={0.45} />
            </div>

            {/* ── Bottom: Ranking + Weekly ────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Ranking takes 2 cols */}
                <div className="xl:col-span-2">
                    <AgentRankingTable agents={allAgents} delay={0.5} />
                </div>
                {/* Weekly match takes 1 col */}
                <div>
                    <WeeklyMatchCard results={data?.weeklyResults || []} delay={0.55} />
                </div>
            </div>

            {/* ── Team Management (God only) ─────────────────────── */}
            {isGod && data?.members && (
                <TeamManagement
                    members={data.members}
                    organizationId={auth?.organizationId || auth?.profile?.organization_id || undefined}
                />
            )}
        </div>
    );
}
