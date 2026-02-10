'use client';

import { useState } from 'react';
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
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { ClientForm } from './ClientForm';
import type { Client, AnonymousClient } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientDataTable } from './ClientDataTable';

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
import { useDeleteClient, useUpdateClient, clientKeys } from '../hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Edit2, Trash2, Ban, Archive, CheckCircle } from 'lucide-react';

export function ClientsDashboard() {
    const { auth: user } = usePermissions();
    const { isGod, isParent } = usePermissions();
    const [activeTab, setActiveTab] = useState<'personal' | 'office' | 'network'>('personal');
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 12;

    // Admin Data
    const { data: organizations } = useOrganizations();
    // Team Data (SSOT)
    const { data: allUsers } = useTeamMembers();

    const filteredAgents = (allUsers || []).filter((u: any) => {
        // Si es Dios y elige una oficina, filtramos. Si elige "Todas", ve a todos los 16.
        if (isGod) return selectedOrg === 'all' || u.organization_id === selectedOrg;
        // Para Parent, useTeamMembers ya devolvió solo los de su oficina/reportes
        return true;
    });

    const { data, isLoading } = useClients({
        scope: activeTab,
        search: search,
        organizationId: (activeTab === 'office' || activeTab === 'network') ? selectedOrg : undefined,
        agentId: activeTab === 'office' ? selectedAgentId : undefined,
        page: page,
        limit: PAGE_SIZE
    });

    const clients = data?.clients || [];
    const totalClients = data?.total || 0;
    const totalPages = Math.ceil(totalClients / PAGE_SIZE);

    const updateClient = useUpdateClient();
    const deleteClient = useDeleteClient();

    const handleEdit = (client: any) => {
        setSelectedClient(client);
        setIsFormOpen(true);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateClient.mutateAsync({ id, status: newStatus } as any);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este cliente permanentemente?')) {
            await deleteClient.mutateAsync(id);
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setSelectedClient(undefined);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Gestión de Clientes</h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        Administra y perfila tus contactos de forma profesional
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

                    <Button
                        onClick={() => {
                            setSelectedClient(undefined);
                            setIsFormOpen(true);
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold h-10 px-6 shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Agregar Cliente
                    </Button>

                    <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
                        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-white">
                                    {selectedClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
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
                        <TabsTrigger value="personal" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white gap-2">
                            <UserCheck className="w-4 h-4" /> Mis Clientes
                        </TabsTrigger>
                        {(isParent || isGod) && (
                            <TabsTrigger value="office" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white gap-2">
                                <Users className="w-4 h-4" /> Oficina
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="network" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white gap-2">
                            <Building2 className="w-4 h-4" /> Búsquedas de la Red
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4">
                        {(activeTab === 'office' || activeTab === 'network') && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                <Filter className="w-3 h-3 text-slate-500" />
                                {(isGod || activeTab === 'network') && (
                                    <select
                                        value={selectedOrg}
                                        onChange={(e) => {
                                            setSelectedOrg(e.target.value);
                                            setSelectedAgentId('all');
                                            setPage(1);
                                        }}
                                        className="bg-slate-900/50 border border-slate-800 text-[11px] text-white px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                    >
                                        <option value="all">Todas las Oficinas</option>
                                        {organizations?.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                )}
                                {activeTab === 'office' && (
                                    <select
                                        value={selectedAgentId}
                                        onChange={(e) => { setSelectedAgentId(e.target.value); setPage(1); }}
                                        className="bg-slate-900/50 border border-slate-800 text-[11px] text-white px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                    >
                                        <option value="all">Todos los Agentes</option>
                                        {filteredAgents.map((agent: any) => (
                                            <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
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
                        <div className="min-h-[400px]">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <div className="h-12 bg-slate-800/20 animate-pulse rounded-xl" />
                                    {Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="h-16 bg-slate-800/10 animate-pulse rounded-xl" />
                                    ))}
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="py-20 text-center space-y-6 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                    <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-10 h-10 text-slate-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">No se encontraron clientes</h3>
                                        <p className="text-slate-500 max-w-xs mx-auto text-sm mt-2">
                                            Comienza registrando tu primer cliente para activar el seguimiento detallado.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setIsFormOpen(true)}
                                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold h-12 px-8 shadow-xl shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Plus className="w-5 h-5 mr-2" /> Agregar Cliente
                                    </Button>
                                </div>
                            ) : (
                                <ClientDataTable
                                    clients={clients}
                                    scope={activeTab}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onStatusChange={handleStatusChange}
                                />
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
        </div>
    );
}

