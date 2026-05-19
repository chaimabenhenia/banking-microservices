const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '../../db');
const DB_PATH = path.join(DB_DIR, 'comptes.db');

// Crée le dossier db/ s'il n'existe pas (local ou Docker)
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Schéma inline — évite le problème de volume Docker masquant schema.sql
db.exec(`
  CREATE TABLE IF NOT EXISTS comptes (
    id         TEXT PRIMARY KEY,
    titulaire  TEXT NOT NULL,
    solde      REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

module.exports = db;
