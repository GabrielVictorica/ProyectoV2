-- Migración: Integración de Reservas en Cierres

-- 1. Agregar la columna status a la tabla transactions
ALTER TABLE public.transactions
ADD COLUMN status text DEFAULT 'completed'::text;

-- 2. Asegurar que las transacciones y reservas existentes y futuras solo acepten estos estados
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'completed', 'cancelled'));

-- 3. Actualizar la vista materializada o vista normal "view_financial_metrics"
DROP VIEW IF EXISTS public.view_financial_metrics CASCADE;

CREATE VIEW public.view_financial_metrics AS
SELECT
    t.organization_id,
    t.agent_id,
    EXTRACT(year FROM t.transaction_date) AS year,
    EXTRACT(month FROM t.transaction_date) AS month,
    t.status,  -- NUEVA COLUMNA STATUS
    COALESCE(SUM(t.sales_volume), 0::numeric) AS total_sales_volume,
    COALESCE(SUM(t.gross_commission), 0::numeric) AS total_gross_commission,
    COALESCE(SUM(t.net_income), 0::numeric) AS total_net_income,
    COALESCE(SUM(t.master_income), 0::numeric) AS total_master_income,
    COALESCE(SUM(t.office_income), 0::numeric) AS total_office_income,
    COUNT(t.id) AS closed_deals_count,
    CASE
        WHEN COUNT(t.id) > 0 THEN COALESCE(SUM(t.sales_volume), 0::numeric) / COUNT(t.id)::numeric
        ELSE 0::numeric
    END AS average_ticket,
    COUNT(t.id) FILTER (WHERE t.sides = 2) AS double_sided_count,
    COUNT(t.id) FILTER (WHERE t.sides = 1) AS single_sided_count
FROM public.transactions t
GROUP BY
    t.organization_id,
    t.agent_id,
    (EXTRACT(year FROM t.transaction_date)),
    (EXTRACT(month FROM t.transaction_date)),
    t.status; -- AGRUPANDO AHORA TAMBIEN POR STATUS

-- Dar los mismos permisos a los roles estandar de supabase
GRANT SELECT ON public.view_financial_metrics TO authenticated;
GRANT SELECT ON public.view_financial_metrics TO anon;
GRANT SELECT ON public.view_financial_metrics TO service_role;
