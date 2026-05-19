const { createRxDatabase } = require('rxdb');
const { getRxStorageLoki } = require('rxdb/plugins/storage-lokijs');
const LokiFsAdapter = require('lokijs/src/loki-fs-sync-adapter');
const path = require('path');
const fs = require('fs');

const DB_DIR  = path.join(__dirname, '../../db');
const DB_NAME = path.join(DB_DIR, 'transactions');

// Crée le dossier db/ si absent
fs.mkdirSync(DB_DIR, { recursive: true });

const transactionSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id:                  { type: 'string', maxLength: 36 },
    type:                { type: 'string' },
    montant:             { type: 'number' },
    compte_source:       { type: 'string' },
    compte_destination:  { type: 'string' },
    description:         { type: 'string' },
    date:                { type: 'string' },
    succes:              { type: 'boolean' },
    message_erreur:      { type: 'string' },
  },
  required: ['id', 'type', 'montant', 'date', 'succes'],
};

let collection = null;

async function initDatabase() {
  const db = await createRxDatabase({
    name: DB_NAME,
    storage: getRxStorageLoki({
      adapter: new LokiFsAdapter(),
      autosave: true,
      autosaveInterval: 500,   // sauvegarde sur disque toutes les 500ms
    }),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    transactions: { schema: transactionSchema },
  });

  collection = db.transactions;
  console.log('RxDB transactions initialisée → db/transactions.db (LokiJS persistent)');
  return db;
}

function getCollection() {
  if (!collection) throw new Error('Base de données non initialisée');
  return collection;
}

module.exports = { initDatabase, getCollection };
