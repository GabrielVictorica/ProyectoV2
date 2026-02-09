'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
    useObjectives,
    useTeamObjectivesSummary,
    useAgentsObjectivesList,
    useAgentSplit,
} from '../hooks/useObjectives';
import { GoalSettingDialog } from './GoalSettingDialog';
import { ObjectivesHeader } from './ObjectivesHeader';
import { ObjectivesKPIGrid } from './ObjectivesKPIGrid';
import { ObjectivesProgressPanel } from './ObjectivesProgressPanel';
import { ObjectivesListingsFunnel } from './ObjectivesListingsFunnel';
import { ObjectivesAgentTable } from './ObjectivesAgentTable';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers';


export function ObjectivesPage() {
    const { data: auth, isLoading: isAuthLoading } = useAuth();
    const userRole = auth?.profile?.role;
    const isGod = userRole === 'god';
    const isParent = userRole === 'parent';
    const isGodOrParent = isGod || isParent;

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Sincronizar selectedAgentId cuando auth carga (solo la primera vez)
    useEffect(() => {
        if (!isAuthLoading && auth?.profile && !isInitialized) {
            const role = auth.profile.role;
            const isGodOrParentRole = role === 'god' || role === 'parent';

            // Inicializar según el rol
            if (!isGodOrParentRole) {
                setSelectedAgentId(auth.profile.id);
            }
            // Si es God/Parent, mantener 'all'
            setIsInitialized(true);
        }
    }, [isAuthLoading, auth, isInitialized]);

    // Hooks para datos de filtros
    const { data: organizations } = useOrganizations();
    const { data: teamMembers } = useTeamMembers();
    // Determinar si estamos en vista de equipo
    // Es team view si es God/Parent Y está en 'all'
    const isTeamView = isGodOrParent && selectedAgentId === 'all';

    // El orgId efectivo para los hooks
    // Si es GOD, usa el seleccionado. Si es PARENT, forzamos su propia organización.
    const effectiveOrgId = useMemo(() => {
        if (isGod) return selectedOrg !== 'all' ? selectedOrg : undefined;
        if (isParent) return auth?.profile?.organization_id || undefined;
        return undefined;
    }, [isGod, isParent, selectedOrg, auth]);

    // El agentId efectivo para los hooks (undefined si es team view)
    const effectiveAgentId = isTeamView ? undefined : selectedAgentId;

    // Hooks de Objetivos
    const { progress, isLoading: isLoadingIndividual } = useObjectives(
        selectedYear,
        effectiveAgentId
    );

    const { data: teamSummary, isLoading: isLoadingTeam } = useTeamObjectivesSummary(
        selectedYear,
        effectiveOrgId
    );

    const { data: agentsList, isLoading: isLoadingAgentsList } = useAgentsObjectivesList(
        selectedYear,
        effectiveOrgId
    );

    // Hook optimizado para obtener el split del agente
    const { data: agentSplit } = useAgentSplit(effectiveAgentId);

    const isLoading = isAuthLoading || (isTeamView ? isLoadingTeam : isLoadingIndividual);

    // Años para selector
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Agentes filtrados por organización
    const filteredAgents = useMemo(() => {
        if (!teamMembers) return [];
        return teamMembers.filter((u) => {
            if (isGod) {
                return selectedOrg === 'all' || u.organization_id === selectedOrg;
            }
            // Parents y Externos ya vienen filtrados por RLS/Server Action
            return true;
        });
    }, [teamMembers, isGod, selectedOrg]);

    // Handlers
    const handleResetFilters = () => {
        setSelectedYear(currentYear);
        setSelectedOrg('all');
        setSelectedAgentId(isGodOrParent ? 'all' : (auth?.profile?.id || 'all'));
    };

    const handleBack = () => {
        setSelectedAgentId('all');
    };

    const handleSelectAgent = (agentId: string) => {
        setSelectedAgentId(agentId);
    };

    const hasActiveFilters =
        selectedYear !== currentYear ||
        selectedOrg !== 'all' ||
        (isGodOrParent && selectedAgentId !== 'all');

    return (
        <motion.div
            className="space-y-6 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header con filtros */}
            <ObjectivesHeader
                isTeamView={isTeamView}
                isGod={isGod}
                isGodOrParent={isGodOrParent}
                selectedYear={selectedYear}
                selectedOrg={selectedOrg}
                selectedAgentId={selectedAgentId}
                years={years}
                organizations={organizations || []}
                filteredAgents={filteredAgents}
                hasActiveFilters={hasActiveFilters}
                onYearChange={setSelectedYear}
                onOrgChange={setSelectedOrg}
                onAgentChange={handleSelectAgent}
                onBack={handleBack}
                onResetFilters={handleResetFilters}
                onOpenDialog={() => setIsDialogOpen(true)}
            />

            {/* Grid de KPIs */}
            {/* Grid de KPIs - Sección Financiera */}
            <motion.div
                key={`kpi-grid-${isTeamView}-financial`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                <ObjectivesKPIGrid
                    isTeamView={isTeamView}
                    teamSummary={teamSummary || null}
                    progress={progress || null}
                    isLoading={isLoading}
                    variant="financial"
                />
            </motion.div>



            {/* Panel de Progreso Central */}
            <motion.div
                key={`progress-panel-${isTeamView}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
            >
                <ObjectivesProgressPanel
                    isTeamView={isTeamView}
                    teamSummary={teamSummary || null}
                    progress={progress || null}
                    isLoading={isLoading}
                    onOpenDialog={() => setIsDialogOpen(true)}
                />
            </motion.div>

            {/* Embudo de Captaciones (solo vista individual) */}
            {!isTeamView && (
                <motion.div
                    key="funnel-metrics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.2 }}
                >
                    <ObjectivesListingsFunnel
                        progress={progress || null}
                        isLoading={isLoading}
                    />
                </motion.div>
            )}

            {/* Tabla de Agentes (solo en vista de equipo) */}
            {isTeamView && (
                <motion.div
                    key="agent-table"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ObjectivesAgentTable
                        agents={agentsList || []}
                        isLoading={isLoadingAgentsList}
                        onSelectAgent={handleSelectAgent}
                    />
                </motion.div>
            )}

            {/* Dialog para configurar objetivo */}
            {effectiveAgentId && (
                <GoalSettingDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    agentId={effectiveAgentId}
                    agentName={
                        teamMembers?.find((u: { id: string }) => u.id === effectiveAgentId)
                            ? `${teamMembers.find((u: { id: string }) => u.id === effectiveAgentId)?.first_name} ${teamMembers.find((u: { id: string }) => u.id === effectiveAgentId)?.last_name}`
                            : 'Agente'
                    }
                    year={selectedYear}
                    agentSplit={agentSplit ?? 45}
                />
            )}
        </motion.div>
    );
}
