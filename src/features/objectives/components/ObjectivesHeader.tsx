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

interface ObjectivesHeaderProps {
    isTeamView: boolean;
    isGod: boolean;
    isGodOrParent: boolean;
    selectedYear: number;
    selectedOrg: string;
    selectedAgentId: string | undefined;
    years: number[];
    organizations: Organization[];
    filteredAgents: Agent[];
    hasActiveFilters: boolean;
    onYearChange: (year: number) => void;
    onOrgChange: (org: string) => void;
    onAgentChange: (agentId: string) => void;
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
    years,
    organizations,
    filteredAgents,
    hasActiveFilters,
    onYearChange,
    onOrgChange,
    onAgentChange,
    onBack,
    onResetFilters,
    onOpenDialog,
}: ObjectivesHeaderProps) {
    const { data: auth } = useAuth();
    const currentUserId = auth?.profile?.id;
    const isCurrentUserSelected = selectedAgentId === currentUserId;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                {/* Botón Volver (solo cuando God/Parent ve un agente individual) */}
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
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {isTeamView ? 'Objetivos del Equipo' : 'Mis Objetivos'}
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        {isTeamView
                            ? 'Supervisión de metas y progreso de todos los agentes'
                            : 'Administra tus metas financieras y visualiza tu camino al éxito'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                {/* Selector Año */}
                <Select
                    value={String(selectedYear)}
                    onValueChange={(v) => onYearChange(parseInt(v))}
                >
                    <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700 text-white">
                        <Calendar className="h-4 w-4 mr-2" />
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

                {/* Selector Org (Solo Dios) */}
                {isGod && (
                    <Select value={selectedOrg} onValueChange={onOrgChange}>
                        <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white">
                            <Building2 className="h-4 w-4 mr-2" />
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

                {/* Selector Agente (God/Parent) */}
                {isGodOrParent && (
                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedAgentId || 'all'}
                            onValueChange={(v) => onAgentChange(v === 'all' ? 'all' : v)}
                        >
                            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                                <Users className="h-4 w-4 mr-2" />
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

                        {/* Botón Mis Objetivos (Acceso rápido) */}
                        <Button
                            variant={isCurrentUserSelected ? 'default' : 'outline'}
                            onClick={() => {
                                if (currentUserId) {
                                    onAgentChange(currentUserId);
                                }
                            }}
                            className={`border-slate-700 ${isCurrentUserSelected
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                }`}
                            disabled={isCurrentUserSelected}
                        >
                            <UserCircle className="h-4 w-4 mr-2" />
                            Mis Objetivos
                        </Button>
                    </div>
                )}

                {/* Botón Limpiar Filtros */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onResetFilters}
                        className="text-slate-500 hover:text-white"
                        title="Limpiar filtros"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                )}

                {/* Botón Ajustar (Solo vista individual) */}
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
        </div>
    );
}
