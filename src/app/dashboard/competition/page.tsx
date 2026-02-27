'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasCompetitionAccess } from '@/features/competition/constants';
import { CompetitionDashboard } from '@/features/competition/components/CompetitionDashboard';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function CompetitionPage() {
    const { data: auth, isLoading } = useAuth();
    const router = useRouter();

    const hasAccess = auth
        ? hasCompetitionAccess({
            role: auth.role,
            firstName: auth.profile?.first_name,
            lastName: auth.profile?.last_name,
        })
        : false;

    // Redirect if not authorized (after loading)
    useEffect(() => {
        if (!isLoading && !hasAccess) {
            router.replace('/dashboard/mi-semana');
        }
    }, [isLoading, hasAccess, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <ShieldAlert className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Acceso restringido</p>
                </div>
            </div>
        );
    }

    return <CompetitionDashboard />;
}
