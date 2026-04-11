import { searchMarketListingsAction } from '@/features/acm/actions/marketActions';
import type { MarketSearchFilters } from '@/features/acm/types/acm';

/**
 * POST /api/market/search
 * Búsqueda de comparables en market_listings (base local).
 */
export async function POST(req: Request) {
  const filters: MarketSearchFilters = await req.json();
  const result = await searchMarketListingsAction(filters);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json(result.data);
}
