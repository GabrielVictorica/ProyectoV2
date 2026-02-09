-- ============================================================
-- SETUP: Activar Cierre Mensual Automático de Facturación
-- ============================================================
-- Este script activa pg_cron para ejecutar automáticamente
-- la función run_monthly_billing_close() el día 1 de cada mes.
--
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard → SQL Editor
-- 2. Ejecutar este script completo
-- ============================================================

-- 1. Habilitar la extensión pg_cron (si no está activa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Dar permisos a postgres para programar jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. Programar el cierre mensual (día 1 de cada mes a las 00:05)
SELECT cron.schedule(
    'monthly_billing_close',           -- nombre del job
    '5 0 1 * *',                       -- cron: minuto 5, hora 0, día 1, todos los meses
    $$SELECT public.run_monthly_billing_close();$$
);

-- ============================================================
-- VERIFICAR
-- ============================================================
-- Para ver los jobs programados:
-- SELECT * FROM cron.job;
--
-- Para ver el historial de ejecuciones:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- Para eliminar el job (si necesitás):
-- SELECT cron.unschedule('monthly_billing_close');
-- ============================================================

-- ===================================================================
-- FUNCIÓN DE CIERRE MENSUAL
-- ===================================================================
-- Esta función crea un registro de facturación (royalty) para cada
-- organización activa basándose en su royalty_percentage.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.run_monthly_billing_close()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org RECORD;
    processed_count INTEGER := 0;
    current_period TEXT;
    next_month_first DATE;
    next_month_15 DATE;
BEGIN
    -- Calcular período actual (mes actual)
    current_period := TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Primer día del mes siguiente
    next_month_first := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
    -- Día 15 del mes siguiente
    next_month_15 := next_month_first + INTERVAL '14 days';
    
    -- Iterar sobre todas las organizaciones activas con royalty configurado
    FOR org IN 
        SELECT id, name, royalty_percentage
        FROM organizations
        WHERE org_status = 'active'
          AND royalty_percentage IS NOT NULL
          AND royalty_percentage > 0
    LOOP
        -- Verificar si ya existe un cargo para este período
        IF NOT EXISTS (
            SELECT 1 FROM billing_records 
            WHERE organization_id = org.id 
              AND period = current_period
              AND concept LIKE 'Royalty%'
        ) THEN
            -- Crear el cargo de royalty
            INSERT INTO billing_records (
                organization_id,
                concept,
                amount,
                original_amount,
                surcharge_amount,
                status,
                due_date,
                first_due_date,
                second_due_date,
                period,
                notes
            ) VALUES (
                org.id,
                'Royalty Mensual - ' || TO_CHAR(NOW(), 'Month YYYY'),
                0, -- El monto real se calcula según los ingresos del mes
                0,
                0,
                'pending',
                next_month_first,
                next_month_first,
                next_month_15,
                current_period,
                'Cargo automático. Porcentaje: ' || org.royalty_percentage || '%'
            );
            
            processed_count := processed_count + 1;
        END IF;
    END LOOP;
    
    RETURN 'Cierre completado. ' || processed_count || ' organizaciones procesadas.';
END;
$$;
