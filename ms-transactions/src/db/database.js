const { createRxDatabase } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

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
    name: 'transactions_db',
    storage: getRxStorageMemory(),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    transactions: { schema: transactionSchema },
  });

  collection = db.transactions;
  console.log('RxDB transactions initialisée (in-memory)');
  return db;
}

function getCollection() {
  if (!collection) throw new Error('Base de données non initialisée');
  return collection;
}

module.exports = { initDatabase, getCollection };
