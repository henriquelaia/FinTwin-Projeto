-- Migração 001 — adicionar salt_edge_customer_id à tabela users
-- Necessário para a integração Open Banking (Salt Edge API v6)
-- Executar apenas se a BD já existia antes deste sprint

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS salt_edge_customer_id VARCHAR(255);
