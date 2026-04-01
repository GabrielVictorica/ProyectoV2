'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Target,
    Calendar,
    Building2,
    Users,
    RefreshCw,
    Zap,
    ArrowLeft,
    UserCircle,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface Organization {
    id: string;
    name: string;
}

interface Agent {
    id: string;
    first_name: string;
    last_name: string;
}

export type PeriodFilter = 'annual' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'S1' | 'S2';

interface ObjectivesHeaderProps {
    isTeamView: boolean;
    isGod: boolean;
    isGodOrParent: boolean;
    selectedYear: number;
    selectedOrg: string;
    selectedAgentId: string | undefined;
    selectedPeriod: PeriodFilter;
    years: number[];
    organizations: Organization[];
    filteredAgents: Agent[];
    hasActiveFilters: boolean;
    onYearChange: (year: number) => void;
    onOrgChange: (org: string) => void;
    onAgentChange: (agentId: string) => void;
    onPeriodChange: (period: PeriodFilter) => void;
    onBack: () => void;
    onResetFilters: () => void;
    onOpenDialog: () => void;
}

export function ObjectivesHeader({
    isTeamView,
    isGod,
    isGodOrParent,
    selectedYear,
    selectedOrg,
    selectedAgentId,
    selectedPeriod,
    years,
    organizations,
    filteredAgents,
    hasActiveFilters,
    onYearChange,
    onOrgChange,
    onAgentChange,
    onPeriodChange,
    onBack,
    onResetFilters,
    onOpenDialog,
}: ObjectivesHeaderProps) {
    const { data: auth } = useAuth();
    const currentUserId = auth?.profile?.id;
    const isCurrentUserSelected = selectedAgentId === currentUserId;

    return (
        <div className="space-y-3">
            {/* Fila 1: Título + Botón Ajustar Meta */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isGodOrParent && !isTeamView && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Volver a vista de equipo"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            {isTeamView ? 'Objetivos del Equipo' : 'Mis Objetivos'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-blue-500" />
                            {isTeamView
                                ? 'Supervisión de metas y progreso de todos los agentes'
                                : 'Administra tus metas financieras y visualiza tu camino al éxito'}
                        </p>
                    </div>
                </div>

                {!isTeamView && selectedAgentId && (
                    <Button
                        onClick={onOpenDialog}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        Ajustar Meta
                    </Button>
                )}
            </div>

            {/* Fila 2: Filtros alineados en una línea */}
            <div className="flex items-center gap-2 flex-wrap">
                <Select
                    value={String(selectedYear)}
                    onValueChange={(v) => onYearChange(parseInt(v))}
                >
                    <SelectTrigger className="w-[110px] h-9 bg-slate-800/60 border-slate-700/50 text-white text-sm">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                        {years.map((year) => (
                            <SelectItem key={year} value={String(year)} className="text-white hover:bg-slate-700">
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedPeriod}
                    onValueChange={(v) => onPeriodChange(v as PeriodFilter)}
                >
                    <SelectTrigger className="w-[130px] h-9 bg-slate-800/60 border-slate-700/50 text-white text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="annual" className="text-white hover:bg-slate-700">Año Completo</SelectItem>
                        <SelectItem value="S1" className="text-white hover:bg-slate-700">1er Semestre</SelectItem>
                        <SelectItem value="S2" className="text-white hover:bg-slate-700">2do Semestre</SelectItem>
                        <SelectItem value="Q1" className="text-white hover:bg-slate-700">Q1 (Ene-Mar)</SelectItem>
                        <SelectItem value="Q2" className="text-white hover:bg-slate-700">Q2 (Abr-Jun)</SelectItem>
                        <SelectItem value="Q3" className="text-white hover:bg-slate-700">Q3 (Jul-Sep)</SelectItem>
                        <SelectItem value="Q4" className="text-white hover:bg-slate-700">Q4 (Oct-Dic)</SelectItem>
                    </SelectContent>
                </Select>

                {isGod && (
                    <Select value={selectedOrg} onValueChange={onOrgChange}>
                        <SelectTrigger className="w-[150px] h-9 bg-slate-800/60 border-slate-700/50 text-white text-sm">
                            <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                            <SelectValue placeholder="Inmobiliaria" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-white">Todas</SelectItem>
                            {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id} className="text-white">
                                    {org.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {isGodOrParent && (
                    <Select
                        value={selectedAgentId || 'all'}
                        onValueChange={(v) => onAgentChange(v === 'all' ? 'all' : v)}
                    >
                        <SelectTrigger className="w-[170px] h-9 bg-slate-800/60 border-slate-700/50 text-white text-sm">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                            <SelectValue placeholder="Agente" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-white">Todo el Equipo</SelectItem>
                            {filteredAgents.map((ag) => (
                                <SelectItem key={ag.id} value={ag.id} className="text-white">
                                    {ag.first_name} {ag.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {isGodOrParent && (
                    <Button
                        variant={isCurrentUserSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            if (currentUserId) {
                                onAgentChange(currentUserId);
                            }
                        }}
                        className={`h-9 border-slate-700/50 ${isCurrentUserSelected
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        disabled={isCurrentUserSelected}
                    >
                        <UserCircle className="h-3.5 w-3.5 mr-1.5" />
                        Mis Objetivos
                    </Button>
                )}

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onResetFilters}
                        className="h-9 w-9 text-slate-500 hover:text-white"
                        title="Limpiar filtros"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}
