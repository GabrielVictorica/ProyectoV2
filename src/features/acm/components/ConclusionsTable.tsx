'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit3,
  Check,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { computeValuation } from '../utils/computeValuation';
import type { NormalizedComparable, AcmConclusions } from '../types/acm';

// ── Source badge colors ─────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  zonaprop: 'bg-orange-500/20 text-orange-400',
  argenprop: 'bg-blue-500/20 text-blue-400',
  mercadolibre: 'bg-yellow-500/20 text-yellow-400',
  facebook: 'bg-indigo-500/20 text-indigo-400',
  manual: 'bg-white/10 text-white/50',
  custom: 'bg-violet-500/20 text-violet-400',
};

interface Props {
  comparables: NormalizedComparable[];
  totalAreaM2: number | null;
  conclusions: Partial<AcmConclusions> | null;
  onConclusionsChange: (conclusions: AcmConclusions) => void;
}

export function ConclusionsTable({
  comparables,
  totalAreaM2,
  conclusions: savedConclusions,
  onConclusionsChange,
}: Props) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [manualPrice, setManualPrice] = useState<string>('');

  const selected = useMemo(
    () => comparables.filter((c) => c.selected),
    [comparables],
  );

  const computed = useMemo(
    () => computeValuation(comparables, totalAreaM2),
    [comparables, totalAreaM2],
  );

  // Use saved conclusions if they have a manual override, otherwise computed
  const conclusions = savedConclusions?.suggestedTotalPrice
    ? { ...computed, ...savedConclusions } as AcmConclusions
    : computed;

  const fmt = (n: number) => n.toLocaleString('es-AR');

  // ── Manual price override ─────────────────────────────────────────────────

  const startEditPrice = () => {
    setManualPrice(String(conclusions.suggestedTotalPrice));
    setEditingPrice(true);
  };

  const confirmPrice = () => {
    const value = parseInt(manualPrice, 10);
    if (!isNaN(value) && value > 0 && totalAreaM2 && totalAreaM2 > 0) {
      onConclusionsChange({
        ...computed,
        suggestedTotalPrice: value,
        suggestedPricePerM2: Math.round(value / totalAreaM2),
      });
    }
    setEditingPrice(false);
  };

  if (selected.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <Calculator className="h-6 w-6 text-white/15 mx-auto mb-2" />
        <p className="text-sm text-white/30">No hay comparables seleccionados</p>
        <p className="text-[10px] text-white/20 mt-1">Volvé al paso 2 para seleccionar comparables</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Valuation Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
            Valuación sugerida
          </span>
        </div>

        {/* Main price */}
        <div className="text-center mb-4">
          {editingPrice ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-white/40 text-lg">USD</span>
              <Input
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                type="number"
                className="w-40 bg-white/[0.06] border-violet-500/30 text-white text-xl font-bold text-center rounded-xl h-12"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmPrice()}
              />
              <Button
                size="sm"
                onClick={confirmPrice}
                className="h-8 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-lg"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="group">
              <p className="text-[10px] text-white/30 mb-1">Rango sugerido</p>
              <p className="text-lg text-white/50 font-medium tabular-nums">
                USD {fmt(conclusions.suggestedRangeLow)} – {fmt(conclusions.suggestedRangeHigh)}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-3xl font-bold text-white tabular-nums">
                  USD {fmt(conclusions.suggestedTotalPrice)}
                </p>
                <button
                  onClick={startEditPrice}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/[0.06]"
                  title="Editar precio manualmente"
                >
                  <Edit3 className="h-3.5 w-3.5 text-white/30" />
                </button>
              </div>
              <p className="text-[10px] text-white/25 mt-1">Valor de referencia (mediana ajustada)</p>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox
            icon={<BarChart3 className="h-3 w-3 text-violet-400/50" />}
            label="Comparables"
            value={String(conclusions.comparablesUsed)}
          />
          <StatBox
            icon={<DollarSign className="h-3 w-3 text-violet-400/50" />}
            label="USD/m² prom."
            value={fmt(conclusions.adjustedAvgPricePerM2)}
          />
          <StatBox
            icon={<TrendingDown className="h-3 w-3 text-emerald-400/50" />}
            label="USD/m² mín."
            value={fmt(conclusions.minPricePerM2)}
          />
          <StatBox
            icon={<TrendingUp className="h-3 w-3 text-amber-400/50" />}
            label="USD/m² máx."
            value={fmt(conclusions.maxPricePerM2)}
          />
        </div>

        {totalAreaM2 && (
          <p className="text-[10px] text-white/20 text-center mt-3">
            Superficie tasada: {totalAreaM2} m² · Mediana USD/m²: {fmt(conclusions.medianPricePerM2)}
          </p>
        )}
      </motion.div>

      {/* ── Comparables detail table ── */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-violet-400/60" />
          <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
            Detalle de comparables usados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/30">
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Fuente</th>
                <th className="text-left px-3 py-2 font-medium">Dirección</th>
                <th className="text-right px-3 py-2 font-medium">m²</th>
                <th className="text-right px-3 py-2 font-medium">Precio</th>
                <th className="text-right px-3 py-2 font-medium">USD/m²</th>
                <th className="text-center px-3 py-2 font-medium">Factor</th>
                <th className="text-right px-3 py-2 font-medium">Ajust.</th>
                <th className="text-left px-3 py-2 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2 text-white/25 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${SOURCE_COLORS[c.source] || SOURCE_COLORS.custom}`}>
                      {c.source.slice(0, 2).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/60 max-w-[200px] truncate">
                    {c.address || c.title}
                  </td>
                  <td className="px-3 py-2 text-right text-white/50 tabular-nums">
                    {c.totalArea ?? '–'}
                  </td>
                  <td className="px-3 py-2 text-right text-white/50 tabular-nums">
                    {c.price ? fmt(c.price) : '–'}
                  </td>
                  <td className="px-3 py-2 text-right text-white/50 tabular-nums">
                    {c.pricePerM2 ? fmt(c.pricePerM2) : '–'}
                  </td>
                  <td className="px-3 py-2 text-center text-white/40 tabular-nums">
                    ×{c.adjustmentFactor.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-white font-medium tabular-nums">
                    {c.adjustedPricePerM2 ? fmt(c.adjustedPricePerM2) : '–'}
                  </td>
                  <td className="px-3 py-2 text-white/30 max-w-[150px] truncate">
                    {c.notes || '–'}
                  </td>
                </tr>
              ))}

              {/* Summary row */}
              <tr className="bg-white/[0.03] font-medium">
                <td className="px-3 py-2.5" colSpan={5}>
                  <span className="text-white/40">Resumen ({selected.length} comparables)</span>
                </td>
                <td className="px-3 py-2.5 text-right text-white/50 tabular-nums">
                  {fmt(conclusions.avgPricePerM2)}
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right text-violet-400 tabular-nums">
                  {fmt(conclusions.adjustedAvgPricePerM2)}
                </td>
                <td className="px-3 py-2.5 text-white/25">Promedio ajust.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology */}
      {conclusions.methodology && (
        <p className="text-[10px] text-white/20 leading-relaxed px-1">
          {conclusions.methodology}
        </p>
      )}
    </div>
  );
}

// ── Stat box helper ─────────────────────────────────────────────────────────

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center p-2.5 rounded-lg bg-white/[0.04]">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-[10px] text-white/30">{label}</p>
      <p className="text-sm font-semibold text-white/70 tabular-nums">{value}</p>
    </div>
  );
}
