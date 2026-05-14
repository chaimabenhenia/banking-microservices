CREATE TABLE IF NOT EXISTS comptes (
  id         TEXT PRIMARY KEY,
  titulaire  TEXT NOT NULL,
  solde      REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
