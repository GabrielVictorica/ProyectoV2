-- ==========================================
-- MIGRACIÓN FASE 5 (v3 - ULTRA RESILIENTE)
-- ==========================================

DO $$ 
BEGIN
    -- CASO 1: Tenemos la tabla original "clients" y NO existe "person_searches"
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_type = 'BASE TABLE') 
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'person_searches') THEN
        ALTER TABLE clients RENAME TO person_searches;
        RAISE NOTICE 'Tabla clients renombrada a person_searches';
    END IF;

    -- CASO 2: Ya existe "person_searches" pero por algún motivo "clients" sigue estando ahí como TABLA
    -- (Esto puede pasar si el rename falló a mitad de camino o se re-creó una tabla vacía)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_type = 'BASE TABLE') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'person_searches') THEN
        -- Insertamos de clients a searches por si quedó algo colgado
        INSERT INTO person_searches SELECT * FROM clients ON CONFLICT DO NOTHING;
        DROP TABLE clients;
        RAISE NOTICE 'Tabla obsoleta clients eliminada tras fusionar datos';
    END IF;

    -- AHORA TRABAJAMOS SOBRE "person_searches" (que ya está garantizada en este punto)
    
    -- Insertar personas que no existan
    INSERT INTO persons (
        organization_id, agent_id, first_name, last_name, email, phone, tags, 
        relationship_status, created_at, updated_at
    )
    SELECT 
        organization_id, agent_id, first_name, last_name, email, phone, tags, 
        'cliente activo', created_at, updated_at
    FROM person_searches
    WHERE person_id IS NULL;

    -- Vincular IDs
    UPDATE person_searches ps
    SET person_id = p.id
    FROM persons p
    WHERE ps.person_id IS NULL
      AND ps.organization_id = p.organization_id
      AND (
        (ps.email IS NOT NULL AND ps.email = p.email) OR 
        (ps.phone IS NOT NULL AND ps.phone = p.phone) OR
        (ps.first_name = p.first_name AND ps.last_name = p.last_name)
      );

    -- Ajustar nombres de columnas si aún tienen el nombre viejo
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'person_searches' AND column_name = 'search_property_types') THEN
        ALTER TABLE person_searches RENAME COLUMN search_property_types TO property_types;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'person_searches' AND column_name = 'search_bedrooms') THEN
        ALTER TABLE person_searches RENAME COLUMN search_bedrooms TO bedrooms;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'person_searches' AND column_name = 'search_payment_methods') THEN
        ALTER TABLE person_searches RENAME COLUMN search_payment_methods TO payment_methods;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'person_searches' AND column_name = 'type') THEN
        ALTER TABLE person_searches RENAME COLUMN type TO search_type;
    END IF;

END $$;

-- 5. Crear la VISTA de COMPATIBILIDAD (Asegurándonos de borrar cualquier tabla o vista vieja con ese nombre)
DROP VIEW IF EXISTS clients Cascade; 
-- El cascade es por si hubiera alguna dependencia rara, pero generalmente no hace falta.

CREATE OR REPLACE VIEW clients AS
SELECT 
    ps.id,
    ps.organization_id,
    ps.agent_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    ps.search_type as type,
    ps.status,
    ps.source,
    ps.motivation,
    ps.budget_min,
    ps.budget_max,
    ps.currency,
    ps.preferred_zones,
    p.tags,
    ps.property_types as search_property_types,
    ps.bedrooms as search_bedrooms,
    ps.payment_methods as search_payment_methods,
    ps.person_id,
    p.last_interaction_at,
    ps.created_at,
    ps.updated_at
FROM person_searches ps
JOIN persons p ON ps.person_id = p.id;
