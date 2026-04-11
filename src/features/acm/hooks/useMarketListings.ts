'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { searchMarketListingsAction, getMarketStatsAction } from '../actions/marketActions';
import type { MarketSearchFilters, MarketSearchResult } from '../types/acm';

// ── Query Keys ──────────────────────────────────────────────────────────────

export const marketKeys = {
  all: ['market'] as const,
  search: (filters: MarketSearchFilters) => [...marketKeys.all, 'search', filters] as const,
  stats: () => [...marketKeys.all, 'stats'] as const,
};

// ── Search (mutation because it's triggered on demand, not auto-fetched) ────

export function useMarketSearch() {
  return useMutation({
    mutationFn: async (filters: MarketSearchFilters): Promise<MarketSearchResult> => {
      const result = await searchMarketListingsAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onError: (error: Error) => {
      toast.error(`Error buscando comparables: ${error.message}`);
    },
  });
}

// ── Market stats (mutation for on-demand fetch) ─────────────────────────────

export function useMarketStats() {
  return useMutation({
    mutationFn: async () => {
      const result = await getMarketStatsAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onError: (error: Error) => {
      toast.error(`Error cargando estadísticas: ${error.message}`);
    },
  });
}
