-- Add reservation lifecycle columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS closing_date date;

-- Update view_financial_metrics to use closing_date if available
DROP VIEW IF EXISTS public.view_financial_metrics CASCADE;

CREATE VIEW public.view_financial_metrics AS
SELECT
    t.organization_id,
    t.agent_id,
    EXTRACT(year FROM COALESCE(t.closing_date, t.transaction_date)) AS year,
    EXTRACT(month FROM COALESCE(t.closing_date, t.transaction_date)) AS month,
    t.status,
    COALESCE(SUM(t.actual_price), 0::numeric) AS total_sales_volume,
    COALESCE(SUM(t.gross_commission), 0::numeric) AS total_gross_commission,
    COALESCE(SUM(t.net_commission), 0::numeric) AS total_net_income,
    COALESCE(SUM(t.master_commission_amount), 0::numeric) AS total_master_income,
    COALESCE(SUM(t.office_commission_amount), 0::numeric) AS total_office_income,
    COUNT(t.id) AS closed_deals_count,
    CASE
        WHEN COUNT(t.id) > 0 THEN COALESCE(SUM(t.actual_price), 0::numeric) / COUNT(t.id)::numeric
        ELSE 0::numeric
    END AS average_ticket,
    COUNT(t.id) FILTER (WHERE t.sides = 2) AS double_sided_count,
    COUNT(t.id) FILTER (WHERE t.sides = 1) AS single_sided_count
FROM public.transactions t
GROUP BY
    t.organization_id,
    t.agent_id,
    (EXTRACT(year FROM COALESCE(t.closing_date, t.transaction_date))),
    (EXTRACT(month FROM COALESCE(t.closing_date, t.transaction_date))),
    t.status;

-- Re-grant permissions
GRANT SELECT ON public.view_financial_metrics TO authenticated;
GRANT SELECT ON public.view_financial_metrics TO anon;
GRANT SELECT ON public.view_financial_metrics TO service_role;
