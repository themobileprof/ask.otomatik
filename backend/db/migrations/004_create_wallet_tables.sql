-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
  description TEXT NOT NULL,
  performed_by INTEGER NOT NULL, -- user_id of who performed the transaction (user or admin)
  created_at TEXT NOT NULL,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_performed_by ON wallet_transactions(performed_by); 