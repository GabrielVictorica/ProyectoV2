-- ==========================================
-- MIGRACIÓN FASE 5 (v4 - REPARACIÓN FINAL)
-- ==========================================

DO $$ 
BEGIN
    -- 1. Intentar migrar datos desde "clients" a "persons" si la tabla existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_type = 'BASE TABLE') THEN
        INSERT INTO persons (
            organization_id, agent_id, first_name, last_name, email, phone, tags, relationship_status, created_at, updated_at
        )
        SELECT organization_id, agent_id, first_name, last_name, email, phone, tags, 'cliente activo', created_at, updated_at
        FROM clients
        WHERE person_id IS NULL;

        -- Vincular IDs
        UPDATE clients c SET person_id = p.id FROM persons p
        WHERE c.person_id IS NULL AND c.organization_id = p.organization_id
        AND ((c.email IS NOT NULL AND c.email = p.email) OR (c.phone IS NOT NULL AND c.phone = p.phone) OR (c.first_name = p.first_name AND c.last_name = p.last_name));
    END IF;

    -- 2. Resolver colisión entre "clients" y "person_searches"
    -- Si ambas existen como tablas, person_searches suele ser la incompleta de un rename fallido
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_type = 'BASE TABLE') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'person_searches' AND table_type = 'BASE TABLE') THEN
        DROP TABLE person_searches CASCADE;
    END IF;

    -- Renombrar "clients" a "person_searches" si aún es necesario
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE clients RENAME TO person_searches;
    END IF;

    -- 3. Normalizar columnas en person_searches (Independientemente de cómo llegó aquí)
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

-- 4. Crear la VISTA de COMPATIBILIDAD
-- Primero liberamos el nombre "clients" de cualquier tabla/vista vieja
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Si es una tabla la borramos (ya renombrada arriba o duplicada)
        -- Si es una vista la borramos
        EXECUTE 'DROP ' || (CASE WHEN (SELECT table_type FROM information_schema.tables WHERE table_name = 'clients') = 'VIEW' THEN 'VIEW' ELSE 'TABLE' END) || ' IF EXISTS clients CASCADE';
    END IF;
END $$;

CREATE VIEW clients AS
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
