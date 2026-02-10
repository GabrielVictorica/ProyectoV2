'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useClosingsDashboard, closingsKeys } from '../hooks/useClosings';
import { useDeleteTransaction } from '../hooks/useTransactions'; // Mantener delete legacy
import { CloseTransactionDialog } from './CloseTransactionDialog';
import { formatCurrency } from '@/lib/formatters';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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
    Building2,
    Users,
    X,
    Search,
    Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { DynamicTypography } from '@/components/ui/DynamicTypography';

export function ClosingsPage() {
    const { data: auth, isLoading: isLoadingAuth } = useAuth();
    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
    // Inicializar filtros de org/agente en 'all' o null dependiendo de la lógica, 
    // pero el hook useClosingsDashboard ya maneja 'all' interno.
    const [selectedOrg, setSelectedOrg] = useState<string>('all');
    const [selectedAgent, setSelectedAgent] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filters = {
        year: selectedYear,
        month: selectedMonth,
        organizationId: selectedOrg !== 'all' ? selectedOrg : undefined,
        agentId: selectedAgent !== 'all' ? selectedAgent : undefined,
    };

    // NUEVO HOOK UNIFICADO (Reemplaza useTransactions, useAggregatedMetrics, useOrganizations, useTeamMembers)
    // Se habilita solo cuando tenemos auth para evitar llamadas sin token
    const { data: dashboardData, isLoading: isLoadingDashboard, refetch, error: dashboardError, isError } = useClosingsDashboard(filters, auth?.id);

    // Error feedback
    if (isError) {
        console.error('Error loading closings dashboard:', dashboardError);
        toast.error('Error al cargar datos del tablero. Intenta recargar.');
    }

    // Legacy Delete Hook (Se mantiene porque la lógica de borrado es la misma)
    const { mutateAsync: deleteTransaction } = useDeleteTransaction();

    const role = auth?.role;
    const isGodOrParent = role === 'god' || role === 'parent';

    // Desestructuración de datos del nuevo hook
    const transactions = dashboardData?.transactions || [];
    const metrics = dashboardData?.aggregatedMetrics;
    const teamMembers = dashboardData?.teamMembers || [];
    // Extraer organizaciones únicas de las transacciones o perfiles si fuera necesario para GOD, 
    // pero para filtros GOD generalmente necesita todas las organizaciones.
    // El nuevo endpoint NO devuelve lista de organizaciones (solo transactions/metrics/team).
    // Si GOD necesita filtrar por organizaciones que NO tienen transacciones, necesitaríamos useOrganizations.
    // Pero por performance, asumimos que filtra sobre lo que hay o usamos useQuery separado si es GOD.
    // Para simplificar y no romper: Si es GOD, mantenemos useOrganizations aparte (es ligera).
    // O mejor, extraemos las organizaciones de los miembros del equipo si es GOD.
    // REVISIÓN: El original usaba useOrganizations({ enabled: role === 'god' }).
    // Podemos mantenerlo o asumir que el filtro de orgs viene de otro lado. 
    // MANTENDREMOS useOrganizations PERO SOLO PARA EL SELECTOR DE GOD (No bloqueante).
    // Importación dinámica o condicional no es posible en hooks, así que...
    /* 
       IMPORTANTE: En el código original `useOrganizations` se usaba. 
       Para no perder funcionalidad de filtrado en GOD, lo re-agregamos o usamos una lista derivada.
       Como la promesa de "1 sola query" es para la carga principal, una query auxiliar pequeñita para el dropdown de God no afecta el LCP.
    */

    // Extraer agentes para el selector
    const filteredAgents = useMemo(() => {
        if (!teamMembers) return [];
        return teamMembers.filter((u: any) => {
            if (role === 'god') {
                return selectedOrg === 'all' || u.organization_id === selectedOrg;
            }
            return true;
        });
    }, [teamMembers, selectedOrg, role]);

    // Extraer lista de organizaciones para el selector de Dios (derivado de los miembros o transacciones para no hacer otra call)
    // Opcional: Si queremos todas las orgs del sistema, necesitamos useOrganizations.
    // Vamos a derivarlo de los datos cargados para máxima velocidad si es posible, 
    // pero si teamMembers solo trae gente con actividad... mejor usar el hook ligero de orgs.
    // Al ser un dashboard de cierres, filtrar por orgs activas tiene sentido.
    const activeOrgs = useMemo(() => {
        if (role !== 'god') return [];
        const orgs = new Map();
        teamMembers.forEach((m: any) => {
            if (m.organization_id && !orgs.has(m.organization_id)) {
                // No tenemos el nombre de la org en profile flat... 
                // Espera, el endpoint devuelve teamMembers con datos de profile.
                // Profile no tiene nombre de org por defecto.
            }
        });
        return []; // Fallback plan: re-implementar useOrganizations si es vital.
    }, [teamMembers, role]);

    // Re-implementamos useOrganizations solo para GOD y de forma no bloqueante
    const [organizations, setOrganizations] = useState<any[]>([]);
    useEffect(() => {
        const loadOrganizations = async () => {
            if (role === 'god' && organizations.length === 0) {
                const { createClient } = await import('@/lib/supabase/client');
                const sb = createClient();
                const { data } = await sb.from('organizations').select('id, name').order('name');
                if (data) setOrganizations(data);
            }
        };
        loadOrganizations();
    }, [role, organizations.length]);


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

    const handleRefresh = () => {
        // Invalidar la nueva query unificada
        queryClient.invalidateQueries({ queryKey: closingsKeys.all });
        // También invalidar las legacy por si acaso se usan en otros lados
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTransaction(id);
            toast.success('Cierre eliminado con éxito');
            handleRefresh();
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

    // Loading General (Auth + Dashboard)
    const isLoading = isLoadingAuth || isLoadingDashboard;

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

                    {/* Dialogo de Cierre con Refresh Callback */}
                    <CloseTransactionDialog onSuccess={handleRefresh} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Operaciones"
                        value={metrics?.closedDealsCount || 0}
                        icon={<Handshake className="h-5 w-5" />}
                        loading={isLoading}
                        color="purple"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Puntas"
                        value={metrics?.totalPuntas || 0}
                        icon={<Layers className="h-5 w-5" />}
                        loading={isLoading}
                        color="blue"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <KPICard
                        title="Vol. de Ventas"
                        value={formatCurrency(metrics?.totalSalesVolume || 0)}
                        icon={<DollarSign className="h-5 w-5" />}
                        loading={isLoading}
                        color="green"
                        isString
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <KPICard
                        title={role === 'parent' ? "Facturación BRUTA" : "Finanzas"}
                        value={formatCurrency(metrics?.totalGrossCommission || 0)}
                        icon={<BarChart3 className="h-5 w-5" />}
                        loading={isLoading}
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
                                loading={isLoading}
                                color="purple"
                                isString
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Neto Oficinas"
                                value={formatCurrency(metrics?.totalOfficeIncome || 0)}
                                icon={<Building2 className="h-5 w-5" />}
                                loading={isLoading}
                                color="blue"
                                isString
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Pago Agentes"
                                value={formatCurrency(metrics?.totalNetIncome || 0)}
                                icon={<Users className="h-5 w-5" />}
                                loading={isLoading}
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
                                title="Facturación Neta"
                                value={formatCurrency(metrics?.totalOfficeIncome || 0)}
                                icon={<Building2 className="h-5 w-5" />}
                                loading={isLoading}
                                color="blue"
                                isString
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <KPICard
                                title="Pago Agentes"
                                value={formatCurrency(metrics?.totalNetIncome || 0)}
                                icon={<Users className="h-5 w-5" />}
                                loading={isLoading}
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
                            loading={isLoading}
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
                        loading={isLoading}
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
                    {isLoading ? (
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
                                                            <CloseTransactionDialog transaction={tx} onSuccess={handleRefresh} />

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
                                onSuccess={handleRefresh}
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
    const themes = {
        green: {
            bg: 'bg-gradient-to-br from-slate-900 to-emerald-950/30',
            border: 'border-emerald-500/20',
            text: 'text-emerald-500',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]'
        },
        blue: {
            bg: 'bg-gradient-to-br from-slate-900 to-blue-950/30',
            border: 'border-blue-500/20',
            text: 'text-blue-500',
            glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]'
        },
        purple: {
            bg: 'bg-gradient-to-br from-slate-900 to-purple-950/30',
            border: 'border-purple-500/20',
            text: 'text-purple-500',
            glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]'
        },
        yellow: {
            bg: 'bg-gradient-to-br from-slate-900 to-amber-950/30',
            border: 'border-amber-500/20',
            text: 'text-amber-500',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]'
        },
    };

    const t = themes[color];

    return (
        <Card className={`relative overflow-hidden border ${t.border} ${t.bg} ${t.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group shadow-md`}>
            <CardContent className="p-5 relative z-10 min-h-[100px] flex flex-col justify-center">
                <div className="flex flex-col gap-1">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10">
                        {title}
                    </p>

                    {loading ? (
                        <Skeleton className="h-8 w-32 bg-slate-800/50 mt-1" />
                    ) : (
                        <div className="flex items-baseline gap-1 z-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {isString && !isNaN(Number(value)) && (
                                <span className="text-slate-500 font-medium text-sm self-center opacity-70 mb-0.5">$</span>
                            )}
                            <DynamicTypography
                                value={isString ? value : value.toLocaleString()}
                                className="text-white font-black tracking-tighter drop-shadow-md"
                                baseSize="text-3xl"
                            />
                        </div>
                    )}
                </div>
            </CardContent>

            <div className={`absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none ${t.text}`}>
                <div className="w-32 h-32 [&>svg]:w-full [&>svg]:h-full">
                    {icon}
                </div>
            </div>
        </Card>
    );
}
