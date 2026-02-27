'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import { useAuth, useLogout, usePermissions } from '@/features/auth/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Building2,
    Home,
    Building,
    Users,
    Settings,
    LogOut,
    ChevronDown,
    UserCog,
    DollarSign,
    Handshake,
    Target,
    CalendarDays,
    ChevronRight,
    Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageTransitionWrapper } from '@/components/ui/PageTransitionWrapper';
import { hasCompetitionAccess } from '@/features/competition/constants';

// --- Static Constants (Outside component to avoid re-creation) ---

const MAIN_ITEMS = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/dashboard/properties', label: 'Propiedades', icon: Building },
    { href: '/dashboard/crm', label: 'Relaciones (CRM)', icon: Handshake },
    { href: '/dashboard/clients', label: 'Búsquedas', icon: Users },
];

const TRACKING_ITEMS = [
    { href: '/dashboard/my-week', label: 'Mi Semana', icon: CalendarDays },
    { href: '/dashboard/objectives', label: 'Control y Objetivos', icon: Target },
    { href: '/dashboard/closings', label: 'Cierres', icon: Handshake },
];

// --- Memoized Components ---

import { useQueryClient } from '@tanstack/react-query';
import { fetchDashboardStats, DASHBOARD_STATS_QUERY_KEY } from '@/features/dashboard/hooks/useDashboard';
import {
    fetchAgentProgress,
    fetchTeamObjectivesSummary,
    AGENT_PROGRESS_KEY,
    TEAM_OBJECTIVES_SUMMARY_KEY
} from '@/features/objectives/hooks/useObjectives';
import { createClient } from '@/lib/supabase/client';

// Memoized navigation link to prevent unnecessary re-renders during path changes
const NavigationLink = memo(({ item, pathname, auth, isParent, role, queryClient, supabase }: {
    item: { href: string, label: string, icon: any },
    pathname: string,
    auth: any,
    isParent: boolean,
    role: any,
    queryClient: any,
    supabase: any
}) => {
    const isActive = pathname === item.href;

    const handleMouseEnter = () => {
        // Predictive prefetching based on target route
        const currentYear = new Date().getFullYear();

        if (item.href === '/dashboard' && auth?.profile) {
            queryClient.prefetchQuery({
                queryKey: [DASHBOARD_STATS_QUERY_KEY, auth.profile.id, role],
                queryFn: () => fetchDashboardStats(supabase, auth.profile, { isParent, role }),
                staleTime: 5 * 60 * 1000,
            });
        }

        if (item.href === '/dashboard/my-week' && auth?.profile) {
            queryClient.prefetchQuery({
                queryKey: [AGENT_PROGRESS_KEY, currentYear, auth.profile.id],
                queryFn: () => fetchAgentProgress(auth.profile.id, currentYear),
                staleTime: 5 * 60 * 1000,
            });
        }

        if (item.href === '/dashboard/objectives' && auth?.profile) {
            queryClient.prefetchQuery({
                queryKey: [TEAM_OBJECTIVES_SUMMARY_KEY, currentYear, auth.profile.organization_id],
                queryFn: () => fetchTeamObjectivesSummary(currentYear, auth.profile.organization_id),
                staleTime: 5 * 60 * 1000,
            });
        }
    };

    return (
        <Link
            href={item.href}
            onMouseEnter={handleMouseEnter}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-white/[0.08] text-white shadow-lg shadow-violet-500/10 border border-white/[0.1]'
                : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                }`}
        >
            <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-violet-400' : 'group-hover:text-violet-400'}`} />
            <span className="font-medium">{item.label}</span>
            {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
            )}
        </Link>
    );
});

NavigationLink.displayName = 'NavigationLink';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const { data: auth, isLoading } = useAuth();
    const { mutate: logout } = useLogout();
    const { isGod, isParent, role, canManageUsers } = usePermissions();
    const pathname = usePathname();

    const isAnyTrackingActive = useMemo(() =>
        TRACKING_ITEMS.some(item => pathname === item.href),
        [pathname]
    );

    // Shared instances for all NavigationLinks (prevents multiple instantiation)
    const queryClient = useQueryClient();
    const supabase = useMemo(() => createClient(), []);

    const [isTrakeoOpen, setIsTrakeoOpen] = useState(isAnyTrackingActive);

    // Auto-open if navigating to a child
    useEffect(() => {
        if (isAnyTrackingActive) setIsTrakeoOpen(true);
    }, [isAnyTrackingActive]);

    // Dynamic items based on roles
    const dynamicItems = useMemo(() => {
        const main = MAIN_ITEMS.filter(item => {
            if (item.href === '/dashboard' || item.href === '/dashboard/properties') {
                return isGod;
            }
            return true;
        });

        const team = (isGod || isParent) ? [
            { href: '/dashboard/team', label: 'Mi Equipo', icon: Users }
        ] : [];

        const admin = canManageUsers ? [
            { href: '/dashboard/admin/organizations', label: 'Organizaciones', icon: Building2 },
            { href: '/dashboard/admin/users', label: 'Usuarios', icon: UserCog },
            { href: '/dashboard/admin/billing', label: 'Finanzas', icon: DollarSign },
        ] : [];

        const competition = hasCompetitionAccess({
            role: role || null,
            firstName: auth?.profile?.first_name,
            lastName: auth?.profile?.last_name,
        }) ? [
            { href: '/dashboard/competition', label: 'Copa', icon: Trophy }
        ] : [];

        return { main, team, admin, competition };
    }, [isGod, isParent, canManageUsers, auth, role]);

    const badge = useMemo(() => {
        if (isGod) return { text: 'Super Admin', color: 'bg-violet-500/80' };
        if (isParent) return { text: 'Broker', color: 'bg-blue-500/80' };
        return { text: 'Agente', color: 'bg-emerald-500/80' };
    }, [isGod, isParent]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Sidebar - Glassmorphism */}
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 glass border-r border-white/[0.06]">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 p-6 border-b border-white/[0.06]">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                            EntreInmobiliarios
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                        {/* Main Items */}
                        {dynamicItems.main.map((item) => (
                            <NavigationLink
                                key={item.href}
                                item={item}
                                pathname={pathname}
                                auth={auth}
                                isParent={isParent}
                                role={role}
                                queryClient={queryClient}
                                supabase={supabase}
                            />
                        ))}

                        {/* Trakeo Section */}
                        <div className="pt-6 pb-2">
                            <button
                                onClick={() => setIsTrakeoOpen(!isTrakeoOpen)}
                                className="w-full px-4 flex items-center justify-between group cursor-pointer"
                            >
                                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider group-hover:text-white/50 transition-colors">
                                    Trakeo
                                </span>
                                <ChevronRight className={`h-4 w-4 text-white/20 transition-transform duration-200 ${isTrakeoOpen ? 'rotate-90' : ''}`} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {isTrakeoOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden space-y-1"
                                >
                                    {TRACKING_ITEMS.map((item) => (
                                        <NavigationLink
                                            key={item.href}
                                            item={item}
                                            pathname={pathname}
                                            auth={auth}
                                            isParent={isParent}
                                            role={role}
                                            queryClient={queryClient}
                                            supabase={supabase}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Team Section */}
                        {dynamicItems.team.length > 0 && (
                            <>
                                <div className="pt-6 pb-2">
                                    <span className="px-4 text-xs font-semibold text-white/30 uppercase tracking-wider">
                                        Equipo
                                    </span>
                                </div>
                                {dynamicItems.team.map((item) => (
                                    <NavigationLink
                                        key={item.href}
                                        item={item}
                                        pathname={pathname}
                                        auth={auth}
                                        isParent={isParent}
                                        role={role}
                                        queryClient={queryClient}
                                        supabase={supabase}
                                    />
                                ))}
                            </>
                        )}

                        {/* Admin section */}
                        {dynamicItems.admin.length > 0 && (
                            <>
                                <div className="pt-6 pb-2">
                                    <span className="px-4 text-xs font-semibold text-white/30 uppercase tracking-wider">
                                        Administración
                                    </span>
                                </div>
                                {dynamicItems.admin.map((item) => (
                                    <NavigationLink
                                        key={item.href}
                                        item={item}
                                        pathname={pathname}
                                        auth={auth}
                                        isParent={isParent}
                                        role={role}
                                        queryClient={queryClient}
                                        supabase={supabase}
                                    />
                                ))}
                            </>
                        )}

                        {/* Competition section */}
                        {dynamicItems.competition.length > 0 && (
                            <>
                                <div className="pt-6 pb-2">
                                    <span className="px-4 text-xs font-semibold text-amber-500/40 uppercase tracking-wider">
                                        🏆 Competencia
                                    </span>
                                </div>
                                {dynamicItems.competition.map((item) => (
                                    <NavigationLink
                                        key={item.href}
                                        item={item}
                                        pathname={pathname}
                                        auth={auth}
                                        isParent={isParent}
                                        role={role}
                                        queryClient={queryClient}
                                        supabase={supabase}
                                    />
                                ))}
                            </>
                        )}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-white/[0.06]">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 text-white/80 hover:text-white hover:bg-white/[0.04] rounded-xl h-auto py-3"
                                >
                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-violet-500/25">
                                        {auth?.profile?.first_name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium truncate">
                                            {auth?.profile?.first_name} {auth?.profile?.last_name}
                                        </p>
                                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full text-white ${badge.color}`}>
                                            {badge.text}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-white/40" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 glass border-white/[0.08]">
                                <DropdownMenuLabel className="text-white/50">Mi cuenta</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/[0.06]" />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings" className="text-white/80 hover:text-white cursor-pointer focus:bg-white/[0.06]">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Configuración
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/[0.06]" />
                                <DropdownMenuItem
                                    onClick={() => logout()}
                                    className="text-red-400 hover:text-red-300 cursor-pointer focus:bg-red-500/10"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Cerrar sesión
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-64 min-h-screen">
                <div className="p-8">
                    <PageTransitionWrapper key={pathname}>
                        {children}
                    </PageTransitionWrapper>
                </div>
            </main>
        </div>
    );
}
