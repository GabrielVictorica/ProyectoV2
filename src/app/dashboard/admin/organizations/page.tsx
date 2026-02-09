'use client';

import { useState } from 'react';
import { useOrganizations } from '@/features/admin/hooks/useAdmin';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { CreateOrganizationDialog } from '@/features/admin/components/CreateOrganizationDialog';
import { EditOrganizationDialog } from '@/features/admin/components/EditOrganizationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Mail, Phone, RefreshCw, Percent, FileText, AlertTriangle, Trash2 } from 'lucide-react';
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
import { redirect } from 'next/navigation';
import type { Organization } from '@/types/database.types';

export default function OrganizationsPage() {
    const { isGod } = usePermissions();
    const { data: organizations, isLoading, error, refetch } = useOrganizations();
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Solo GOD puede ver esta página
    if (!isGod) {
        redirect('/dashboard');
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 text-center py-8">
                Error al cargar organizaciones: {error.message}
            </div>
        );
    }

    const handleDeleteClick = (e: React.MouseEvent, org: Organization) => {
        e.stopPropagation();
        setOrgToDelete(org);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!orgToDelete) return;
        setActionLoading(orgToDelete.id);
        try {
            const { deleteOrganizationAction } = await import('@/features/admin/actions/adminActions');
            const result = await deleteOrganizationAction(orgToDelete.id);
            if (result.success) {
                refetch();
            } else {
                alert(result.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error al eliminar la organización');
        } finally {
            setActionLoading(null);
            setDeleteDialogOpen(false);
            setOrgToDelete(null);
        }
    };

    const handleEditClick = (org: Organization) => {
        setEditingOrg(org);
    };

    const handleEditSuccess = () => {
        setEditingOrg(null);
        refetch();
    };

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500">Activa</Badge>;
            case 'pending_payment':
                return <Badge className="bg-yellow-500">Pago Pendiente</Badge>;
            case 'suspended':
                return <Badge className="bg-red-500">Suspendida</Badge>;
            default:
                return <Badge className="bg-green-500">Activa</Badge>;
        }
    };

    const activeCount = organizations?.filter(o => o.org_status === 'active' || !o.org_status).length || 0;
    const overdueTotalCount = organizations?.filter(o => o.overdue_count > 0).length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Organizaciones</h1>
                    <p className="text-slate-400 mt-1">
                        Gestiona las inmobiliarias y oficinas de la red
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        className="border-slate-600 text-slate-400 hover:text-white"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <CreateOrganizationDialog onSuccess={() => refetch()} />
                </div>
            </div>

            {/* Stats Summary - Simplified */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total Oficinas</p>
                                <p className="text-2xl font-bold text-white">{organizations?.length || 0}</p>
                            </div>
                            <Building2 className="h-8 w-8 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Activas</p>
                                <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className={`bg-slate-800/50 border-slate-700 ${overdueTotalCount > 0 ? 'border-red-500/50' : ''}`}>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Con Deudas Vencidas</p>
                                <p className={`text-2xl font-bold ${overdueTotalCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                    {overdueTotalCount}
                                </p>
                            </div>
                            <AlertTriangle className={`h-8 w-8 ${overdueTotalCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Organizations Grid */}
            {organizations && organizations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organizations.map((org) => (
                        <Card
                            key={org.id}
                            className={`bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer relative ${org.overdue_count > 0 ? 'border-red-500/30' : ''}`}
                            onClick={() => handleEditClick(org)}
                        >
                            {org.overdue_count > 0 && (
                                <div className="absolute -top-2 -right-2 z-10">
                                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {org.overdue_count} VENCIDAS
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                                            <Building2 className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                                {org.name}
                                                {org.overdue_count > 0 && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                )}
                                            </CardTitle>
                                            <CardDescription className="text-slate-500">
                                                @{org.slug}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {getStatusBadge(org.org_status)}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {/* Fee de plataforma destacado */}
                                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <div className="flex items-center gap-2 text-purple-300 text-sm">
                                        <Percent className="h-4 w-4" />
                                        <span>Fee de Plataforma</span>
                                    </div>
                                    <span className="text-lg font-bold text-purple-400">
                                        {org.royalty_percentage ?? 0}%
                                    </span>
                                </div>

                                {/* Datos fiscales si existen */}
                                {(org.legal_name || org.cuit) && (
                                    <div className="p-2 rounded-lg bg-slate-700/30 space-y-1">
                                        {org.legal_name && (
                                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                <FileText className="h-3 w-3" />
                                                <span className="truncate">{org.legal_name}</span>
                                            </div>
                                        )}
                                        {org.cuit && (
                                            <div className="text-slate-500 text-xs ml-5">
                                                CUIT: {org.cuit}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Contacto */}
                                <div className="space-y-1">
                                    {org.address && (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <MapPin className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">{org.address}</span>
                                        </div>
                                    )}
                                    {org.email && (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <Mail className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">{org.email}</span>
                                        </div>
                                    )}
                                    {org.phone && (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <Phone className="h-4 w-4 flex-shrink-0" />
                                            <span>{org.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 mt-3 border-t border-slate-700 flex justify-between items-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                        disabled={actionLoading === org.id}
                                        onClick={(e) => handleDeleteClick(e, org)}
                                    >
                                        {actionLoading === org.id ? (
                                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Eliminar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-purple-400 hover:text-purple-300"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(org);
                                        }}
                                    >
                                        Ver Detalles
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                            No hay organizaciones
                        </h3>
                        <p className="text-slate-400 mb-4">
                            Crea la primera inmobiliaria para comenzar
                        </p>
                        <CreateOrganizationDialog onSuccess={() => refetch()} />
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            {editingOrg && (
                <EditOrganizationDialog
                    organization={editingOrg}
                    open={!!editingOrg}
                    onOpenChange={(open) => !open && setEditingOrg(null)}
                    onSuccess={handleEditSuccess}
                />
            )}
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Eliminar organización?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Esta acción eliminará permanentemente la organización <strong>{orgToDelete?.name}</strong>, todos sus usuarios (brokers y agentes) y todos sus datos asociados. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar Permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
