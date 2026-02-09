/**
 * Constantes de configuración del módulo de objetivos.
 * Valores por defecto utilizados para calibración de métricas.
 */
export const OBJECTIVES_DEFAULTS = {
    /** Porcentaje del split por defecto (50% = 50/50 con la inmobiliaria) */
    SPLIT_PERCENTAGE: 50,

    /** Tasa de conversión por defecto (6 PL/PB por cada punta cerrada) */
    CONVERSION_RATE: 6,

    /** Semanas laborables por año por defecto */
    WORKING_WEEKS: 48,

    /** Porcentaje de comisión promedio por defecto */
    DEFAULT_COMMISSION_PERCENT: 3,

    /** Moneda por defecto */
    DEFAULT_CURRENCY: 'USD',
} as const;

/**
 * Tipos de moneda soportados por el sistema.
 */
export const SUPPORTED_CURRENCIES = ['USD', 'ARS'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Helper para calcular métricas derivadas de objetivos.
 */
export const calculateDerivedMetrics = (params: {
    annualBillingGoal: number;
    averageTicketTarget: number;
    averageCommissionTarget: number;
    splitPercentage: number;
    conversionRate: number;
    workingWeeks: number;
    monthlyLivingExpenses: number;
}) => {
    const {
        annualBillingGoal,
        averageTicketTarget,
        averageCommissionTarget,
        splitPercentage,
        conversionRate,
        workingWeeks,
        monthlyLivingExpenses
    } = params;

    const avgCommissionPerPunta = averageTicketTarget * (averageCommissionTarget / 100);

    const estimatedPuntas = avgCommissionPerPunta > 0
        ? Math.ceil(annualBillingGoal / avgCommissionPerPunta)
        : 0;

    const requiredPlPbAnnual = estimatedPuntas * conversionRate;
    const weeklyPlPb = workingWeeks > 0 ? requiredPlPbAnnual / workingWeeks : 0;
    const netIncomeGoal = annualBillingGoal * (splitPercentage / 100);
    const annualExpenses = monthlyLivingExpenses * 12;
    const financialViabilityRatio = annualExpenses > 0
        ? netIncomeGoal / annualExpenses
        : 1;

    return {
        estimatedPuntas,
        requiredPlPbAnnual,
        weeklyPlPb,
        netIncomeGoal,
        financialViabilityRatio,
        avgCommissionPerPunta,
    };
};
