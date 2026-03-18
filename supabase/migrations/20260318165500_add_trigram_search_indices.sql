-- Habilitar extensión pg_trgm obligatoria para índices de texto parcial (ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear índices GIN individuales para optimizar cada OR en searchPersonsAction
CREATE INDEX IF NOT EXISTS persons_first_name_trgm_idx ON persons USING GIN (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS persons_last_name_trgm_idx ON persons USING GIN (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS persons_email_trgm_idx ON persons USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS persons_phone_trgm_idx ON persons USING GIN (phone gin_trgm_ops);
