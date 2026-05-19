const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '../../db');
const DB_PATH = path.join(DB_DIR, 'notifications.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    compte_id  TEXT NOT NULL,
    type       TEXT NOT NULL,
    titre      TEXT NOT NULL,
    message    TEXT NOT NULL,
    lue        INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

module.exports = db;
