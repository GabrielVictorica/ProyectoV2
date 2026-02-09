'use client';

import { useTeamStats } from '@/features/team/hooks/useTeam';
import { type TeamMember } from '@/features/team/actions/teamActions';
import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Building,
    TrendingUp,
    Phone,
    Mail,
    Award,
    ChevronRight,
    UserPlus,
    MoreVertical,
    Trash2,
    Power,
    RefreshCw,
    Search,
    Filter,
    X,
    MessageSquare,
    ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import React, { useState } from 'react';
import { deleteUserAction, toggleUserStatusAction } from '@/features/admin/actions/adminActions';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function TeamPage() {
    const { data: auth } = useAuth();
    const { isGod, isParent } = usePermissions();
    const { data: team, isLoading, error, refetch } = useTeamStats();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId);
        try {
            const result = await toggleUserStatusAction(userId, !currentStatus);
            if (result.success) refetch();
            else alert(result.error);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteClick = (userId: string, name: string) => {
        setUserToDelete({ id: userId, name });
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        setActionLoading(userToDelete.id);
        try {
            const result = await deleteUserAction(userToDelete.id);
            if (result.success) refetch();
            else alert(result.error);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    // Solo accesible por God y Parent
    if (!isGod && !isParent) {
        redirect('/dashboard');
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const nativeMembers = (team as any[])?.filter(m => m.organization_id === auth?.profile?.organization_id) || [];
    const externalReports = (team as any[])?.filter(m => m.organization_id !== auth?.profile?.organization_id && m.reports_to_organization_id === auth?.profile?.organization_id) || [];

    const parents = nativeMembers.filter(m => m.role === 'parent');
    const nativeChildren = nativeMembers.filter(m => m.role === 'child' || m.role === 'god');

    const renderMemberRow = (member: TeamMember, isExternal: boolean = false) => (
        <TableRow key={member.id} className={cn(
            "border-slate-700/50 hover:bg-slate-700/30 transition-colors group",
            isExternal && "bg-violet-500/5"
        )}>
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-blue-500/50 transition-colors overflow-hidden">
                        {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.first_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                {member.first_name[0]}{member.last_name[0] || ' '}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-white font-medium">
                                {member.first_name} {member.last_name}
                            </p>
                            {!member.is_active && (
                                <Badge variant="destructive" className="h-4 px-1 text-[8px] uppercase">Inactivo</Badge>
                            )}
                            {isExternal && (
                                <Badge variant="secondary" className="h-4 px-1 text-[8px] uppercase bg-violet-500/20 text-violet-400 border-violet-500/30">Externo</Badge>
                            )}
                        </div>
                        <p className="text-slate-500 text-xs">{(member as any).email}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={`text-[10px] uppercase font-bold ${member.role === 'parent' ? 'text-blue-400 border-blue-400/30' : 'text-green-400 border-green-400/30'}`}>
                    {member.role === 'parent' ? 'Broker' : (member.role === 'god' ? 'Admin' : 'Agente')}
                </Badge>
            </TableCell>
            <TableCell className="text-center">
                <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 font-mono">
                    {(member as any).property_count}
                </Badge>
            </TableCell>
            <TableCell className="text-center">
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 font-mono">
                    {(member as any).sales_count}
                </Badge>
            </TableCell>
            <TableCell className="text-right text-white font-mono">
                {formatCurrency((member as any).sales_volume)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    {member.phone && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-green-400" title={member.phone}>
                            <Phone className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-400" title={member.email || ''}>
                        <Mail className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" disabled={actionLoading === member.id}>
                            {actionLoading === member.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <MoreVertical className="h-4 w-4" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                        <DropdownMenuItem className="text-slate-300 focus:bg-slate-800 cursor-pointer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Cartera
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleToggleStatus(member.id, !!member.is_active)}
                            className="text-slate-300 focus:bg-slate-800 cursor-pointer"
                        >
                            <Power className="mr-2 h-4 w-4" />
                            {member.is_active ? 'Suspender' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem
                            onClick={() => handleDeleteClick(member.id, `${member.first_name} ${member.last_name}`)}
                            className="text-red-400 focus:bg-slate-800 focus:text-red-400 cursor-pointer"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.1 }
        }
    };

    return (
        <motion.div
            className="space-y-8 p-1"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Equipo y Colaboradores
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        Gestión de estructura interna y reportes externos
                    </p>
                </div>
                {isGod && (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Nuevo Miembro
                    </Button>
                )}
            </div>

            <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/50">
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Miembro</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Rol</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-center">Props</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-center">Ventas</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Volumen</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Contacto</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Miembros Propios de la Oficina */}
                        {parents.length > 0 && (
                            <>
                                <TableRow className="bg-blue-500/5 hover:bg-blue-500/5 border-none">
                                    <TableCell colSpan={7} className="py-2">
                                        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest pl-2 flex items-center gap-2">
                                            <Building className="h-3 w-3" /> Staff Directivo
                                        </p>
                                    </TableCell>
                                </TableRow>
                                {parents.map(m => renderMemberRow(m))}
                            </>
                        )}

                        {/* Equipos por Broker */}
                        {parents.map(parent => {
                            const myAgents = nativeChildren.filter(c => c.parent_id === parent.id);
                            if (myAgents.length === 0) return null;

                            return (
                                <React.Fragment key={parent.id}>
                                    <TableRow className="bg-slate-800/30 hover:bg-slate-800/30 border-none">
                                        <TableCell colSpan={7} className="py-2">
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-2">
                                                Equipo de {parent.first_name} {parent.last_name}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                    {myAgents.map(m => renderMemberRow(m))}
                                </React.Fragment>
                            );
                        })}

                        {/* Agentes sin supervisor */}
                        {nativeChildren.filter(c => !c.parent_id || !parents.some(p => p.id === c.parent_id)).length > 0 && (
                            <>
                                <TableRow className="bg-slate-800/30 hover:bg-slate-800/30 border-none">
                                    <TableCell colSpan={7} className="py-2">
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest pl-2">
                                            Agentes de Planta
                                        </p>
                                    </TableCell>
                                </TableRow>
                                {nativeChildren
                                    .filter(c => !c.parent_id || !parents.some(p => p.id === c.parent_id))
                                    .map(m => renderMemberRow(m))
                                }
                            </>
                        )}

                        {/* Colaboradores Externos (Cross-Org Reports) */}
                        {externalReports.length > 0 && (
                            <>
                                <TableRow className="bg-violet-500/10 hover:bg-violet-500/10 border-none">
                                    <TableCell colSpan={7} className="py-2">
                                        <p className="text-violet-400 text-[10px] font-bold uppercase tracking-widest pl-2 flex items-center gap-2">
                                            <TrendingUp className="h-3 w-3" /> Colaboradores Externos (Reportan aquí)
                                        </p>
                                    </TableCell>
                                </TableRow>
                                {externalReports.map(m => renderMemberRow(m, true))}
                            </>
                        )}
                    </TableBody>
                </Table>

                {(!team || team.length === 0) && (
                    <div className="py-20 text-center">
                        <Users className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-400">No hay miembros registrados</h3>
                    </div>
                )}
            </Card>
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Eliminar miembro del equipo?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            ¿Estás seguro de que deseas eliminar permanentemente a <strong>{userToDelete?.name}</strong>? Esta acción borrará su cuenta y sus datos asociados. No se puede deshacer.
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
        </motion.div>
    );
}
