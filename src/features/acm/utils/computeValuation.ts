import type { NormalizedComparable, AcmConclusions, Currency } from '../types/acm';

/**
 * Calcula las conclusiones numéricas de valuación a partir de los comparables seleccionados.
 */
export function computeValuation(
  comparables: NormalizedComparable[],
  totalAreaM2: number | null,
  currency: Currency = 'USD',
): AcmConclusions {
  const selected = comparables.filter((c) => c.selected);
  const prices = selected
    .map((c) => c.adjustedPricePerM2 ?? c.pricePerM2)
    .filter((p): p is number => p !== null && p > 0);

  if (prices.length === 0 || !totalAreaM2 || totalAreaM2 <= 0) {
    return emptyConclusions(currency);
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = prices.reduce((a, b) => a + b, 0);

  const avg = Math.round(sum / n);
  const median = n % 2 === 0
    ? Math.round((sorted[n / 2 - 1] + sorted[n / 2]) / 2)
    : sorted[Math.floor(n / 2)];
  const min = sorted[0];
  const max = sorted[n - 1];

  // Percentiles for range
  const p25 = percentile(sorted, 25);
  const p75 = percentile(sorted, 75);

  const suggestedPricePerM2 = median; // Mediana como valor de referencia
  const suggestedTotalPrice = Math.round(suggestedPricePerM2 * totalAreaM2);
  const suggestedRangeLow = Math.round(p25 * totalAreaM2);
  const suggestedRangeHigh = Math.round(p75 * totalAreaM2);

  // Adjusted average (using adjustment factors)
  const adjustedPrices = selected
    .map((c) => c.adjustedPricePerM2)
    .filter((p): p is number => p !== null && p > 0);
  const adjustedAvg = adjustedPrices.length > 0
    ? Math.round(adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length)
    : avg;

  return {
    comparablesUsed: selected.length,
    avgPricePerM2: avg,
    medianPricePerM2: median,
    minPricePerM2: min,
    maxPricePerM2: max,
    adjustedAvgPricePerM2: adjustedAvg,
    suggestedPricePerM2,
    suggestedTotalPrice,
    suggestedRangeLow,
    suggestedRangeHigh,
    currency,
    methodology: `Análisis comparativo de mercado basado en ${selected.length} comparables seleccionados. ` +
      `Se calculó la mediana de los valores USD/m² ajustados como valor de referencia, ` +
      `y los percentiles 25 y 75 como rango sugerido de publicación.`,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function emptyConclusions(currency: Currency): AcmConclusions {
  return {
    comparablesUsed: 0,
    avgPricePerM2: 0,
    medianPricePerM2: 0,
    minPricePerM2: 0,
    maxPricePerM2: 0,
    adjustedAvgPricePerM2: 0,
    suggestedPricePerM2: 0,
    suggestedTotalPrice: 0,
    suggestedRangeLow: 0,
    suggestedRangeHigh: 0,
    currency,
    methodology: '',
  };
}
