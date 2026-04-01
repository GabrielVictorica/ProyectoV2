-- Add total_sales_volume to view_agent_progress
-- Ticket Promedio = total_sales_volume / actual_puntas_count

CREATE OR REPLACE VIEW view_agent_progress AS
WITH agent_stats AS (
    SELECT transactions.agent_id,
        EXTRACT(year FROM transactions.transaction_date)::integer AS year,
        -- FINANCIAL metrics: exclude cancelled transactions
        sum(transactions.gross_commission) FILTER (WHERE transactions.status <> 'cancelled') AS actual_gross_income,
        count(*) FILTER (WHERE transactions.status <> 'cancelled') AS actual_puntas_count,
        sum(transactions.gross_commission) FILTER (WHERE transactions.status = 'completed'::text) AS completed_gross_income,
        sum(transactions.gross_commission) FILTER (WHERE transactions.status = 'pending'::text) AS reserved_gross_income,
        count(*) FILTER (WHERE transactions.status = 'completed'::text) AS completed_puntas_count,
        count(*) FILTER (WHERE transactions.status = 'pending'::text) AS reserved_puntas_count,
        -- Sales volume (sum of property prices, not commissions)
        sum(transactions.actual_price) FILTER (WHERE transactions.status <> 'cancelled') AS total_sales_volume
    FROM transactions
    GROUP BY transactions.agent_id, (EXTRACT(year FROM transactions.transaction_date))
), activity_stats AS (
    SELECT activities.agent_id,
        (
            count(*) FILTER (
                WHERE activities.type <> 'referido'::text
                AND activities.date >= date_trunc('week'::text, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date::timestamp with time zone)
            )
            + count(*) FILTER (
                WHERE activities.type = 'visita'::text
                AND (activities.visit_metadata->>'punta') = 'ambas'
                AND activities.date >= date_trunc('week'::text, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date::timestamp with time zone)
            )
        )::integer AS weekly_green_activities,
        count(*) FILTER (
            WHERE (activities.type = ANY (ARRAY['pre_listing'::text, 'pre_buying'::text]))
            AND activities.date >= date_trunc('week'::text, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date::timestamp with time zone)
        )::integer AS weekly_critical
    FROM activities
    GROUP BY activities.agent_id
), transaction_stats_weekly AS (
    -- ACTIVITY metric: counts ALL transactions this week (including cancelled)
    -- because the meeting/activity happened regardless of outcome
    SELECT transactions.agent_id,
        count(*)::integer AS weekly_reservas
    FROM transactions
    WHERE transactions.transaction_date >= date_trunc('week'::text, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date::timestamp with time zone)
    GROUP BY transactions.agent_id
), cierre_stats_weekly AS (
    SELECT transactions.agent_id,
        count(*)::integer AS weekly_cierres
    FROM transactions
    WHERE transactions.status = 'completed'
      AND transactions.closing_date IS NOT NULL
      AND transactions.closing_date >= date_trunc('week'::text, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date::timestamp with time zone)
    GROUP BY transactions.agent_id
)
SELECT obj.id AS objective_id,
    obj.agent_id,
    obj.year,
    obj.annual_billing_goal,
    obj.monthly_living_expenses,
    obj.average_ticket_target,
    obj.average_commission_target,
    obj.split_percentage,
    obj.conversion_rate,
    obj.working_weeks,
    obj.currency,
    obj.listings_goal_annual,
    obj.pl_to_listing_conversion_target,
    obj.listings_goal_start_date,
    obj.listings_goal_end_date,
    obj.sales_effectiveness_ratio,
    COALESCE(stats.actual_gross_income, 0::numeric) AS actual_gross_income,
    COALESCE(stats.actual_puntas_count, 0::bigint) AS actual_puntas_count,
    COALESCE(stats.completed_gross_income, 0::numeric) AS completed_gross_income,
    COALESCE(stats.reserved_gross_income, 0::numeric) AS reserved_gross_income,
    COALESCE(stats.completed_puntas_count, 0::bigint) AS completed_puntas_count,
    COALESCE(stats.reserved_puntas_count, 0::bigint) AS reserved_puntas_count,
    COALESCE(stats.total_sales_volume, 0::numeric) AS total_sales_volume,
    CASE
        WHEN obj.annual_billing_goal > 0::numeric THEN COALESCE(stats.actual_gross_income, 0::numeric) / obj.annual_billing_goal * 100::numeric
        ELSE 0::numeric
    END AS progress_percentage,
    GREATEST(0::numeric, obj.annual_billing_goal - COALESCE(stats.actual_gross_income, 0::numeric)) AS gap_to_goal,
    ceil(GREATEST(0::numeric, obj.annual_billing_goal - COALESCE(stats.actual_gross_income, 0::numeric)) / NULLIF(obj.average_ticket_target * (obj.average_commission_target / 100::numeric), 0::numeric)) AS estimated_puntas_needed,
    obj.annual_billing_goal * (obj.split_percentage / 100::numeric) AS net_income_goal,
    ceil(obj.annual_billing_goal / NULLIF(obj.average_ticket_target * (obj.average_commission_target / 100::numeric), 0::numeric) * obj.conversion_rate) AS required_pl_pb_annual,
    obj.annual_billing_goal / NULLIF(obj.average_ticket_target * (obj.average_commission_target / 100::numeric), 0::numeric) * obj.conversion_rate / NULLIF(obj.working_weeks, 0)::numeric AS weekly_pl_pb_target,
    ceil(obj.listings_goal_annual::numeric / NULLIF(obj.pl_to_listing_conversion_target / 100.0, 0::numeric)) AS required_prelistings_annual,
    ceil(obj.listings_goal_annual::numeric / NULLIF(obj.pl_to_listing_conversion_target / 100.0, 0::numeric)) / 12.0 AS required_prelistings_monthly,
    CASE
        WHEN obj.listings_goal_start_date IS NOT NULL AND obj.listings_goal_end_date IS NOT NULL THEN ceil(obj.listings_goal_annual::numeric / NULLIF(obj.pl_to_listing_conversion_target / 100.0, 0::numeric)) / GREATEST(1::numeric, (obj.listings_goal_end_date - obj.listings_goal_start_date)::numeric / 7.0)
        ELSE ceil(obj.listings_goal_annual::numeric / NULLIF(obj.pl_to_listing_conversion_target / 100.0, 0::numeric)) / NULLIF(obj.working_weeks, 0)::numeric
    END AS required_prelistings_weekly,
    CASE
        WHEN (obj.monthly_living_expenses * 12::numeric) > 0::numeric THEN obj.annual_billing_goal * (obj.split_percentage / 100::numeric) / (obj.monthly_living_expenses * 12::numeric)
        ELSE 1.0
    END AS financial_viability_ratio,
    CASE
        WHEN EXTRACT(doy FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date) > 0::numeric THEN COALESCE(stats.actual_gross_income, 0::numeric) / EXTRACT(doy FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)::date) * 365.0
        ELSE 0::numeric
    END AS run_rate_projection,
    COALESCE(act_stats.weekly_green_activities, 0) + COALESCE(ts_weekly.weekly_reservas, 0) + COALESCE(cierre_stats.weekly_cierres, 0) AS weekly_green_meetings_count,
    COALESCE(act_stats.weekly_critical, 0) AS weekly_critical_activities_count,
    ( SELECT count(*)::integer AS count
           FROM activities a
          WHERE a.agent_id = obj.agent_id AND a.type = 'captacion'::text AND (obj.listings_goal_start_date IS NOT NULL AND obj.listings_goal_end_date IS NOT NULL AND a.date >= obj.listings_goal_start_date AND a.date <= obj.listings_goal_end_date OR obj.listings_goal_start_date IS NULL AND EXTRACT(year FROM a.date)::integer = obj.year)) AS actual_active_listings_count,
    ceil(ceil(obj.annual_billing_goal / NULLIF(obj.average_ticket_target * (obj.average_commission_target / 100::numeric), 0::numeric)) * obj.sales_effectiveness_ratio) AS minimum_listings_required
FROM agent_objectives obj
    LEFT JOIN agent_stats stats ON obj.agent_id = stats.agent_id AND obj.year::numeric = stats.year::numeric
    LEFT JOIN activity_stats act_stats ON obj.agent_id = act_stats.agent_id
    LEFT JOIN transaction_stats_weekly ts_weekly ON obj.agent_id = ts_weekly.agent_id
    LEFT JOIN cierre_stats_weekly cierre_stats ON obj.agent_id = cierre_stats.agent_id;
