-- Optimización de Índices Funcionales para el Dashboard de Operaciones
-- Creado: 2026-03-15
-- Objetivo: Eliminar la latencia en los filtros por año y mes en la vista view_financial_metrics.

-- Estos índices permiten que Postgres use el índice directamente para las expresiones COALESCE y EXTRACT
-- utilizadas en los GROUP BY y WHERE de las métricas.

CREATE INDEX IF NOT EXISTS idx_transactions_year_func ON public.transactions 
((EXTRACT(year FROM COALESCE(closing_date, transaction_date))));

CREATE INDEX IF NOT EXISTS idx_transactions_month_func ON public.transactions 
((EXTRACT(month FROM COALESCE(closing_date, transaction_date))));

-- Nota: Usamos doble paréntesis ((expression)) porque es la sintaxis requerida para índices sobre expresiones.
