-- ==========================================
-- MIGRACIÓN FASE 5: UNIFICACIÓN CRM
-- ==========================================

BEGIN;

-- 1. Crear Personas para los Clientes que no tengan person_id
INSERT INTO persons (
    organization_id,
    agent_id,
    first_name,
    last_name,
    email,
    phone,
    tags,
    relationship_status,
    created_at,
    updated_at
)
SELECT 
    organization_id,
    agent_id,
    first_name,
    last_name,
    email,
    phone,
    tags,
    'cliente activo', -- Status por defecto para migración
    created_at,
    updated_at
FROM clients
WHERE person_id IS NULL;

-- 2. Vincular los Clientes con las Personas recién creadas (basado en email/phone o nombre)
-- Nota: Esta parte asume una relación 1:1 para la migración inicial simplificada.
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

-- 3. Renombrar tabla clients a person_searches
-- (Esto mantiene los IDs, RLS y relaciones existentes)
ALTER TABLE clients RENAME TO person_searches;

-- 4. Ajustar nombres de columnas en person_searches para mayor claridad
ALTER TABLE person_searches RENAME COLUMN search_property_types TO property_types;
ALTER TABLE person_searches RENAME COLUMN search_bedrooms TO bedrooms;
ALTER TABLE person_searches RENAME COLUMN search_payment_methods TO payment_methods;
ALTER TABLE person_searches RENAME COLUMN type TO search_type;

-- 5. Crear la VISTA de COMPATIBILIDAD "clients"
-- Esto permite que el código actual siga funcionando sin cambios masivos
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
    ps.currency, -- Asumiendo que existe o se agregó
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

-- 6. Eliminar columnas redundantes de person_searches (Solo después de verificar la vista)
-- Comentado por seguridad para ejecución inicial manual
-- ALTER TABLE person_searches DROP COLUMN first_name;
-- ALTER TABLE person_searches DROP COLUMN last_name;
-- ALTER TABLE person_searches DROP COLUMN email;
-- ALTER TABLE person_searches DROP COLUMN phone;
-- ALTER TABLE person_searches DROP COLUMN tags;

COMMIT;
