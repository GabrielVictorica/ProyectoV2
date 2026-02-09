'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
    createActivityAction,
    updateActivityAction,
    deleteActivityAction,
    getWeeklyDataAction,
    ActivityInsert
} from '../actions/activityActions';
import { toast } from 'sonner';

export type WeeklyActivity = {
    id: string;
    type: string;
    date: string;
    time: string | null;
    status: string;
    notes: string | null;
    client_id: string | null;
    property_id: string | null;
    agent_id: string;
    organization_id: string;
};

export type WeeklyDataMap = Record<string, {
    activities: WeeklyActivity[];
    transactionCount: number;
    transactions: any[];
}>;

export function useWeeklyActivities(weekStart: Date, agentId?: string) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { data: auth } = useAuth();

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const targetAgentId = agentId || auth?.profile?.id;

    const isValidDate = weekStart && !isNaN(weekStart.getTime());

    const { data: weeklyData, isLoading } = useQuery({
        queryKey: ['weekly-activities', isValidDate ? weekStart.toISOString() : 'invalid', targetAgentId],
        queryFn: async () => {
            if (!targetAgentId || !isValidDate) return null;

            const startDate = weekStart.toISOString().split('T')[0];
            const endDate = weekEnd.toISOString().split('T')[0];

            const result = await getWeeklyDataAction(targetAgentId, startDate, endDate);
            if (!result.success || !result.data) throw new Error(result.error || 'No data returned');

            const { activities, transactions } = result.data as { activities: any[], transactions: any[] };

            // 3. Merge data into a map for easy grid rendering
            const map: WeeklyDataMap = {};

            // Initialize map for each day
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                map[dateStr] = { activities: [], transactionCount: 0, transactions: [] };
            }

            (activities as any[])?.forEach(act => {
                if (map[act.date]) {
                    map[act.date].activities.push(act as WeeklyActivity);
                }
            });

            (transactions as any[])?.forEach(trans => {
                if (map[trans.transaction_date]) {
                    const rawProp = trans.properties || trans.property;
                    let propertyTitle = null;

                    if (Array.isArray(rawProp) && rawProp.length > 0) {
                        propertyTitle = rawProp[0].title;
                    } else if (rawProp && typeof rawProp === 'object') {
                        propertyTitle = (rawProp as any).title;
                    }

                    if (!propertyTitle && trans.custom_property_title) {
                        propertyTitle = trans.custom_property_title;
                    }

                    if (!propertyTitle) {
                        propertyTitle = trans.buyer_name ? `Venta a ${trans.buyer_name}` : 'Operación sin título';
                    }

                    const enhancedTrans = {
                        ...trans,
                        property: { title: propertyTitle }
                    };

                    map[trans.transaction_date].transactionCount += 1;
                    map[trans.transaction_date].transactions.push(enhancedTrans);
                }
            });

            return map;
        },
        enabled: !!targetAgentId,
        staleTime: 2 * 60 * 1000, // Cache por 2 minutos - evita refetches innecesarios
    });

    const createActivity = useMutation({
        mutationFn: async (data: ActivityInsert) => {
            const result = await createActivityAction(data);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-activities'] });
            toast.success('Actividad creada');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al crear actividad');
        }
    });

    const updateActivity = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ActivityInsert> }) => {
            const result = await updateActivityAction(id, data);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-activities'] });
            toast.success('Actividad actualizada');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al actualizar actividad');
        }
    });

    const deleteActivity = useMutation({
        mutationFn: async (id: string) => {
            const result = await deleteActivityAction(id);
            if (!result.success) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weekly-activities'] });
            toast.success('Actividad eliminada');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al eliminar actividad');
        }
    });

    return {
        weeklyData,
        isLoading,
        createActivity,
        updateActivity,
        deleteActivity
    };
}
