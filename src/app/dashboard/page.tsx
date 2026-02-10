'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, usePermissions } from '@/features/auth/hooks/useAuth';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, Home, TrendingUp, Eye, Calendar, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { DynamicTypography } from '@/components/ui/DynamicTypography';

export default function DashboardPage() {
    const { data: auth } = useAuth();
    const { isGod, isParent, role, isLoading: authLoading } = usePermissions();
    const { data: stats, isLoading } = useDashboardStats();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isGod) {
            router.push('/dashboard/clients');
        }
    }, [isGod, authLoading, router]);

    if (authLoading || (!isGod && !authLoading)) {
        return <DashboardSkeleton />;
    }

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
            color: 'blue' as const,
        },
        {
            title: isParent ? 'Clientes Oficina' : 'Mis Clientes',
            value: stats?.clientsCount.toString() || '0',
            description: 'Prospectos activos',
            icon: Users,
            color: 'purple' as const,
        },
        {
            title: isParent ? 'Ventas Oficina' : 'Mis Ventas',
            value: formatCurrency(stats?.totalSalesVolume || 0),
            description: 'Volumen total operado',
            icon: DollarSign,
            color: 'green' as const,
        },
        {
            title: 'Comisiones',
            value: formatCurrency(stats?.totalCommissions || 0),
            description: isParent ? 'Total recaudado' : 'Tu producción',
            icon: Award,
            color: 'orange' as const,
        },
    ];

    // Helper for Watermark Styles
    const getTheme = (color: string) => {
        const themes: any = {
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
            orange: {
                bg: 'bg-gradient-to-br from-slate-900 to-amber-950/30',
                border: 'border-amber-500/20',
                text: 'text-amber-500',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]'
            },
        };
        return themes[color] || themes.blue;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header - Instant Render */}
            <div className="flex flex-col gap-1">
                {/* DEBUG BAR */}
                <div className="mb-4 p-2 bg-red-900/40 border border-red-500/50 rounded text-[10px] font-mono text-red-200">
                    DEBUG: UID={auth?.id} | ROLE={auth?.role} | PROFILE_ID={auth?.profile?.id} | FNAME={auth?.profile?.first_name}
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {getGreeting()}, {auth?.profile?.first_name || 'Agente'}!
                </h1>
                <p className="text-slate-400">
                    {isGod && 'Panel de Super Administrador - Acceso completo al sistema'}
                    {isParent && `Panel de Broker - Gestión de ${auth?.profile?.organization?.name || 'Oficina'}`}
                    {role === 'child' && 'Panel de Agente - Gestiona tus propiedades y clientes'}
                </p>
            </div>

            {/* Stats Grid - Watermark Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat) => {
                    const t = getTheme(stat.color);
                    return (
                        <Card key={stat.title} className={`relative overflow-hidden border ${t.border} ${t.bg} ${t.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group shadow-md`}>
                            <CardContent className="p-5 relative z-10 min-h-[100px] flex flex-col justify-center">
                                <div className="flex flex-col gap-1">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest z-10">
                                        {stat.title}
                                    </p>

                                    {isLoading ? (
                                        <div className="h-8 w-24 bg-white/5 animate-pulse rounded-md mt-1" />
                                    ) : (
                                        <div className="flex items-baseline gap-1 z-10">
                                            <DynamicTypography value={stat.value} className="text-white font-black tracking-tighter drop-shadow-md" baseSize="text-3xl" />
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 font-medium tracking-wide opacity-80 z-10">{stat.description}</p>
                                </div>
                            </CardContent>

                            {/* Watermark Icon */}
                            <div className={`absolute -right-6 -bottom-6 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 rotate-[-15deg] scale-150 pointer-events-none ${t.text}`}>
                                <div className="w-32 h-32 [&>svg]:w-full [&>svg]:h-full">
                                    <stat.icon />
                                </div>
                            </div>
                        </Card>
                    );
                })}
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


