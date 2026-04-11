'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MarketSearchFilters, MarketSearchResult, NormalizedComparable } from '../types/acm';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ── Helper: convert DB row → NormalizedComparable ───────────────────────────

function rowToComparable(row: any): NormalizedComparable {
  const now = new Date();
  const firstSeen = new Date(row.first_seen_at);
  const daysOnMarket = Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    title: row.title || '',
    price: Number(row.price) || 0,
    currency: (row.currency as 'USD' | 'ARS') || 'USD',
    totalArea: row.total_area ? Number(row.total_area) : null,
    coveredArea: row.covered_area ? Number(row.covered_area) : null,
    pricePerM2: row.price_per_m2 ? Number(row.price_per_m2) : null,
    propertyType: row.property_type || '',
    propertySubtype: row.property_subtype || null,
    conservationState: row.conservation_state || null,
    address: row.address || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    garages: row.garages,
    age: row.age,
    imageUrl: row.image_url,
    selected: false,
    adjustmentFactor: 1.0,
    adjustedPricePerM2: row.price_per_m2 ? Number(row.price_per_m2) : null,
    notes: daysOnMarket > 180 ? `${daysOnMarket} días en mercado` : '',
    relevanceScore: null, // calculated client-side
  };
}

// ── Search market listings ──────────────────────────────────────────────────

export async function searchMarketListingsAction(
  filters: MarketSearchFilters,
): Promise<ActionResult<MarketSearchResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const adminClient = createAdminClient();

  try {
    let query = (adminClient as any)
      .from('market_listings')
      .select('*', { count: 'exact' });

    // Active filter: default true, unless includeInactive is set
    if (filters.includeInactive) {
      // No filter on is_active — show everything
    } else if (filters.onlyActive !== false) {
      query = query.eq('is_active', true);
    }

    // Required filters: type + city
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters.propertyType) {
      query = query.ilike('property_type', `%${filters.propertyType}%`);
    }

    // Optional filters — only applied when explicitly set
    if (filters.propertySubtype) {
      query = query.eq('property_subtype', filters.propertySubtype);
    }

    if (filters.conservationState) {
      query = query.eq('conservation_state', filters.conservationState);
    }

    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      query = query.in('neighborhood', filters.neighborhoods);
    }

    if (filters.operationType) {
      query = query.eq('operation_type', filters.operationType);
    } else {
      query = query.eq('operation_type', 'venta');
    }

    if (filters.priceMin) {
      query = query.gte('price', filters.priceMin);
    }

    if (filters.priceMax) {
      query = query.lte('price', filters.priceMax);
    }

    if (filters.areaMin) {
      query = query.gte('total_area', filters.areaMin);
    }

    if (filters.areaMax) {
      query = query.lte('total_area', filters.areaMax);
    }

    if (filters.maxAge !== undefined) {
      query = query.lte('age', filters.maxAge);
    }

    if (filters.sources && filters.sources.length > 0) {
      query = query.in('source', filters.sources);
    }

    // Price must exist for meaningful comparables
    query = query.not('price', 'is', null).gt('price', 0);

    // Order
    const orderCol = filters.orderBy || 'price_per_m2';
    const orderDir = filters.orderDir === 'desc' ? false : true;
    query = query.order(orderCol, { ascending: orderDir, nullsFirst: false });

    // Limit — generous default for broad search
    const limit = Math.min(filters.limit || 100, 300);
    query = query.limit(limit);

    const { data, count, error } = await query;
    if (error) throw error;

    // Get last sync date
    const { data: lastRun } = await (adminClient as any)
      .from('market_scrape_runs')
      .select('finished_at')
      .in('status', ['completed', 'partial'])
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const listings = (data || []).map(rowToComparable);

    return {
      success: true,
      data: {
        listings,
        totalCount: count || 0,
        lastSyncAt: lastRun?.finished_at || null,
      },
    };
  } catch (err: any) {
    console.error('[Market Search]', err.message);
    return { success: false, error: err.message };
  }
}

// ── Get market stats (for dashboard) ────────────────────────────────────────

export async function getMarketStatsAction(): Promise<ActionResult<{
  totalActive: number;
  bySource: Record<string, number>;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const adminClient = createAdminClient();

  try {
    const { count: totalActive } = await (adminClient as any)
      .from('market_listings')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // Count by source
    const sources = ['zonaprop', 'argenprop', 'mercadolibre', 'facebook', 'custom', 'manual'];
    const bySource: Record<string, number> = {};
    for (const source of sources) {
      const { count } = await (adminClient as any)
        .from('market_listings')
        .select('id', { count: 'exact', head: true })
        .eq('source', source)
        .eq('is_active', true);
      bySource[source] = count || 0;
    }

    const { data: lastRun } = await (adminClient as any)
      .from('market_scrape_runs')
      .select('finished_at, status')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      success: true,
      data: {
        totalActive: totalActive || 0,
        bySource,
        lastSyncAt: lastRun?.finished_at || null,
        lastSyncStatus: lastRun?.status || null,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
