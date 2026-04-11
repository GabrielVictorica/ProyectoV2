import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

/**
 * POST /api/market/sync
 *
 * Webhook llamado por n8n durante el scraping periódico.
 * Acciones:
 *   - start:  Crea registro en market_scrape_runs
 *   - upsert: Upsert masivo de listings (dedup por source + source_url)
 *   - finish: Marca listings no vistos como inactivos, cierra el run
 *
 * Autenticación: MARKET_SYNC_API_KEY en header X-Sync-Key
 */
export async function POST(req: NextRequest) {
  // Auth check
  const syncKey = req.headers.get('x-sync-key');
  if (!syncKey || syncKey !== process.env.MARKET_SYNC_API_KEY) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  const adminClient = createAdminClient();

  try {
    switch (action) {
      case 'start':
        return await handleStart(adminClient, body);
      case 'upsert':
        return await handleUpsert(adminClient, body);
      case 'finish':
        return await handleFinish(adminClient, body);
      default:
        return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error(`[Market Sync] Error en action=${action}:`, err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── START: Create scrape run ────────────────────────────────────────────────

async function handleStart(db: any, body: { batchId: string }) {
  const { batchId } = body;
  if (!batchId) return Response.json({ error: 'batchId requerido' }, { status: 400 });

  const { error } = await db.from('market_scrape_runs').insert({
    batch_id: batchId,
    status: 'running',
  });

  if (error) throw error;
  return Response.json({ success: true, batchId });
}

// ── UPSERT: Bulk upsert listings ────────────────────────────────────────────

interface RawListing {
  source: string;
  source_url: string;
  source_id?: string;
  title: string;
  description?: string;
  property_type?: string;
  operation_type?: string;
  price?: number;
  currency?: string;
  total_area?: number;
  covered_area?: number;
  address?: string;
  neighborhood?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  age?: number;
  image_url?: string;
  image_urls?: string[];
  raw_data?: Record<string, unknown>;
}

async function handleUpsert(
  db: any,
  body: { batchId: string; source: string; listings: RawListing[] },
) {
  const { batchId, source, listings } = body;
  if (!batchId || !source || !Array.isArray(listings)) {
    return Response.json({ error: 'batchId, source y listings requeridos' }, { status: 400 });
  }

  let newCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);

    for (const listing of batch) {
      try {
        const pricePerM2 =
          listing.price && listing.total_area && listing.total_area > 0
            ? Math.round(listing.price / listing.total_area)
            : null;

        // Check if exists
        const { data: existing } = await db
          .from('market_listings')
          .select('id, price, currency')
          .eq('source', listing.source)
          .eq('source_url', listing.source_url)
          .maybeSingle();

        if (existing) {
          // Update existing
          const updates: Record<string, any> = {
            last_seen_at: new Date().toISOString(),
            scrape_batch_id: batchId,
            is_active: true,
            removed_at: null,
            title: listing.title,
            description: listing.description ?? null,
            property_type: listing.property_type ?? null,
            operation_type: listing.operation_type ?? 'venta',
            price: listing.price ?? null,
            currency: listing.currency ?? 'USD',
            price_per_m2: pricePerM2,
            total_area: listing.total_area ?? null,
            covered_area: listing.covered_area ?? null,
            address: listing.address ?? null,
            neighborhood: listing.neighborhood ?? null,
            city: listing.city ?? null,
            rooms: listing.rooms ?? null,
            bedrooms: listing.bedrooms ?? null,
            bathrooms: listing.bathrooms ?? null,
            garages: listing.garages ?? null,
            age: listing.age ?? null,
            image_url: listing.image_url ?? null,
            image_urls: listing.image_urls ?? [],
            raw_data: listing.raw_data ?? {},
          };

          // Detect price change → append to price_history
          if (
            listing.price &&
            existing.price &&
            listing.price !== Number(existing.price)
          ) {
            const { data: full } = await db
              .from('market_listings')
              .select('price_history')
              .eq('id', existing.id)
              .single();

            const history = Array.isArray(full?.price_history) ? full.price_history : [];
            history.push({
              date: new Date().toISOString(),
              price: Number(existing.price),
              currency: existing.currency || 'USD',
            });
            updates.price_history = history;
          }

          await db.from('market_listings').update(updates).eq('id', existing.id);
          updatedCount++;
        } else {
          // Insert new
          await db.from('market_listings').insert({
            source: listing.source,
            source_url: listing.source_url,
            source_id: listing.source_id ?? null,
            title: listing.title,
            description: listing.description ?? null,
            property_type: listing.property_type ?? null,
            operation_type: listing.operation_type ?? 'venta',
            price: listing.price ?? null,
            currency: listing.currency ?? 'USD',
            price_per_m2: pricePerM2,
            total_area: listing.total_area ?? null,
            covered_area: listing.covered_area ?? null,
            address: listing.address ?? null,
            neighborhood: listing.neighborhood ?? null,
            city: listing.city ?? null,
            province: listing.province ?? 'Buenos Aires',
            latitude: listing.latitude ?? null,
            longitude: listing.longitude ?? null,
            rooms: listing.rooms ?? null,
            bedrooms: listing.bedrooms ?? null,
            bathrooms: listing.bathrooms ?? null,
            garages: listing.garages ?? null,
            age: listing.age ?? null,
            image_url: listing.image_url ?? null,
            image_urls: listing.image_urls ?? [],
            is_active: true,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            price_history: [],
            raw_data: listing.raw_data ?? {},
            scrape_batch_id: batchId,
          });
          newCount++;
        }
      } catch (err: any) {
        errors.push(`${listing.source_url}: ${err.message}`);
      }
    }
  }

  // Update scrape run with source results
  const { data: run } = await db
    .from('market_scrape_runs')
    .select('source_results, total_found, total_new, total_updated')
    .eq('batch_id', batchId)
    .single();

  if (run) {
    const sourceResults = run.source_results || {};
    sourceResults[source] = {
      found: listings.length,
      new: newCount,
      updated: updatedCount,
      errors,
    };

    await db
      .from('market_scrape_runs')
      .update({
        source_results: sourceResults,
        total_found: (run.total_found || 0) + listings.length,
        total_new: (run.total_new || 0) + newCount,
        total_updated: (run.total_updated || 0) + updatedCount,
      })
      .eq('batch_id', batchId);
  }

  return Response.json({
    success: true,
    source,
    processed: listings.length,
    new: newCount,
    updated: updatedCount,
    errors: errors.length,
  });
}

// ── FINISH: Mark unseen listings as inactive ────────────────────────────────

async function handleFinish(
  db: any,
  body: { batchId: string; sources?: string[] },
) {
  const { batchId, sources } = body;
  if (!batchId) return Response.json({ error: 'batchId requerido' }, { status: 400 });

  const now = new Date().toISOString();
  let totalRemoved = 0;

  // For each source that was scraped in this batch, mark listings NOT seen as inactive
  const sourcesToCheck = sources || ['zonaprop', 'argenprop', 'mercadolibre', 'facebook'];

  for (const source of sourcesToCheck) {
    const { count } = await db
      .from('market_listings')
      .update({
        is_active: false,
        removed_at: now,
      })
      .eq('source', source)
      .eq('is_active', true)
      .neq('scrape_batch_id', batchId)
      .select('id', { count: 'exact', head: true });

    totalRemoved += count || 0;
  }

  // Determine final status
  const { data: run } = await db
    .from('market_scrape_runs')
    .select('source_results')
    .eq('batch_id', batchId)
    .single();

  const sourceResults = run?.source_results || {};
  const hasErrors = Object.values(sourceResults).some(
    (r: any) => r.errors && r.errors.length > 0,
  );
  const allSourcesPresent = sourcesToCheck.every((s) => s in sourceResults);
  const finalStatus = !allSourcesPresent ? 'partial' : hasErrors ? 'partial' : 'completed';

  await db
    .from('market_scrape_runs')
    .update({
      status: finalStatus,
      finished_at: now,
      total_removed: totalRemoved,
    })
    .eq('batch_id', batchId);

  return Response.json({
    success: true,
    status: finalStatus,
    totalRemoved,
  });
}
