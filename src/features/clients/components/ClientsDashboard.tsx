'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';
import { useClients } from '../hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
    Plus, Users, Mail, Phone, MapPin,
    Search, Filter, ShieldCheck, UserCheck,
    Calculator, Tag as TagIcon, Building2,
    ChevronLeft, ChevronRight, DollarSign, Activity, CheckCircle2, Clock, TrendingUp, AlertTriangle, ArrowUpDown,
    LayoutGrid, LayoutList
} from 'lucide-react';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ClientForm } from './ClientForm';
import type { Client, AnonymousClient } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientDataTable } from './ClientDataTable';
import { SearchCardGrid } from './SearchCardGrid';
import { SearchFilterSheet, defaultSearchFilters } from './SearchFilterSheet';
import type { SearchFilters } from './SearchFilterSheet';
import { usePropertyTypes } from '@/features/properties/hooks/useProperties';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteClient, useUpdateClient, clientKeys, useClientDashboardStats, useAddInteraction } from '../hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Edit2, Trash2, Ban, Archive, CheckCircle } from 'lucide-react';

// Animated counter component
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
    const [display, setDisplay] = useState(0);
    const prevRef = useRef(0);
    useEffect(() => {
        const start = prevRef.current;
        const diff = value - start;
        if (diff === 0) return;
        const duration = 400;
        const startTime = performance.now();
        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(start + diff * eased));
            if (progress < 1) requestAnimationFrame(step);
            else prevRef.current = value;
        };
        requestAnimationFrame(step);
    }, [value]);
    return <span className={className}>{display}</span>;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

export function ClientsDashboard() {
    const { auth: user, isLoading: isLoadingPermissions } = usePermissions();
    const { isGod, isParent } = usePermissions();

    // Configuración inicial de pestañas según Rol
    const defaultTab = isGod ? 'global' : (isParent ? 'office' : 'personal');
    const [activeTab, setActiveTab] = useState<'personal' | 'office' | 'network' | 'global'>(defaultTab);

    // Sincronizar pestaña activa cuando cargan los permisos
    useEffect(() => {
        if (!isLoadingPermissions && user) {
            const newDefault = isGod ? 'global' : (isParent ? 'office' : 'personal');
            setActiveTab(newDefault);
        }
    }, [isLoadingPermissions, isGod, isParent, user]);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
    
    // States for custom dialogs
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; clientId: string | null }>({
        isOpen: false,
        clientId: null
    });
    const [suspensionPrompt, setSuspensionPrompt] = useState<{
        isOpen: boolean;
        clientId: string | null;
        newStatus: string | null;
    }>({
        isOpen: false,
        clientId: null,
        newStatus: null
    });
    const [suspensionNote, setSuspensionNote] = useState('');

    // Filtros
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    // Advanced Filters
    const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>(defaultSearchFilters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'urgent' | 'recent' | 'budget'>('recent');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('busquedas-view-mode') as 'table' | 'cards') || 'cards';
        }
        return 'cards';
    });

    const handleViewModeChange = (mode: 'table' | 'cards') => {
        setViewMode(mode);
        localStorage.setItem('busquedas-view-mode', mode);
    };
    const [activeCard, setActiveCard] = useState<'critical' | 'active' | 'closed' | null>(null);
    const { data: propertyTypes } = usePropertyTypes();
    const advancedFilterCount =
        advancedFilters.status.length +
        advancedFilters.propertyTypes.length +
        advancedFilters.paymentMethods.length +
        (advancedFilters.budgetMin ? 1 : 0) +
        (advancedFilters.budgetMax ? 1 : 0) +
        advancedFilters.bedrooms.length +
        (advancedFilters.isMortgageEligible ? 1 : 0);

    // Admin Data (Para filtros de Organizaciones)
    const { data: organizations } = useOrganizations({ enabled: isGod || activeTab === 'network' });

    // Team Data (Para filtros de Agentes)
    // Parent: Ve su equipo. God: Ve equipo de la org seleccionada.
    const { data: allUsers, isLoading: isLoadingTeam } = useTeamMembers();

    // Lógica para filtrar agentes en el selector
    const filteredAgents = (allUsers || []).filter((u: any) => {
        if (isGod) {
            return selectedOrg === 'all' ? true : u.organization_id === selectedOrg;
        }
        // Parent ya trae solo su equipo en useTeamMembers
        return true;
    });

    // Lógica de queries para useClients
    // Definimos qué parámetros enviar al hook según la pestaña activa
    const queryFilters = {
        scope: activeTab,
        search: debouncedSearch,
        page: page,
        limit: PAGE_SIZE,
        organizationId: undefined as string | undefined,
        agentId: undefined as string | undefined,
    };

    if (activeTab === 'global') {
        queryFilters.organizationId = selectedOrg;
        queryFilters.agentId = selectedAgentId;
    } else if (activeTab === 'office') {
        // Parent viendo su oficina. Org es automática (suya). Agente es filtrable.
        queryFilters.agentId = selectedAgentId;
    } else if (activeTab === 'network') {
        // Viendo la red. Filtramos por Organización.
        queryFilters.organizationId = selectedOrg;
    }

    // Merge advanced filters — activeCard takes priority over advancedFilters.status
    const derivedStatusFilter = activeCard === 'active' ? ['active']
        : activeCard === 'closed' ? ['closed']
            : activeCard === 'critical' ? undefined // isCritical handles status internally
                : advancedFilters.status.length > 0 ? advancedFilters.status : undefined;

    const mergedFilters = {
        ...queryFilters,
        statusFilter: derivedStatusFilter,
        propertyTypes: advancedFilters.propertyTypes.length > 0 ? advancedFilters.propertyTypes : undefined,
        paymentMethods: advancedFilters.paymentMethods.length > 0 ? advancedFilters.paymentMethods : undefined,
        budgetMin: advancedFilters.budgetMin,
        budgetMax: advancedFilters.budgetMax,
        bedrooms: advancedFilters.bedrooms.length > 0 ? advancedFilters.bedrooms : undefined,
        isMortgageEligible: advancedFilters.isMortgageEligible || undefined,
        isCritical: activeCard === 'critical',
    };

    const { data, isLoading: isLoadingClients } = useClients(mergedFilters as any);

    // Fetch Global Stats for cards
    const { data: globalStats, isLoading: isLoadingStats } = useClientDashboardStats(
        activeTab,
        selectedOrg === 'all' ? undefined : selectedOrg,
        selectedAgentId === 'all' ? undefined : selectedAgentId
    );

    const rawClients = data?.clients || [];
    const totalClients = data?.total || 0;
    const totalPages = Math.ceil(totalClients / PAGE_SIZE);

    const clients = useMemo(() => {
        let sorted = [...rawClients];
        if (sortBy === 'urgent') {
            sorted.sort((a: any, b: any) => {
                const dateA = new Date(a.last_interaction_at || a.created_at).getTime();
                const dateB = new Date(b.last_interaction_at || b.created_at).getTime();
                return dateA - dateB; // Más viejas / desatendidas primero
            });
        } else if (sortBy === 'recent') {
            sorted.sort((a: any, b: any) => {
                const dateA = new Date(a.last_interaction_at || a.created_at).getTime();
                const dateB = new Date(b.last_interaction_at || b.created_at).getTime();
                return dateB - dateA; // Más recientes por interacción primero
            });
        } else if (sortBy === 'budget') {
            sorted.sort((a: any, b: any) => (b.budget_max || 0) - (a.budget_max || 0)); // Mayor presupuesto primero
        }
        return sorted;
    }, [rawClients, sortBy]);

    // Estado de carga compuesto
    const isLoading = isLoadingPermissions || isLoadingClients;

    const updateClient = useUpdateClient();
    const deleteClient = useDeleteClient();
    const addInteraction = useAddInteraction();

    const handleEdit = (client: any) => {
        setSelectedClient(client);
        setIsFormOpen(true);
    };

    const handleStatusChange = async (id: string, newStatus: string, note?: string) => {
        await updateClient.mutateAsync({ id, status: newStatus } as any);
        if (note && note.trim()) {
            await addInteraction.mutateAsync({ clientId: id, type: 'nota', content: `[Estado: ${newStatus}] ${note.trim()}` });
        }
    };

    const handleStatusChangeRequest = (id: string, newStatus: string) => {
        if (newStatus === 'inactive') {
            setSuspensionPrompt({ isOpen: true, clientId: id, newStatus });
            setSuspensionNote('');
        } else {
            handleStatusChange(id, newStatus);
        }
    };

    const handleDeleteRequest = (id: string) => {
        setDeleteConfirm({ isOpen: true, clientId: id });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirm.clientId) {
            await deleteClient.mutateAsync(deleteConfirm.clientId);
            setDeleteConfirm({ isOpen: false, clientId: null });
        }
    };

    const handleConfirmSuspension = async () => {
        if (suspensionPrompt.clientId && suspensionPrompt.newStatus) {
            await handleStatusChange(suspensionPrompt.clientId, suspensionPrompt.newStatus, suspensionNote);
            setSuspensionPrompt({ isOpen: false, clientId: null, newStatus: null });
            setSuspensionNote('');
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setSelectedClient(undefined);
    };

    // Renderizado de Pestañas
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Búsquedas</h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                        <Search className="w-4 h-4 text-purple-400" />
                        Gestiona las búsquedas activas de compradores
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                            placeholder="Buscar por nombre o email..."
                            className="pl-10 bg-slate-900/50 border-slate-800 w-[250px] focus:ring-purple-500/20 focus:border-purple-500/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Toggle vista tabla / cards */}
                    <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/50 p-1 gap-0.5">
                        <motion.button
                            onClick={() => handleViewModeChange('cards')}
                            className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${viewMode === 'cards' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                            whileTap={{ scale: 0.9 }}
                            title="Vista tarjetas"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            onClick={() => handleViewModeChange('table')}
                            className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                            whileTap={{ scale: 0.9 }}
                            title="Vista tabla"
                        >
                            <LayoutList className="w-4 h-4" />
                        </motion.button>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setIsFilterOpen(true)}
                        className="relative bg-slate-900/50 border-slate-800 hover:bg-slate-800 text-white h-10 px-4"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                        {advancedFilterCount > 0 && (
                            <Badge className="ml-2 bg-violet-600 text-white text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                                {advancedFilterCount}
                            </Badge>
                        )}
                    </Button>

                    <SearchFilterSheet
                        open={isFilterOpen}
                        onOpenChange={setIsFilterOpen}
                        filters={advancedFilters}
                        setFilters={(f) => { setAdvancedFilters(f); setPage(1); }}
                        propertyTypes={propertyTypes || []}
                    />

                    <Button
                        onClick={() => {
                            setSelectedClient(undefined);
                            setIsFormOpen(true);
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold h-10 px-6 shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Agregar Búsqueda
                    </Button>

                    <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
                        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 max-h-[95vh] flex flex-col overflow-hidden">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-white">
                                    {selectedClient ? 'Editar Búsqueda' : 'Registrar Nueva Búsqueda'}
                                </DialogTitle>
                            </DialogHeader>
                            <ClientForm
                                client={selectedClient}
                                onSuccess={handleCloseForm}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }} className="w-full">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-6">
                    <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
                        {isGod ? (
                            <TabsTrigger value="global" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white gap-2">
                                <Users className="w-4 h-4" /> Mis Clientes (Global)
                            </TabsTrigger>
                        ) : (
                            <>
                                {/* "Mis Clientes" tiene diferente scope para Parent y Child */}
                                <TabsTrigger value={isParent ? "office" : "personal"} className="data-[state=active]:bg-slate-800 data-[state=active]:text-white gap-2">
                                    <UserCheck className="w-4 h-4" /> Mis Clientes
                                </TabsTrigger>
                            </>
                        )}

                        {!isGod && (
                            <TabsTrigger value="network" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white gap-2">
                                <Building2 className="w-4 h-4" /> Búsquedas de la Red
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="flex items-center gap-4">
                        {/* Filtros */}
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            {/* Ordenamiento */}
                            <>
                                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-slate-900/50 border border-slate-800 text-[11px] text-white px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 max-w-[150px] cursor-pointer"
                                >
                                    <option value="urgent">Más urgentes</option>
                                    <option value="recent">Más recientes</option>
                                    <option value="budget">Mayor presu.</option>
                                </select>
                            </>

                            {/* Filtro de Organización: Para GOD (siempre) y para Red (Todos) */}
                            {(isGod || activeTab === 'network') && (
                                <>
                                    <Filter className="w-3 h-3 text-slate-500" />
                                    <select
                                        value={selectedOrg}
                                        onChange={(e) => {
                                            setSelectedOrg(e.target.value);
                                            setSelectedAgentId('all'); // Reset agente al cambiar org
                                            setPage(1);
                                        }}
                                        className="bg-slate-900/50 border border-slate-800 text-[11px] text-white px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 max-w-[150px]"
                                    >
                                        <option value="all">Todas las Org.</option>
                                        {organizations?.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {/* Filtro de Agente: Para GOD (si org != all o global) y PARENT (en su oficina) */}
                            {((isGod && activeTab === 'global') || (isParent && activeTab === 'office')) && (
                                <select
                                    value={selectedAgentId}
                                    onChange={(e) => { setSelectedAgentId(e.target.value); setPage(1); }}
                                    className="bg-slate-900/50 border border-slate-800 text-[11px] text-white px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50 max-w-[150px]"
                                    disabled={isLoadingTeam}
                                >
                                    <option value="all">Todos los Agentes</option>
                                    {isLoadingTeam ? (
                                        <option disabled>Cargando equipo...</option>
                                    ) : filteredAgents.length === 0 ? (
                                        <option disabled>(Sin agentes encontrados)</option>
                                    ) : (
                                        filteredAgents.map((agent: any) => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.first_name} {agent.last_name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                            {totalClients > 0 && (
                                <>Mostrando {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalClients)} de {totalClients} resultados</>
                            )}
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="min-h-[400px] space-y-6">
                            {/* Summary Cards */}
                            {(!isLoading && !isLoadingStats && clients.length > 0) && (() => {
                                const activeCount = globalStats?.totalActive || 0;
                                const closedCount = globalStats?.totalClosed || 0;
                                const criticalCount = globalStats?.criticalCount || 0;
                                const attentionRate = globalStats?.attentionRate || 0;

                                const lastActivity = clients.reduce((latest: string, c: any) => {
                                    const d = c.created_at || '';
                                    return d > latest ? d : latest;
                                }, '');
                                const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000) : -1;

                                return (
                                    <>
                                        <motion.div
                                            className="grid grid-cols-2 md:grid-cols-5 gap-3"
                                            initial="hidden"
                                            animate="visible"
                                            variants={{
                                                hidden: {},
                                                visible: { transition: { staggerChildren: 0.06 } }
                                            }}
                                        >
                                            {/* Tarjeta de Búsquedas Críticas (Abandonadas) */}
                                            <motion.div
                                                animate={criticalCount > 0 && activeCard !== 'critical' ? { scale: [1, 1.02, 1], boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 15px rgba(239,68,68,0.3)', '0 0 0px rgba(239,68,68,0)'] } : {}}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    if (criticalCount > 0) {
                                                        setActiveCard(prev => prev === 'critical' ? null : 'critical');
                                                        setSortBy('urgent');
                                                        setPage(1);
                                                    }
                                                }}
                                                className={`p-4 rounded-xl border backdrop-blur-md transition-all ${criticalCount > 0 ? 'bg-red-950/60 cursor-pointer hover:bg-red-950/70' : 'bg-slate-950/60 border-slate-700/30'} ${activeCard === 'critical' ? 'border-red-500 ring-1 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-red-500/30'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${criticalCount > 0 ? (activeCard === 'critical' ? 'bg-red-500/30' : 'bg-red-500/20') : 'bg-slate-700/50'}`}>
                                                        <AlertTriangle className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-red-400' : 'text-slate-500'}`} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${criticalCount > 0 ? 'text-red-400/80' : 'text-slate-500'}`}>Críticas</span>
                                                </div>
                                                <AnimatedNumber value={criticalCount} className={`text-2xl font-black ${criticalCount > 0 ? 'text-red-400' : 'text-slate-500'}`} />
                                                <p className="text-[9px] text-slate-500 mt-1">Sin seguimiento &gt;14d</p>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setActiveCard(prev => prev === 'active' ? null : 'active');
                                                    setPage(1);
                                                }}
                                                className={`p-4 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${activeCard === 'active' ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-950/50 hover:border-emerald-500/30'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${activeCard === 'active' ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Activas</span>
                                                </div>
                                                <AnimatedNumber value={activeCount} className="text-2xl font-black text-emerald-300" />
                                                <p className="text-[9px] text-slate-500 mt-1">Seguimiento activo</p>
                                            </motion.div>
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setActiveCard(prev => prev === 'closed' ? null : 'closed');
                                                    setPage(1);
                                                }}
                                                className={`p-4 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${activeCard === 'closed' ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-blue-950/40 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/30'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${activeCard === 'closed' ? 'bg-blue-500/20' : 'bg-blue-500/10'}`}>
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-wider">Cerradas</span>
                                                </div>
                                                <AnimatedNumber value={closedCount} className="text-2xl font-black text-blue-300" />
                                                <p className="text-[9px] text-slate-500 mt-1">Operaciones cerradas</p>
                                            </motion.div>
                                             <motion.div
                                                 whileHover={{ scale: 1.02 }}
                                                 className="p-4 rounded-xl border bg-slate-950/60 border-slate-700/30 backdrop-blur-md"
                                             >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${attentionRate > 80 ? 'bg-emerald-500/10' : attentionRate > 50 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                                                        <Activity className={`w-3.5 h-3.5 ${attentionRate > 80 ? 'text-emerald-400' : attentionRate > 50 ? 'text-amber-400' : 'text-red-400'}`} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${attentionRate > 80 ? 'text-emerald-400/80' : attentionRate > 50 ? 'text-amber-400/80' : 'text-red-400/80'}`}>Tasa Atención</span>
                                                </div>
                                                <span className={`text-2xl font-black ${attentionRate > 80 ? 'text-emerald-300' : attentionRate > 50 ? 'text-amber-300' : 'text-red-300'}`}>
                                                    {attentionRate}%
                                                </span>
                                                <p className="text-[9px] text-slate-500 mt-1">Contacto &lt;14d</p>
                                            </motion.div>
                                             <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/20 backdrop-blur-md">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider">Última</span>
                                                </div>
                                                <span className="text-lg font-black text-amber-300">
                                                    {daysSince === 0 ? 'Hoy' : daysSince === 1 ? 'Ayer' : daysSince > 0 ? `Hace ${daysSince}d` : '—'}
                                                </span>
                                                <p className="text-[9px] text-slate-500 mt-1">Última actividad</p>
                                            </div>
                                        </motion.div>

                                        {/* Filter chip indicator */}
                                        <AnimatePresence>
                                            {activeCard && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                    className="flex items-center gap-2 mt-2"
                                                >
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${activeCard === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                                        activeCard === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                                            'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                        }`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                        Filtrando por: {activeCard === 'critical' ? 'Críticas' : activeCard === 'active' ? 'Activas' : 'Cerradas'}
                                                        <button
                                                            onClick={() => setActiveCard(null)}
                                                            className="ml-1 hover:text-white transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">
                                                        Mostrando {totalClients} resultados
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                );
                            })()}
                            {isLoading ? (
                                <div className="space-y-4">
                                    <div className="h-12 rounded-xl overflow-hidden relative bg-slate-800/20">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/10 to-transparent animate-[shimmer_1.5s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                                    </div>
                                    {Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="h-16 rounded-xl overflow-hidden relative bg-slate-800/10">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/10 to-transparent animate-[shimmer_1.5s_infinite]" style={{ backgroundSize: '200% 100%', animationDelay: `${i * 0.1}s` }} />
                                        </div>
                                    ))}
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="py-20 text-center space-y-6 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                    <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-10 h-10 text-slate-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">No se encontraron búsquedas</h3>
                                        <p className="text-slate-500 max-w-xs mx-auto text-sm mt-2">
                                            {activeTab === 'network' ? 'No hay búsqueda en la red con estos filtros.' : 'Comienza registrando tu primera búsqueda.'}
                                        </p>
                                    </div>
                                    {activeTab !== 'network' && (
                                        <Button
                                            onClick={() => setIsFormOpen(true)}
                                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold h-12 px-8 shadow-xl shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Plus className="w-5 h-5 mr-2" /> Agregar Búsqueda
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    {viewMode === 'cards' ? (
                                        <motion.div
                                            key="cards-view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <SearchCardGrid
                                                clients={clients as any}
                                                scope={activeTab === 'global' ? 'office' : (activeTab as any)}
                                                onEdit={handleEdit}
                                                onDelete={handleDeleteRequest}
                                                onStatusChange={handleStatusChangeRequest}
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="table-view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <ClientDataTable
                                                clients={clients}
                                                scope={activeTab === 'global' ? 'office' : (activeTab as any)}
                                                onEdit={handleEdit}
                                                onDelete={handleDeleteRequest}
                                                onStatusChange={handleStatusChangeRequest}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12 pb-8">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <Button
                                            key={i}
                                            variant={page === i + 1 ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setPage(i + 1)}
                                            className={`w-8 h-8 p-0 ${page === i + 1 ? 'bg-purple-600' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                                        >
                                            {i + 1}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                                >
                                    Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent className="bg-slate-900 border-slate-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Esta acción no se puede deshacer. Se eliminará permanentemente la búsqueda y todo su historial de interacciones.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700 border-none"
                        >
                            Eliminar Búsqueda
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Suspension Note Prompt Dialog */}
            <Dialog open={suspensionPrompt.isOpen} onOpenChange={(open) => setSuspensionPrompt(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent className="bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Suspender Búsqueda</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Puedes agregar una nota opcional explicando el motivo de la suspensión (ej. "vuelve de viaje el 15/05").
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Motivo de suspensión..."
                            value={suspensionNote}
                            onChange={(e) => setSuspensionNote(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-white min-h-[100px] focus:ring-purple-500/20"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setSuspensionPrompt({ isOpen: false, clientId: null, newStatus: null })}
                            className="text-slate-400 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmSuspension}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Confirmar Suspensión
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

