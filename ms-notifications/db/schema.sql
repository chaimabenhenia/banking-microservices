CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  compte_id  TEXT NOT NULL,
  type       TEXT NOT NULL,
  titre      TEXT NOT NULL,
  message    TEXT NOT NULL,
  lue        INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_compte_id ON notifications(compte_id);
CREATE INDEX IF NOT EXISTS idx_notif_non_lues  ON notifications(compte_id, lue);
