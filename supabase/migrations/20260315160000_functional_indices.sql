-- Índices Funcionales para Optimización de Reportes Financieros
-- Creado: 2026-03-15
-- Objetivo: Acelerar las uniones y agrupaciones por Año y Mes en la tabla transactions.

-- Índice funcional para la fecha de transacción
CREATE INDEX IF NOT EXISTS idx_transactions_date_year ON public.transactions (EXTRACT(year FROM transaction_date));
CREATE INDEX IF NOT EXISTS idx_transactions_date_month ON public.transactions (EXTRACT(month FROM transaction_date));

-- Índice funcional para la fecha de cierre (COALESCE es usado en la vista)
CREATE INDEX IF NOT EXISTS idx_transactions_closing_date_year ON public.transactions (EXTRACT(year FROM COALESCE(closing_date, transaction_date)));
CREATE INDEX IF NOT EXISTS idx_transactions_closing_date_month ON public.transactions (EXTRACT(month FROM COALESCE(closing_date, transaction_date)));

-- Índice compuesto para filtros comunes de oficina + agente
CREATE INDEX IF NOT EXISTS idx_transactions_org_agent_status ON public.transactions(organization_id, agent_id, status);

-- Notas:
-- Estos índices permiten que Postgres use escaneos de índice en lugar de escaneos secuenciales 
-- al ejecutar la vista public.view_financial_metrics.
