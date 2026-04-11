'use client';

import { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  ExternalLink,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PROPERTY_SUBTYPE_LABELS,
  CONSERVATION_STATE_LABELS,
} from '../constants/acmConstants';
import type { NormalizedComparable } from '../types/acm';

const SOURCE_ICONS: Record<string, { label: string; color: string }> = {
  zonaprop: { label: 'ZP', color: 'text-blue-400 bg-blue-500/10' },
  argenprop: { label: 'AP', color: 'text-orange-400 bg-orange-500/10' },
  mercadolibre: { label: 'ML', color: 'text-yellow-400 bg-yellow-500/10' },
  facebook: { label: 'FB', color: 'text-sky-400 bg-sky-500/10' },
  custom: { label: 'CU', color: 'text-violet-400 bg-violet-500/10' },
  manual: { label: 'MA', color: 'text-emerald-400 bg-emerald-500/10' },
};

// Extended range: 0.5 to 1.5 for markets like General Roca
const FACTOR_OPTIONS = [
  { value: 0.5, label: 'Muy superior (2x)' },
  { value: 0.6, label: 'Muy superior' },
  { value: 0.7, label: 'Superior' },
  { value: 0.8, label: 'Bastante superior' },
  { value: 0.85, label: 'Algo superior' },
  { value: 0.9, label: 'Lev. superior' },
  { value: 0.95, label: 'Lev. superior' },
  { value: 1.0, label: 'Similar' },
  { value: 1.05, label: 'Lev. inferior' },
  { value: 1.1, label: 'Algo inferior' },
  { value: 1.15, label: 'Inferior' },
  { value: 1.2, label: 'Bastante inferior' },
  { value: 1.3, label: 'Muy inferior' },
  { value: 1.4, label: 'Muy inferior' },
  { value: 1.5, label: 'Muy inferior (0.5x)' },
];

type SortField = 'relevanceScore' | 'pricePerM2' | 'price' | 'totalArea' | 'source';

interface Props {
  comparables: NormalizedComparable[];
  onChange: (comparables: NormalizedComparable[]) => void;
}

// ── Relevance badge ───────────────────────────────────────────────────────

function RelevanceBadge({ score }: { score: number | null }) {
  if (score === null || score < 0) {
    return <span className="w-2 h-2 rounded-full bg-white/10 shrink-0" title="Sin datos para calcular" />;
  }
  const color =
    score >= 0.7 ? 'bg-emerald-400' :
    score >= 0.4 ? 'bg-amber-400' :
    'bg-white/20';
  const label =
    score >= 0.7 ? 'Alta relevancia' :
    score >= 0.4 ? 'Relevancia media' :
    'Baja relevancia';

  return (
    <span
      className={`w-2 h-2 rounded-full ${color} shrink-0`}
      title={`${label} (${Math.round(score * 100)}%)`}
    />
  );
}

export function ComparablesTable({ comparables, onChange }: Props) {
  const [sortField, setSortField] = useState<SortField>('relevanceScore');
  const [sortAsc, setSortAsc] = useState(false); // relevance: descending by default
  const [filterSource, setFilterSource] = useState<string>('all');

  // Toggle selection
  const toggleSelect = (id: string) => {
    onChange(
      comparables.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)),
    );
  };

  // Select all / none
  const toggleAll = () => {
    const allSelected = filtered.every((c) => c.selected);
    const ids = new Set(filtered.map((c) => c.id));
    onChange(
      comparables.map((c) => (ids.has(c.id) ? { ...c, selected: !allSelected } : c)),
    );
  };

  // Update factor
  const updateFactor = (id: string, factor: number) => {
    onChange(
      comparables.map((c) =>
        c.id === id
          ? {
              ...c,
              adjustmentFactor: factor,
              adjustedPricePerM2: c.pricePerM2 ? Math.round(c.pricePerM2 * factor) : null,
            }
          : c,
      ),
    );
  };

  // Update notes
  const updateNotes = (id: string, notes: string) => {
    onChange(comparables.map((c) => (c.id === id ? { ...c, notes } : c)));
  };

  // Update manual labels (subtype / conservation)
  const updateField = (id: string, field: 'propertySubtype' | 'conservationState', value: string | null) => {
    onChange(comparables.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Remove
  const remove = (id: string) => {
    onChange(comparables.filter((c) => c.id !== id));
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...comparables];
    if (filterSource !== 'all') {
      list = list.filter((c) => c.source === filterSource);
    }
    list.sort((a, b) => {
      const aVal = a[sortField] ?? -1;
      const bVal = b[sortField] ?? -1;
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [comparables, filterSource, sortField, sortAsc]);

  const sources = useMemo(
    () => [...new Set(comparables.map((c) => c.source))],
    [comparables],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(field === 'relevanceScore' ? false : true);
    }
  };

  if (comparables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <SlidersHorizontal className="h-6 w-6 text-white/20" />
        </div>
        <p className="text-white/30 text-sm">Aún no hay comparables</p>
        <p className="text-white/20 text-xs">
          Buscá comparables en la base de mercado o agregalos manualmente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[140px] bg-white/[0.04] border-white/[0.08] text-white text-xs h-8 rounded-lg">
            <Filter className="h-3 w-3 mr-1.5 text-white/40" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-white/[0.08]">
            <SelectItem value="all" className="text-white/80 text-xs">
              Todas las fuentes
            </SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s} className="text-white/80 text-xs">
                {SOURCE_ICONS[s]?.label || s} ({comparables.filter((c) => c.source === s).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-[11px] text-white/30">
          {filtered.filter((c) => c.selected).length} de {filtered.length} seleccionados
        </span>

        {/* Relevance legend */}
        <div className="flex items-center gap-2 ml-auto text-[9px] text-white/20">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Alta</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Media</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/20" /> Baja/sin datos</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="w-8 p-2">
                <button onClick={toggleAll} className="text-white/40 hover:text-white/70">
                  {filtered.every((c) => c.selected) ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                </button>
              </th>
              <th className="p-2 text-left text-white/30 font-medium w-8" title="Relevancia">
                <button onClick={() => handleSort('relevanceScore')} className="hover:text-white/60">
                  Rel
                </button>
              </th>
              <th className="p-2 text-left text-white/30 font-medium w-10">Fuente</th>
              <th className="p-2 text-left text-white/30 font-medium">Dirección / Etiquetas</th>
              <th className="p-2 text-right text-white/30 font-medium w-16">
                <button onClick={() => handleSort('totalArea')} className="inline-flex items-center gap-1 hover:text-white/60">
                  m² <ArrowUpDown className="h-2.5 w-2.5" />
                </button>
              </th>
              <th className="p-2 text-right text-white/30 font-medium w-24">
                <button onClick={() => handleSort('price')} className="inline-flex items-center gap-1 hover:text-white/60">
                  Precio <ArrowUpDown className="h-2.5 w-2.5" />
                </button>
              </th>
              <th className="p-2 text-right text-white/30 font-medium w-20">
                <button onClick={() => handleSort('pricePerM2')} className="inline-flex items-center gap-1 hover:text-white/60">
                  USD/m² <ArrowUpDown className="h-2.5 w-2.5" />
                </button>
              </th>
              <th className="p-2 text-center text-white/30 font-medium w-32">Factor</th>
              <th className="p-2 text-right text-white/30 font-medium w-20">Ajustado</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((comp) => {
              const src = SOURCE_ICONS[comp.source] || { label: '?', color: 'text-white/40 bg-white/5' };
              return (
                <tr
                  key={comp.id}
                  className={`border-b border-white/[0.04] transition-colors ${
                    comp.selected
                      ? 'bg-violet-500/[0.04]'
                      : 'bg-transparent opacity-50'
                  } hover:bg-white/[0.03]`}
                >
                  {/* Select */}
                  <td className="p-2 text-center">
                    <button onClick={() => toggleSelect(comp.id)} className="text-white/40 hover:text-white/70">
                      {comp.selected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-violet-400" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>

                  {/* Relevance badge */}
                  <td className="p-2">
                    <RelevanceBadge score={comp.relevanceScore} />
                  </td>

                  {/* Source badge */}
                  <td className="p-2">
                    <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold ${src.color}`}>
                      {src.label}
                    </span>
                  </td>

                  {/* Address + labels */}
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/70 truncate max-w-[180px]">
                        {comp.address || comp.title || 'Sin dirección'}
                      </span>
                      {comp.sourceUrl && (
                        <a
                          href={comp.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400/50 hover:text-violet-400 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {/* Labels row: subtype + conservation + notes */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {/* Subtype label (editable inline) */}
                      <select
                        value={comp.propertySubtype || ''}
                        onChange={(e) => updateField(comp.id, 'propertySubtype', e.target.value || null)}
                        className="text-[9px] bg-transparent border border-white/[0.06] rounded px-1 py-0 text-white/40 focus:text-white/60 focus:border-violet-500/30 outline-none"
                        title="Subtipo"
                      >
                        <option value="">Subtipo</option>
                        {Object.entries(PROPERTY_SUBTYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      {/* Conservation label (editable inline) */}
                      <select
                        value={comp.conservationState || ''}
                        onChange={(e) => updateField(comp.id, 'conservationState', e.target.value || null)}
                        className="text-[9px] bg-transparent border border-white/[0.06] rounded px-1 py-0 text-white/40 focus:text-white/60 focus:border-violet-500/30 outline-none"
                        title="Estado conservación"
                      >
                        <option value="">Estado</option>
                        {Object.entries(CONSERVATION_STATE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      {/* Notes inline */}
                      <input
                        value={comp.notes}
                        onChange={(e) => updateNotes(comp.id, e.target.value)}
                        placeholder="Nota..."
                        className="flex-1 min-w-[60px] text-[9px] text-white/30 bg-transparent border-0 border-b border-white/[0.04] focus:border-violet-500/30 focus:text-white/50 outline-none px-0 py-0 placeholder:text-white/15"
                      />
                    </div>
                  </td>

                  {/* Area */}
                  <td className="p-2 text-right text-white/50 tabular-nums">
                    {comp.totalArea ? `${comp.totalArea}` : '—'}
                  </td>

                  {/* Price */}
                  <td className="p-2 text-right text-white/70 tabular-nums font-medium">
                    {comp.currency} {comp.price?.toLocaleString('es-AR') || '—'}
                  </td>

                  {/* Price per m2 */}
                  <td className="p-2 text-right text-white/50 tabular-nums">
                    {comp.pricePerM2?.toLocaleString('es-AR') || '—'}
                  </td>

                  {/* Adjustment factor */}
                  <td className="p-2">
                    <Select
                      value={comp.adjustmentFactor.toString()}
                      onValueChange={(v) => updateFactor(comp.id, Number(v))}
                    >
                      <SelectTrigger className="h-6 bg-white/[0.03] border-white/[0.06] text-[10px] text-white/60 rounded-md px-1.5 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass border-white/[0.08]">
                        {FACTOR_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value.toString()}
                            className="text-white/80 text-[11px]"
                          >
                            {opt.value.toFixed(2)} — {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Adjusted price per m2 */}
                  <td className="p-2 text-right tabular-nums font-medium">
                    <span className={comp.adjustmentFactor !== 1.0 ? 'text-amber-400/80' : 'text-white/50'}>
                      {comp.adjustedPricePerM2?.toLocaleString('es-AR') || '—'}
                    </span>
                  </td>

                  {/* Remove */}
                  <td className="p-2 text-center">
                    <button
                      onClick={() => remove(comp.id)}
                      className="text-white/20 hover:text-red-400/70 text-[10px]"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
