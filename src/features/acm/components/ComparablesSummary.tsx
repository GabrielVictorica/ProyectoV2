'use client';

import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NormalizedComparable } from '../types/acm';

interface Props {
  comparables: NormalizedComparable[];
}

export function ComparablesSummary({ comparables }: Props) {
  const stats = useMemo(() => {
    const selected = comparables.filter((c) => c.selected);
    if (selected.length === 0) return null;

    const prices = selected
      .map((c) => c.adjustedPricePerM2 ?? c.pricePerM2)
      .filter((p): p is number => p !== null && p > 0);

    if (prices.length === 0) return null;

    const sorted = [...prices].sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / prices.length);
    const median =
      sorted.length % 2 === 0
        ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
        : sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const spread = avg > 0 ? Math.round(((max - min) / avg) * 100) : 0;

    // Distribution by source
    const bySrc: Record<string, number> = {};
    selected.forEach((c) => {
      bySrc[c.source] = (bySrc[c.source] || 0) + 1;
    });

    return { count: selected.length, avg, median, min, max, spread, bySrc, total: comparables.length };
  }, [comparables]);

  if (!stats) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
        <BarChart3 className="h-5 w-5 text-white/15 mx-auto mb-2" />
        <p className="text-[11px] text-white/25">Seleccioná comparables para ver el resumen</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-violet-400/60" />
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          Resumen
        </span>
        <span className="ml-auto text-[10px] text-white/25">
          {stats.count} de {stats.total}
        </span>
      </div>

      {/* Main stat */}
      <div className="text-center py-2">
        <p className="text-[10px] text-white/30 mb-1">USD/m² promedio</p>
        <p className="text-2xl font-bold text-white tabular-nums">
          {stats.avg.toLocaleString('es-AR')}
        </p>
        <p className="text-[10px] text-white/25 mt-1">
          Mediana: {stats.median.toLocaleString('es-AR')}
        </p>
      </div>

      {/* Range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <TrendingDown className="h-3 w-3 text-emerald-400/50 mx-auto mb-1" />
          <p className="text-[10px] text-white/30">Mínimo</p>
          <p className="text-sm font-semibold text-white/70 tabular-nums">
            {stats.min.toLocaleString('es-AR')}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <TrendingUp className="h-3 w-3 text-amber-400/50 mx-auto mb-1" />
          <p className="text-[10px] text-white/30">Máximo</p>
          <p className="text-sm font-semibold text-white/70 tabular-nums">
            {stats.max.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* Spread */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-white/30">Dispersión</span>
        <span
          className={`text-[11px] font-medium tabular-nums ${
            stats.spread <= 15
              ? 'text-emerald-400/70'
              : stats.spread <= 30
                ? 'text-amber-400/70'
                : 'text-red-400/70'
          }`}
        >
          ±{stats.spread}%
        </span>
      </div>

      {/* Source distribution */}
      <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/25">Por fuente</p>
        {Object.entries(stats.bySrc).map(([src, count]) => (
          <div key={src} className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 capitalize">{src}</span>
            <span className="text-[10px] text-white/50 font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
