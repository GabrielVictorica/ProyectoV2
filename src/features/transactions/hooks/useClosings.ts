'use client';

import { useQuery } from '@tanstack/react-query';
import { getClosingsDashboardDataAction, ClosingsFilters } from '../actions/closings';

export const closingsKeys = {
    all: ['closings-dashboard'] as const,
    user: (userId?: string) => [...closingsKeys.all, userId] as const,
    data: (userId: string | undefined, filters: ClosingsFilters) => [...closingsKeys.user(userId), filters] as const,
};

export function useClosingsDashboard(filters: ClosingsFilters, userId?: string) {
    return useQuery({
        queryKey: closingsKeys.data(userId, filters),
        queryFn: () => getClosingsDashboardDataAction(filters),
        enabled: !!userId, // No disparar si no hay usuario (previene fugas al desloguear)
        staleTime: 60 * 1000, // 1 minuto de cache
        placeholderData: (previousData) => previousData, // Mantener datos mientras se recarga
    });
}
