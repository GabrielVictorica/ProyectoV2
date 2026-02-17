-- ==========================================
-- MIGRACIÓN FASE 5 (REINTENTO / RESILIENTE)
-- ==========================================

DO $$ 
BEGIN
    -- 1. Si la tabla "clients" aún existe, migrar datos a "persons"
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_type = 'BASE TABLE') THEN
        INSERT INTO persons (
            organization_id, agent_id, first_name, last_name, email, phone, tags, 
            relationship_status, created_at, updated_at
        )
        SELECT 
            organization_id, agent_id, first_name, last_name, email, phone, tags, 
            'cliente activo', created_at, updated_at
        FROM clients
        WHERE person_id IS NULL;

        UPDATE clients c
        SET person_id = p.id
        FROM persons p
        WHERE c.person_id IS NULL
          AND c.organization_id = p.organization_id
          AND (
            (c.email IS NOT NULL AND c.email = p.email) OR 
            (c.phone IS NOT NULL AND c.phone = p.phone) OR
            (c.first_name = p.first_name AND c.last_name = p.last_name)
          );
          
        -- Renombrar a person_searches
        ALTER TABLE clients RENAME TO person_searches;
    END IF;

    -- 2. Si ya se renombró pero no tiene person_id vinculados (por fallo previo)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'person_searches') THEN
        -- Intentar insertar personas desde person_searches si faltan
        INSERT INTO persons (
            organization_id, agent_id, first_name, last_name, email, phone, tags, 
            relationship_status, created_at, updated_at
        )
        SELECT 
            organization_id, agent_id, first_name, last_name, email, phone, tags, 
            'cliente activo', created_at, updated_at
        FROM person_searches
        WHERE person_id IS NULL;

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
    END IF;

    -- 3. Ajustar nombres de columnas si aún no se hizo
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

-- 4. Crear o Reemplazar la VISTA (Fuera del bloque DO ya que CREATE VIEW no puede estar dentro)
DROP VIEW IF EXISTS clients;
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
