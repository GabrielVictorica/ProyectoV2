/**
 * Utilidades de formateo centralizadas para asegurar consistencia en todo el sistema.
 * Configurado por defecto para USD y Localización en Español-Argentina.
 */

const CURRENCY_OPTIONS: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
};

const PERCENT_OPTIONS: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
};

/**
 * Formatea un número como moneda USD.
 * @example formatCurrency(1250) => "$ 1,250"
 */
export const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    try {
        return new Intl.NumberFormat('en-US', CURRENCY_OPTIONS).format(amount);
    } catch (e) {
        return '-';
    }
};

/**
 * Formatea un número como porcentaje.
 * @example formatPercent(0.05) => "5.0%"
 */
export const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0%';
    try {
        // Si el valor viene como 30 para significar 30%, lo dividimos por 100
        const normalizedValue = value > 1 ? value / 100 : value;
        return new Intl.NumberFormat('es-AR', PERCENT_OPTIONS).format(normalizedValue);
    } catch (e) {
        return '0%';
    }
};

/**
 * Formatea una fecha en formato legible.
 * @example formatDate('2024-01-25') => "25 de enero de 2024"
 */
export const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('es-AR', DATE_OPTIONS).format(d);
    } catch (e) {
        return '-';
    }
};

/**
 * Abrevia números grandes (K, M).
 * @example formatCompactNumber(1500) => "1.5K"
 */
export const formatCompactNumber = (number: number | null | undefined): string => {
    if (number === null || number === undefined) return '0';
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(number);
};
