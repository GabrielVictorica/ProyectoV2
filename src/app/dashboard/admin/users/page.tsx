'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUsers } from '@/features/admin/hooks/useAdmin';
import { usePermissions } from '@/features/auth/hooks/useAuth';
import { toggleUserStatusAction, deleteUserAction } from '@/features/admin/actions/adminActions';
import { CreateUserDialog } from '@/features/admin/components/CreateUserDialog';
import { EditUserDialog } from '@/features/admin/components/EditUserDialog';
import { CreateOrganizationDialog } from '@/features/admin/components/CreateOrganizationDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicTypography } from '@/components/ui/DynamicTypography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    UserCog,
    Shield,
    Building2,
    User,
    Users,
    MoreVertical,
    Power,
    Trash2,
    RefreshCw,
    Search,
    X,
    Filter,
    Pencil
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMemo } from 'react';
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
import { redirect } from 'next/navigation';

export default function UsersPage() {
    const { isGod } = usePermissions();
    const { data: users, isLoading, error, refetch } = useUsers();

    // Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [orgFilter, setOrgFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<any>(null);

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId);
        await toggleUserStatusAction(userId, !currentStatus);
        refetch();
        setActionLoading(null);
    };

    const handleDeleteClick = (userId: string, name: string) => {
        setUserToDelete({ id: userId, name });
        setDeleteDialogOpen(true);
    };

    const handleEditClick = (user: any) => {
        setUserToEdit(user);
        setEditDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        setActionLoading(userToDelete.id);
        await deleteUserAction(userToDelete.id);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        refetch();
        setActionLoading(null);
    };

    const getRoleBadge = (role: string) => {
        const roles: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
            god: { label: 'Super Admin', color: 'bg-purple-500', icon: <Shield className="h-3 w-3" /> },
            parent: { label: 'Broker', color: 'bg-blue-500', icon: <Building2 className="h-3 w-3" /> },
            child: { label: 'Agente', color: 'bg-green-500', icon: <User className="h-3 w-3" /> },
        };
        return roles[role] || { label: role, color: 'bg-slate-500', icon: null };
    };

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user => {
            // Filtro de búsqueda (Buscamos en nombre, apellido y email)
            const searchLower = searchQuery.toLowerCase();
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                fullName.includes(searchLower);

            // Filtro de Rol
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            // Filtro de Organización
            const matchesOrg = orgFilter === 'all' || user.organization_id === orgFilter;

            // Filtro de Estado
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' ? user.is_active : !user.is_active);

            return matchesSearch && matchesRole && matchesOrg && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, orgFilter, statusFilter]);

    const organizations = useMemo(() => {
        if (!users) return [];
        const orgsMap = new Map();
        users.forEach(u => {
            if (u.organization) {
                orgsMap.set(u.organization.id, u.organization.name);
            }
        });
        return Array.from(orgsMap.entries()).map(([id, name]) => ({ id, name }));
    }, [users]);

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
                Error al cargar usuarios: {error.message}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
                    <p className="text-slate-400 mt-1">
                        Administra los usuarios y organizaciones del sistema
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        className="border-slate-600 text-slate-400 hover:text-white"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <CreateOrganizationDialog onSuccess={handleRefresh} />
                    <CreateUserDialog onSuccess={handleRefresh} />
                </div>
            </div>

            {/* Stats */}
            {/* Stats - Watermark Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Users */}
                <Card className="relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-slate-900 to-purple-950/30 shadow-md hover:scale-[1.02] transition-transform group">
                    <CardContent className="p-5 relative z-10 min-h-[90px] flex flex-col justify-center">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10">Total Usuarios</p>
                        <DynamicTypography value={users?.length || 0} className="text-white font-black tracking-tighter drop-shadow-md mt-1" baseSize="text-3xl" />
                    </CardContent>
                    <div className="absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none text-purple-500">
                        <Users className="w-24 h-24" />
                    </div>
                </Card>

                {/* Brokers (Parent) */}
                <Card className="relative overflow-hidden border border-blue-500/20 bg-gradient-to-br from-slate-900 to-blue-950/30 shadow-md hover:scale-[1.02] transition-transform group">
                    <CardContent className="p-5 relative z-10 min-h-[90px] flex flex-col justify-center">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10">Brokers (Parent)</p>
                        <DynamicTypography value={users?.filter(u => u.role === 'parent').length || 0} className="text-blue-400 font-black tracking-tighter drop-shadow-md mt-1" baseSize="text-3xl" />
                    </CardContent>
                    <div className="absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none text-blue-500">
                        <Building2 className="w-24 h-24" />
                    </div>
                </Card>

                {/* Agents (Child) */}
                <Card className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/30 shadow-md hover:scale-[1.02] transition-transform group">
                    <CardContent className="p-5 relative z-10 min-h-[90px] flex flex-col justify-center">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10">Agentes (Child)</p>
                        <DynamicTypography value={users?.filter(u => u.role === 'child').length || 0} className="text-emerald-400 font-black tracking-tighter drop-shadow-md mt-1" baseSize="text-3xl" />
                    </CardContent>
                    <div className="absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none text-emerald-500">
                        <User className="w-24 h-24" />
                    </div>
                </Card>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-wrap gap-4 items-center backdrop-blur-sm">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-400">Filtrar por:</span>
                    </div>

                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-700 text-white">
                            <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all">Todos los Roles</SelectItem>
                            <SelectItem value="god">Super Admin</SelectItem>
                            <SelectItem value="parent">Broker</SelectItem>
                            <SelectItem value="child">Agente</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                        <SelectTrigger className="w-[180px] bg-slate-900/50 border-slate-700 text-white">
                            <SelectValue placeholder="Organización" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all">Todas las Org.</SelectItem>
                            {organizations.map(org => (
                                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-700 text-white">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all">Todos Estados</SelectItem>
                            <SelectItem value="active">Activos</SelectItem>
                            <SelectItem value="inactive">Inactivos</SelectItem>
                        </SelectContent>
                    </Select>

                    {(searchQuery || roleFilter !== 'all' || orgFilter !== 'all' || statusFilter !== 'all') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchQuery('');
                                setRoleFilter('all');
                                setOrgFilter('all');
                                setStatusFilter('all');
                            }}
                            className="text-slate-500 hover:text-white"
                        >
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* Users Table */}
            {filteredUsers.length > 0 ? (
                <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/50">
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Usuario</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Rol</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Organización</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Estado</th>
                                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Supervisor</th>
                                    <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredUsers.map((user) => {
                                    const badge = getRoleBadge(user.role);
                                    const isCurrentlyLoading = actionLoading === user.id;
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium">
                                                        {user.first_name[0]}{user.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {user.first_name} {user.last_name}
                                                        </p>
                                                        {user.phone && (
                                                            <p className="text-slate-500 text-sm">{user.phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge className={`${badge.color} text-white flex items-center gap-1 w-fit`}>
                                                    {badge.icon}
                                                    {badge.label}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                {user.organization ? (
                                                    <span className="text-slate-300">{user.organization.name}</span>
                                                ) : (
                                                    <span className="text-slate-500">Sin organización</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <Badge className={user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                                    {user.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6">
                                                {user.parent ? (
                                                    <span className="text-slate-400 text-sm">
                                                        {user.parent.first_name} {user.parent.last_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {(isGod || user.role !== 'god') && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={isCurrentlyLoading}
                                                                className="text-slate-400 hover:text-white"
                                                            >
                                                                {isCurrentlyLoading ? (
                                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <MoreVertical className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                                            <DropdownMenuItem
                                                                onClick={() => handleEditClick(user)}
                                                                className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleToggleStatus(user.id, user.is_active ?? true)}
                                                                className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                                                            >
                                                                <Power className="mr-2 h-4 w-4" />
                                                                {user.is_active ? 'Desactivar' : 'Activar'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-700" />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteClick(user.id, `${user.first_name} ${user.last_name}`)}
                                                                className="text-red-400 focus:bg-slate-700 focus:text-red-400 cursor-pointer"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-12 text-center">
                        <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                            No se encontraron usuarios
                        </h3>
                        <p className="text-slate-400 mb-4">
                            Prueba ajustando los filtros o la búsqueda para encontrar lo que buscas.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('');
                                setRoleFilter('all');
                                setOrgFilter('all');
                                setStatusFilter('all');
                            }}
                            className="border-slate-700 text-slate-400"
                        >
                            Limpiar todos los filtros
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Esta acción eliminará permanentemente a <strong>{userToDelete?.name}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.
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
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit User Dialog */}
            {userToEdit && (
                <EditUserDialog
                    user={userToEdit}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    onSuccess={handleRefresh}
                />
            )}
        </div>
    );
}
