'use client';

import React, { useState } from 'react';
import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';
import { useWeeklyActivities } from '../hooks/useWeeklyActivities';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Users,
    TrendingUp,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeeklyGrid } from './WeeklyGrid';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useObjectives } from '@/features/objectives/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers';
import type { UserWithOrganization, OrganizationWithBilling } from '@/features/admin/hooks/useAdmin';

export function WeeklyDashboard() {
    const { data: auth } = useAuth();
    const { isGod, isParent } = usePermissions();
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);

    // Initial load: set selectedAgentId to current user
    React.useEffect(() => {
        if (auth?.profile?.id && !selectedAgentId) {
            setSelectedAgentId(auth.profile.id);
        }
    }, [auth, selectedAgentId]);

    const { data: organizations } = useOrganizations();
    const { data: teamMembers, isLoading: teamLoading } = useTeamMembers();

    // Filtered users based on role and organization
    const filteredUsers = React.useMemo(() => {
        if (!teamMembers) return [];
        return (teamMembers as any[]).filter(u => {
            if (isGod) {
                return selectedOrg === 'all' || u.organization_id === selectedOrg;
            }
            // Los Parents y Externos ya vienen filtrados por RLS del Server Action
            return true;
        });
    }, [teamMembers, isGod, selectedOrg]);

    const { weeklyData, isLoading } = useWeeklyActivities(currentWeekStart, selectedAgentId);

    const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
    const prevWeek = () => setCurrentWeekStart(subDays(currentWeekStart, 7));
    const goToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Calculate KPIs from weeklyData
    const calculateKPIs = () => {
        if (!weeklyData) return { greenCount: 0, criticalCount: 0, referralCount: 0, plCount: 0 };

        let greenCount = 0;
        let criticalCount = 0;
        let referralCount = 0;
        let plCount = 0;

        Object.values(weeklyData).forEach(day => {
            // Add transactions (Cierres) to the total count
            greenCount += (day.transactionCount || 0);

            day.activities.forEach(act => {
                // Sum all activities except referrals
                if (act.type !== 'referido') {
                    greenCount++;
                }

                if (act.type === 'pre_listing' || act.type === 'pre_buying') criticalCount++;
                if (act.type === 'referido') referralCount++;
                if (act.type === 'pre_listing') plCount++;
            });
        });

        return { greenCount, criticalCount, referralCount, plCount };
    };

    const totals = calculateKPIs();

    // Fetch objectives for dynamic targets
    const currentYear = new Date().getFullYear();
    const targetAgentForObjectives = selectedAgentId || auth?.profile?.id;
    const { progress } = useObjectives(currentYear, targetAgentForObjectives);

    // Targets rounded up as requested
    const GREEN_MEETINGS_TARGET = 15;
    const REFERRALS_TARGET = 2;
    const CRITICAL_TARGET = Math.ceil(Number(progress?.weekly_pl_pb_target)) || 5;
    const PL_TARGET = Math.ceil(Number(progress?.required_prelistings_weekly)) || 3;

    const getProgressInfo = (value: number, target: number) => {
        const percentage = Math.round((value / target) * 100);
        const cappedPercentage = Math.min(percentage, 100);

        let colorClass = 'bg-red-500';
        if (percentage >= 100) colorClass = 'bg-green-400 animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.5)]';
        else if (percentage >= 67) colorClass = 'bg-emerald-500';
        else if (percentage >= 34) colorClass = 'bg-yellow-500';

        return { percentage, cappedPercentage, isOver: percentage >= 100, colorClass };
    };

    const kpis = [
        {
            label: 'Reuniones Verdes',
            value: totals.greenCount,
            target: GREEN_MEETINGS_TARGET,
            icon: Users,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'N° Crítico (PL+PB)',
            value: totals.criticalCount,
            target: CRITICAL_TARGET,
            icon: TrendingUp,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10'
        },
        {
            label: 'Solo PL',
            value: totals.plCount,
            target: PL_TARGET,
            icon: Calendar,
            color: 'text-fuchsia-400',
            bg: 'bg-fuchsia-500/10'
        },
        {
            label: 'Referidos',
            value: totals.referralCount,
            target: REFERRALS_TARGET,
            icon: CheckCircle2,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Mi Semana
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="h-4 w-4 text-violet-400" />
                        <p className="text-white/40">Gestión de actividades de alto valor</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Filters - Only for superiors */}
                    {(isGod || isParent) && (
                        <div className="flex items-center gap-2 glass p-1.5 rounded-2xl border border-white/[0.08]">
                            {/* Org Selector (God only) */}
                            {isGod && (
                                <select
                                    value={selectedOrg}
                                    onChange={(e) => {
                                        setSelectedOrg(e.target.value);
                                        setSelectedAgentId(undefined); // Reset agent on org change
                                    }}
                                    className="bg-transparent text-sm font-medium text-white/60 focus:outline-none px-3 py-1.5 rounded-xl hover:bg-white/[0.04] cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900">Todas las oficinas</option>
                                    {(organizations as OrganizationWithBilling[])?.map(org => (
                                        <option key={org.id} value={org.id} className="bg-slate-900">{org.name}</option>
                                    ))}
                                </select>
                            )}

                            {/* Agent Selector */}
                            <select
                                value={selectedAgentId || ''}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="bg-transparent text-sm font-medium text-white/60 focus:outline-none px-3 py-1.5 rounded-xl hover:bg-white/[0.04] cursor-pointer"
                            >
                                <option value="" disabled className="bg-slate-900">Seleccionar agente</option>
                                {(filteredUsers as any[]).map(user => (
                                    <option key={user.id} value={user.id} className="bg-slate-900">
                                        {user.first_name} {user.last_name} {user.id === auth?.profile?.id ? '(Yo)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Week Navigation */}
                    <div className="flex items-center gap-3 glass p-1.5 rounded-2xl border border-white/[0.08]">
                        <Button variant="ghost" size="icon" onClick={prevWeek} className="text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] rounded-xl border border-white/[0.04]">
                            <Calendar className="h-4 w-4 text-violet-400" />
                            <span className="text-sm font-medium whitespace-nowrap min-w-[180px] text-center capitalize">
                                {format(currentWeekStart, "d 'de' MMM", { locale: es })} - {format(addDays(currentWeekStart, 6), "d 'de' MMM", { locale: es })}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={nextWeek} className="text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        <div className="w-px h-6 bg-white/[0.08] mx-1" />
                        <Button variant="ghost" onClick={goToday} className="text-xs font-medium text-violet-400 hover:bg-violet-500/10 rounded-xl px-4">
                            Hoy
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => {
                    const { percentage, cappedPercentage, isOver, colorClass } = getProgressInfo(kpi.value, kpi.target);

                    return (
                        <div key={i} className="glass rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 bg-gradient-to-br from-white/[0.02] to-transparent rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500" />

                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className={`p-3 rounded-xl ${kpi.bg} border border-white/[0.04]`}>
                                        <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-1 rounded-lg border",
                                        isOver
                                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                                            : "bg-white/5 text-white/40 border-white/10"
                                    )}>
                                        META: {kpi.target}
                                    </span>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-white/40">{kpi.label}</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        {isLoading ? (
                                            <div className="h-8 w-12 bg-white/5 animate-pulse rounded-md mt-1" />
                                        ) : (
                                            <>
                                                <p className="text-3xl font-bold text-white leading-none">{kpi.value}</p>
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    percentage >= 100 ? "text-green-400" :
                                                        percentage >= 67 ? "text-emerald-400" :
                                                            percentage >= 34 ? "text-yellow-400" : "text-red-400"
                                                )}>
                                                    {percentage}%
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Progress
                                        value={isLoading ? 0 : cappedPercentage}
                                        className="h-1.5 bg-white/5"
                                        indicatorClassName={colorClass}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="glass rounded-3xl border border-white/[0.08] overflow-hidden">
                <WeeklyGrid
                    weekStart={currentWeekStart}
                    data={weeklyData || {}}
                    isLoading={isLoading}
                    agentId={selectedAgentId}
                />
            </div>
        </div>
    );
}
