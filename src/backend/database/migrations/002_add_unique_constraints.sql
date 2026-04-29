-- Migração 002 — constraints UNIQUE para ON CONFLICT funcionar
-- Necessário para upserts em bank_accounts e transactions via Salt Edge

ALTER TABLE bank_accounts
  ADD CONSTRAINT IF NOT EXISTS bank_accounts_salt_edge_account_id_unique
  UNIQUE (salt_edge_account_id);

ALTER TABLE transactions
  ADD CONSTRAINT IF NOT EXISTS transactions_salt_edge_transaction_id_unique
  UNIQUE (salt_edge_transaction_id);
