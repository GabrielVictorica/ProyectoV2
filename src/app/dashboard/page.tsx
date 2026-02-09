'use client';

import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, Home, TrendingUp, Eye, Calendar, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';

export default function DashboardPage() {
    const { data: auth } = useAuth();
    const { isGod, isParent, role } = usePermissions();
    const { data: stats, isLoading } = useDashboardStats();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const dashboardStats = [
        {
            title: isParent ? 'Propiedades Oficina' : 'Mis Propiedades',
            value: stats?.propertiesCount.toString() || '0',
            description: stats?.propertiesCount === 1 ? 'Propiedad activa' : 'Propiedades activas',
            icon: Building,
            color: 'from-blue-500 to-cyan-500',
        },
        {
            title: isParent ? 'Clientes Oficina' : 'Mis Clientes',
            value: stats?.clientsCount.toString() || '0',
            description: 'Prospectos activos',
            icon: Users,
            color: 'from-purple-500 to-pink-500',
        },
        {
            title: isParent ? 'Ventas Oficina' : 'Mis Ventas',
            value: formatCurrency(stats?.totalSalesVolume || 0),
            description: 'Volumen total operado',
            icon: DollarSign,
            color: 'from-green-500 to-emerald-500',
        },
        {
            title: 'Comisiones',
            value: formatCurrency(stats?.totalCommissions || 0),
            description: isParent ? 'Total recaudado' : 'Tu producción',
            icon: Award,
            color: 'from-orange-500 to-red-500',
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header - Instant Render */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {getGreeting()}, {auth?.profile?.first_name || 'Agente'}!
                </h1>
                <p className="text-slate-400">
                    {isGod && 'Panel de Super Administrador - Acceso completo al sistema'}
                    {isParent && `Panel de Broker - Gestión de ${auth?.profile?.organization?.name || 'Oficina'}`}
                    {role === 'child' && 'Panel de Agente - Gestiona tus propiedades y clientes'}
                </p>
            </div>

            {/* Stats Grid - Individual Skeletons or Grouped */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat) => (
                    <Card key={stat.title} className="bg-slate-800/40 border-white/[0.06] backdrop-blur-md overflow-hidden group hover:border-violet-500/30 transition-all duration-300">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="text-slate-400/80 font-medium">
                                    {stat.title}
                                </CardDescription>
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon className="h-4 w-4 text-white" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="h-8 w-24 bg-white/5 animate-pulse rounded-md" />
                            ) : (
                                <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                            )}
                            <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-slate-800/40 border-white/[0.06] backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-violet-400" />
                            {isParent ? 'Ranking de Agentes' : 'Actividad Reciente'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-lg" />
                                ))}
                            </div>
                        ) : isParent ? (
                            <div className="space-y-3">
                                {stats?.agentRanking && stats.agentRanking.length > 0 ? (
                                    stats.agentRanking.map((agent: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-violet-400 font-bold border border-violet-500/20 group-hover:scale-105 transition-transform">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold">{agent.name}</p>
                                                    <p className="text-xs text-slate-500">{agent.count} operaciones cerradas</p>
                                                </div>
                                            </div>
                                            <div className="text-right font-bold text-green-400">
                                                {formatCurrency(agent.volume)}
                                                <div className="text-[10px] text-slate-500 font-normal">Volumen total</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-slate-500 text-center py-12 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                        No hay transacciones registradas este mes
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-slate-500 text-center py-12 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                No hay actividad reciente para mostrar
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/40 border-white/[0.06] backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <Home className="h-5 w-5 text-fuchsia-400" />
                            Propiedades
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-slate-400/60 text-sm italic">
                            {isParent ? 'Resumen general de la oficina' : 'Tu cartera de propiedades activa'}
                        </div>
                        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center py-10">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                                <Building className="h-8 w-8 text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-center text-sm mb-6 max-w-[200px]">
                                {isParent ? 'Gestiona el inventario de todo tu equipo desde aquí.' : 'Revisa y edita tus publicaciones activas.'}
                            </p>
                            <Button variant="outline" size="sm" className="w-full bg-white/[0.05] border-white/10 hover:bg-white/10 text-white">
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Gestionar Cartera
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


