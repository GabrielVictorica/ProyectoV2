'use client';

import { useState } from 'react';
import { Search, Loader2, Database, Clock, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_SUBTYPE_OPTIONS,
  CONSERVATION_STATE_OPTIONS,
} from '../constants/acmConstants';
import { useMarketSearch } from '../hooks/useMarketListings';
import type { PropertyData, PropertyType, NormalizedComparable } from '../types/acm';

interface Props {
  acmId: string;
  propertyData: Partial<PropertyData>;
  onResults: (comparables: NormalizedComparable[]) => void;
}

// ── Toggle chip for optional filters ──────────────────────────────────────

function FilterToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors border ${
        active
          ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
          : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.12]'
      }`}
    >
      {active && <X className="h-2.5 w-2.5" />}
      {label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ComparablesSearch({ acmId, propertyData, onResults }: Props) {
  const searchMutation = useMarketSearch();

  // Required filters (always visible)
  const [city, setCity] = useState(propertyData.city || 'General Roca');
  const [propertyType, setPropertyType] = useState(propertyData.propertyType || '');

  // Optional filter toggles
  const [showSubtype, setShowSubtype] = useState(false);
  const [showConservation, setShowConservation] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [showAge, setShowAge] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Optional filter values
  const [propertySubtype, setPropertySubtype] = useState('');
  const [conservationState, setConservationState] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [orderBy, setOrderBy] = useState<string>('price_per_m2');

  const subtypeOptions = propertyType
    ? PROPERTY_SUBTYPE_OPTIONS[propertyType as PropertyType]
    : undefined;

  const handleSearch = async () => {
    if (!propertyType) {
      toast.error('Seleccioná un tipo de propiedad');
      return;
    }

    const result = await searchMutation.mutateAsync({
      city: city || undefined,
      propertyType: propertyType || undefined,
      propertySubtype: showSubtype && propertySubtype ? propertySubtype : undefined,
      conservationState: showConservation && conservationState ? conservationState : undefined,
      priceMin: showPrice && priceMin ? Number(priceMin) : undefined,
      priceMax: showPrice && priceMax ? Number(priceMax) : undefined,
      areaMin: showArea && areaMin ? Number(areaMin) : undefined,
      areaMax: showArea && areaMax ? Number(areaMax) : undefined,
      maxAge: showAge && maxAge ? Number(maxAge) : undefined,
      includeInactive: showInactive || undefined,
      onlyActive: showInactive ? false : true,
      limit: 200,
      orderBy: orderBy as any,
    });

    if (result.listings.length > 0) {
      // Calculate relevance scores client-side
      const scored = result.listings.map((comp) => ({
        ...comp,
        relevanceScore: calculateRelevance(propertyData, comp),
      }));
      // Sort by relevance first, then by orderBy
      scored.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
      onResults(scored);
      toast.success(`${scored.length} comparables encontrados (de ${result.totalCount} en la zona)`);
    } else {
      toast.info('No se encontraron comparables. Probá quitar filtros opcionales.');
    }
  };

  const lastSync = searchMutation.data?.lastSyncAt;
  const lastSyncLabel = lastSync ? formatTimeAgo(new Date(lastSync)) : null;

  const activeFilterCount = [showSubtype, showConservation, showPrice, showArea, showAge, showInactive].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Required filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-white/40">Ciudad *</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="General Roca"
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/40">Tipo de propiedad *</label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 rounded-xl">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent className="glass border-white/[0.08]">
              {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-white/80">
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/40">Ordenar por</label>
          <Select value={orderBy} onValueChange={setOrderBy}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass border-white/[0.08]">
              <SelectItem value="price_per_m2" className="text-white/80">USD/m²</SelectItem>
              <SelectItem value="price" className="text-white/80">Precio</SelectItem>
              <SelectItem value="total_area" className="text-white/80">Superficie</SelectItem>
              <SelectItem value="last_seen_at" className="text-white/80">Más recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Optional filter toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-white/20 flex items-center gap-1 mr-1">
          <Filter className="h-2.5 w-2.5" />
          Filtros:
        </span>
        {subtypeOptions && subtypeOptions.length > 0 && (
          <FilterToggle label="Subtipo" active={showSubtype} onToggle={() => setShowSubtype(!showSubtype)} />
        )}
        <FilterToggle label="Conservación" active={showConservation} onToggle={() => setShowConservation(!showConservation)} />
        <FilterToggle label="Precio" active={showPrice} onToggle={() => setShowPrice(!showPrice)} />
        <FilterToggle label="Superficie" active={showArea} onToggle={() => setShowArea(!showArea)} />
        <FilterToggle label="Antigüedad" active={showAge} onToggle={() => setShowAge(!showAge)} />
        <FilterToggle label="Inactivos" active={showInactive} onToggle={() => setShowInactive(!showInactive)} />
      </div>

      {/* Active optional filters */}
      {activeFilterCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-1 border-l-2 border-violet-500/20">
          {showSubtype && subtypeOptions && (
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Subtipo</label>
              <Select value={propertySubtype} onValueChange={setPropertySubtype}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="glass border-white/[0.08]">
                  {subtypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-white/80">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showConservation && (
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Estado conservación</label>
              <Select value={conservationState} onValueChange={setConservationState}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white text-sm h-9 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="glass border-white/[0.08]">
                  {CONSERVATION_STATE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-white/80">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showPrice && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] text-white/40">Precio mín. (USD)</label>
                <Input
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  type="number"
                  placeholder="Sin mínimo"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/40">Precio máx. (USD)</label>
                <Input
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  type="number"
                  placeholder="Sin máximo"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl"
                />
              </div>
            </>
          )}
          {showArea && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] text-white/40">m² mín.</label>
                <Input
                  value={areaMin}
                  onChange={(e) => setAreaMin(e.target.value)}
                  type="number"
                  placeholder="Sin mínimo"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/40">m² máx.</label>
                <Input
                  value={areaMax}
                  onChange={(e) => setAreaMax(e.target.value)}
                  type="number"
                  placeholder="Sin máximo"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl"
                />
              </div>
            </>
          )}
          {showAge && (
            <div className="space-y-1">
              <label className="text-[11px] text-white/40">Antigüedad máx. (años)</label>
              <Input
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                type="number"
                placeholder="Sin límite"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 text-sm h-9 rounded-xl"
              />
            </div>
          )}
          {showInactive && (
            <div className="flex items-end pb-1">
              <span className="text-[10px] text-amber-400/60">
                Incluye propiedades posiblemente vendidas/retiradas
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search button + sync info */}
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="h-9 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 rounded-xl text-sm px-6"
        >
          {searchMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Buscar en base de mercado
            </>
          )}
        </Button>

        <div className="flex items-center gap-3 text-[10px] text-white/25">
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Base local
          </span>
          {lastSyncLabel && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Actualizada {lastSyncLabel}
            </span>
          )}
        </div>
      </div>

      {/* Results summary */}
      {searchMutation.data && (
        <div className="text-[11px] text-white/30">
          {searchMutation.data.totalCount > 0
            ? `${searchMutation.data.totalCount} propiedades coinciden en la base de mercado`
            : 'Sin resultados. Probá quitar filtros opcionales.'}
        </div>
      )}
    </div>
  );
}

// ── Relevance score (client-side) ─────────────────────────────────────────

function calculateRelevance(
  property: Partial<PropertyData>,
  comparable: NormalizedComparable,
): number {
  let score = 0;
  let factors = 0;

  // Subtype match (high weight)
  if (property.propertySubtype && comparable.propertySubtype) {
    factors++;
    score += property.propertySubtype === comparable.propertySubtype ? 1 : 0.3;
  }

  // Conservation state match
  if (property.conservationState && comparable.conservationState) {
    factors++;
    score += property.conservationState === comparable.conservationState ? 1 : 0.4;
  }

  // Area similarity (±20% = high, ±50% = medium)
  if (property.totalArea && comparable.totalArea) {
    factors++;
    const diff = Math.abs(property.totalArea - comparable.totalArea) / property.totalArea;
    if (diff <= 0.2) score += 1;
    else if (diff <= 0.5) score += 0.6;
    else score += 0.2;
  }

  // Age similarity (±10 years = high)
  if (property.age !== null && property.age !== undefined && comparable.age !== null) {
    factors++;
    const ageDiff = Math.abs(property.age - comparable.age);
    if (ageDiff <= 5) score += 1;
    else if (ageDiff <= 15) score += 0.6;
    else score += 0.2;
  }

  // Freshness bonus (last 30 days)
  // We don't have lastSeenAt on NormalizedComparable, so skip for now

  if (factors === 0) return -1; // Not enough data
  return score / factors;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `hace ${diffHours}h`;
  return 'recién';
}
