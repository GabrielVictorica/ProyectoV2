'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTransactions, useAggregatedMetrics, useDeleteTransaction } from '../hooks/useTransactions';
import { useOrganizations, useUsers } from '@/features/admin/hooks/useAdmin';
import { CloseTransactionDialog } from './CloseTransactionDialog';
import { formatCurrency } from '@/lib/formatters';
import { TransactionWithRelations } from '../hooks/useTransactions';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DollarSign,
    RefreshCw,
    Shield,
    TrendingUp,
    BarChart3,
    Handshake,
    CheckCircle2,
    Calendar,
    Target,
    Layers,
    Users,
    Building2,
    Filter,
    X,
    Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export function ClosingsPage() {
    const { data: auth } = useAuth();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [selectedAgent, setSelectedAgent] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filters = {
        year: selectedYear,
        month: selectedMonth,
        organizationId: selectedOrg !== 'all' ? selectedOrg : undefined,
        agentId: selectedAgent !== 'all' ? selectedAgent : undefined,
    };

    // Hooks para datos
    const { data: transactions = [], isLoading: loadingTransactions } = useTransactions(filters);
    const { mutateAsync: deleteTransaction } = useDeleteTransaction();

    const { data: metrics, isLoading: loadingMetrics } = useAggregatedMetrics(filters);

    // Cargar datos para filtros
    const { data: organizations } = useOrganizations();
    const { data: allUsers } = useUsers();

    const role = auth?.role;
    const isGodOrParent = role === 'god' || role === 'parent';

    // Generar años para el selector
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ];

    const filteredAgents = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => {
            if (role === 'god') {
                return selectedOrg === 'all' || u.organization_id === selectedOrg;
            }
            if (role === 'parent') {
                return u.organization_id === auth?.profile?.organization_id;
            }
            return u.id === auth?.id;
        });
    }, [allUsers, selectedOrg, role, auth]);

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(tx => {
            const searchLower = searchQuery.toLowerCase();
            const propertyTitle = (tx.property?.title || '').toLowerCase();
            const agentName = tx.agent ? `${tx.agent.first_name} ${tx.agent.last_name}`.toLowerCase() : '';

            return searchQuery === '' ||
                propertyTitle.includes(searchLower) ||
                agentName.includes(searchLower);
        });
    }, [transactions, searchQuery]);

    const handleDelete = async (id: string) => {
        try {
            await deleteTransaction(id);
            toast.success('Cierre eliminado con éxito');
        } catch (error) {
            toast.error('Error al eliminar el cierre');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-6 p-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Cierres
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Seguimiento financiero y objetivos logrados
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filtros */}
                    <Select
                        value={String(selectedYear)}
                        onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                        <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700 text-white">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            {years.map((year) => (
                                <SelectItem
                                    key={year}
                                    value={String(year)}
                                    className="text-white hover:bg-slate-700"
                                >
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedMonth ? String(selectedMonth) : 'all'}
                        onValueChange={(v) => setSelectedMonth(v === 'all' ? undefined : parseInt(v))}
                    >
                        <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Todo el año" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all" className="text-white hover:bg-slate-700">
                                Todo el año
                            </SelectItem>
                            {months.map((month) => (
                                <SelectItem
                                    key={month.value}
                                    value={String(month.value)}
                                    className="text-white hover:bg-slate-700"
                                >
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Selector de Organización (Solo GOD) */}
                    {role === 'god' && (
                        <Select
                            value={selectedOrg}
                            onValueChange={(v) => {
                                setSelectedOrg(v);
                                setSelectedAgent('all'); // Reset agente al cambiar org
                            }}
                        >
                            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                                <Building2 className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Inmobiliaria" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="all" className="text-white hover:bg-slate-700">
                                    Todas las Inmobiliarias
                                </SelectItem>
                                {organizations?.map((org) => (
                                    <SelectItem
                                        key={org.id}
                                        value={org.id}
                                        className="text-white hover:bg-slate-700"
                                    >
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Selector de Agente (GOD y PARENT) */}
                    {isGodOrParent && (
                        <Select
                            value={selectedAgent}
                            onValueChange={setSelectedAgent}
                        >
                            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                                <Users className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Agente" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="all" className="text-white hover:bg-slate-700">
                                    Todos los Agentes
                                </SelectItem>
                                {filteredAgents.map((agent: any) => (
                                    <SelectItem
                                        key={agent.id}
                                        value={agent.id}
                                        className="text-white hover:bg-slate-700"
                                    >
                                        {agent.first_name} {agent.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Barra de Búsqueda */}
                    <div className="relative min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Buscar propiedad o agente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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

                    {/* Botón Limpiar */}
                    {(selectedYear !== currentYear || selectedMonth !== undefined || selectedOrg !== 'all' || selectedAgent !== 'all' || searchQuery !== '') && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSelectedYear(currentYear);
                                setSelectedMonth(undefined);
                                setSelectedOrg('all');
                                setSelectedAgent('all');
                                setSearchQuery('');
                            }}
                            className="text-slate-500 hover:text-white"
                            title="Limpiar filtros"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    )}

                    <CloseTransactionDialog />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Operaciones"
                        value={metrics?.closedDealsCount || 0}
                        icon={<Handshake className="h-5 w-5" />}
                        loading={loadingMetrics}
                        color="purple"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Puntas"
                        value={(metrics as any)?.totalPuntas || 0}
                        icon={<Layers className="h-5 w-5" />}
                        loading={loadingMetrics}
                        color="blue"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Vol. de Ventas"
                        value={formatCurrency(metrics?.totalSalesVolume || 0)}
                        icon={<DollarSign className="h-5 w-5" />}
                        loading={loadingMetrics}
                        color="green"
                        isString
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Finanzas"
                        value={formatCurrency(metrics?.totalGrossCommission || 0)}
                        icon={<BarChart3 className="h-5 w-5" />}
                        loading={loadingMetrics}
                        color="yellow"
                        isString
                    />
                </motion.div>

                {/* Desglose para Dios */}
                {role === 'god' && (
                    <>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Royalty Dios"
                                value={formatCurrency(metrics?.totalMasterIncome || 0)}
                                icon={<Shield className="h-5 w-5" />}
                                loading={loadingMetrics}
                                color="purple"
                                isString
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Neto Oficinas"
                                value={formatCurrency(metrics?.totalOfficeIncome || 0)}
                                icon={<Building2 className="h-5 w-5" />}
                                loading={loadingMetrics}
                                color="blue"
                                isString
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Pago Agentes"
                                value={formatCurrency(metrics?.totalNetIncome || 0)}
                                icon={<Users className="h-5 w-5" />}
                                loading={loadingMetrics}
                                color="green"
                                isString
                            />
                        </motion.div>
                    </>
                )}

                {/* Desglose para Parent (Broker) */}
                {role === 'parent' && (
                    <>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Bolsillo Oficina"
                                value={formatCurrency(metrics?.totalOfficeIncome || 0)}
                                icon={<Building2 className="h-5 w-5" />}
                                loading={loadingMetrics}
                                color="blue"
                                isString
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Pago Agentes"
                                value={formatCurrency(metrics?.totalNetIncome || 0)}
                                icon={<Users className="h-5 w-5" />}
                                loading={loadingMetrics}
                                color="green"
                                isString
                            />
                        </motion.div>
                    </>
                )}

                {/* Desglose para Child (Agente) */}
                {role === 'child' && (
                    <motion.div variants={itemVariants}>
                        <KPICard
                            title="Mi Comisión"
                            value={formatCurrency(metrics?.totalNetIncome || 0)}
                            icon={<TrendingUp className="h-5 w-5" />}
                            loading={loadingMetrics}
                            color="green"
                            isString
                        />
                    </motion.div>
                )}

                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Ticket Prom."
                        value={formatCurrency(metrics?.averageTicket || 0)}
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={loadingMetrics}
                        color="yellow"
                        isString
                    />
                </motion.div>
            </div>


            {/* Transactions Table */}
            <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 overflow-hidden shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        Historial de Cierres
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingTransactions ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : transactions && transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-800 bg-slate-800/50">
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Fecha</TableHead>
                                        {isGodOrParent && (
                                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Agente</TableHead>
                                        )}
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Propiedad</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Precio</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-center">Puntas</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Bruta</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Neto Agente</TableHead>
                                        {role === 'god' && (
                                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Master (Dios)</TableHead>
                                        )}
                                        {isGodOrParent && (
                                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Oficina</TableHead>
                                        )}
                                        <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTransactions.map((tx) => (
                                        <TableRow
                                            key={tx.id}
                                            className="border-slate-800/50 hover:bg-slate-700/30 font-mono text-xs transition-colors"
                                        >
                                            <TableCell className="text-slate-400">
                                                {format(new Date(tx.transaction_date), 'dd/MM/yyyy')}
                                            </TableCell>
                                            {isGodOrParent && (
                                                <TableCell className="text-white">
                                                    {tx.agent?.first_name} {tx.agent?.last_name}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-white font-sans max-w-[200px] truncate">
                                                {tx.property?.title || tx.custom_property_title || (
                                                    <span className="text-slate-500 italic">Sin propiedad</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-white">
                                                {formatCurrency(tx.actual_price)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono bg-slate-800/50">
                                                    {tx.sides}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-yellow-400/80 font-bold">
                                                {formatCurrency(tx.gross_commission)}
                                            </TableCell>
                                            <TableCell className="text-right text-green-400/80">
                                                {formatCurrency(tx.net_commission)}
                                            </TableCell>
                                            {role === 'god' && (
                                                <TableCell className="text-right text-purple-400/80">
                                                    {formatCurrency(tx.master_commission_amount || 0)}
                                                </TableCell>
                                            )}
                                            {isGodOrParent && (
                                                <TableCell className="text-right text-blue-400/80">
                                                    {formatCurrency(tx.office_commission_amount || 0)}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                {(() => {
                                                    const canManage = role === 'god' ||
                                                        (role === 'parent' && tx.organization_id === auth?.organizationId) ||
                                                        (role === 'child' && tx.agent_id === auth?.id);

                                                    if (!canManage) return null;

                                                    return (
                                                        <div className="flex justify-end gap-1">
                                                            <CloseTransactionDialog transaction={tx} />

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Eliminar este cierre?</AlertDialogTitle>
                                                                        <AlertDialogDescription className="text-slate-400">
                                                                            Esta acción no se puede deshacer. Los KPIs se actualizarán automáticamente.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(tx.id)}
                                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                                        >
                                                                            Eliminar
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <TrendingUp className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-500">No se encontraron transacciones</h3>
                            <p className="text-slate-400 mb-4">
                                Registra tu primera operación cerrada
                            </p>
                            <CloseTransactionDialog
                                trigger={
                                    <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
                                        <Handshake className="mr-2 h-4 w-4" />
                                        Cerrar Primera Operación
                                    </Button>
                                }
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// KPI Card Component
function KPICard({
    title,
    value,
    icon,
    loading,
    color,
    isString = false,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    loading: boolean;
    color: 'green' | 'blue' | 'purple' | 'yellow';
    isString?: boolean;
}) {
    const colorClasses = {
        green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
        blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
        yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    };

    const iconColors = {
        green: 'text-green-400',
        blue: 'text-blue-400',
        purple: 'text-purple-400',
        yellow: 'text-yellow-400',
    };

    return (
        <Card className={`bg-gradient-to-br ${colorClasses[color]} border`}>
            <CardContent className="py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-medium">{title}</p>
                        {loading ? (
                            <Skeleton className="h-7 w-24 mt-1 bg-slate-700" />
                        ) : (
                            <p className="text-white text-2xl font-bold mt-1">
                                {isString ? value : value.toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className={iconColors[color]}>{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
}
