-- Optimización de Índices para la tabla transactions
-- Creado: 2026-03-15
-- Objetivo: Acelerar filtros por agente, oficina, estado y fechas en el tablero de operaciones.

CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON public.transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_closing_date ON public.transactions(closing_date);

-- Índices para mejorar las uniones con la tabla de personas (clientes)
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_person_id ON public.transactions(buyer_person_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_person_id ON public.transactions(seller_person_id);

-- Notas de optimización:
-- Estos índices mejorarán significativamente el rendimiento de getClosingsDashboardDataAction,
-- especialmente al filtrar grandes volúmenes de datos por oficina o rango de fechas.
