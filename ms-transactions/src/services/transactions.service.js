const { v4: uuidv4 } = require('uuid');
const { getCollection } = require('../db/database');
const kafka = require('../kafka/producer');
const comptesClient = require('../grpc-clients/comptes.client');

async function deposer(call, callback) {
  const { compte_id, montant, description } = call.request;

  if (!compte_id || !montant || montant <= 0)
    return callback({ code: 3, message: 'compte_id et un montant positif sont requis' });

  try {
    const compte = await comptesClient.obtenirCompte(compte_id);
    await comptesClient.mettreAJourSolde(compte_id, compte.solde + montant);

    const transaction = {
      id: uuidv4(),
      type: 'depot',
      montant,
      compte_source: '',
      compte_destination: compte_id,
      description: description || '',
      date: new Date().toISOString(),
      succes: true,
      message_erreur: '',
    };

    await getCollection().insert(transaction);
    kafka.publish('transaction.depot', transaction).catch(() => {});
    callback(null, transaction);
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

async function retirer(call, callback) {
  const { compte_id, montant, description } = call.request;

  if (!compte_id || !montant || montant <= 0)
    return callback({ code: 3, message: 'compte_id et un montant positif sont requis' });

  try {
    const compte = await comptesClient.obtenirCompte(compte_id);

    if (compte.solde < montant) {
      const transaction = {
        id: uuidv4(),
        type: 'retrait',
        montant,
        compte_source: compte_id,
        compte_destination: '',
        description: description || '',
        date: new Date().toISOString(),
        succes: false,
        message_erreur: 'Solde insuffisant',
      };
      await getCollection().insert(transaction);
      return callback(null, transaction);
    }

    await comptesClient.mettreAJourSolde(compte_id, compte.solde - montant);

    const transaction = {
      id: uuidv4(),
      type: 'retrait',
      montant,
      compte_source: compte_id,
      compte_destination: '',
      description: description || '',
      date: new Date().toISOString(),
      succes: true,
      message_erreur: '',
    };

    await getCollection().insert(transaction);
    kafka.publish('transaction.retrait', transaction).catch(() => {});
    callback(null, transaction);
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

async function virer(call, callback) {
  const { compte_source, compte_destination, montant, description } = call.request;

  if (!compte_source || !compte_destination || !montant || montant <= 0)
    return callback({ code: 3, message: 'compte_source, compte_destination et montant positif sont requis' });

  if (compte_source === compte_destination)
    return callback({ code: 3, message: 'Les comptes source et destination doivent être différents' });

  try {
    const [source, destination] = await Promise.all([
      comptesClient.obtenirCompte(compte_source),
      comptesClient.obtenirCompte(compte_destination),
    ]);

    if (source.solde < montant) {
      const transaction = {
        id: uuidv4(),
        type: 'virement',
        montant,
        compte_source,
        compte_destination,
        description: description || '',
        date: new Date().toISOString(),
        succes: false,
        message_erreur: 'Solde insuffisant sur le compte source',
      };
      await getCollection().insert(transaction);
      return callback(null, transaction);
    }

    await Promise.all([
      comptesClient.mettreAJourSolde(compte_source, source.solde - montant),
      comptesClient.mettreAJourSolde(compte_destination, destination.solde + montant),
    ]);

    const transaction = {
      id: uuidv4(),
      type: 'virement',
      montant,
      compte_source,
      compte_destination,
      description: description || '',
      date: new Date().toISOString(),
      succes: true,
      message_erreur: '',
    };

    await getCollection().insert(transaction);
    kafka.publish('transaction.virement', transaction).catch(() => {});
    callback(null, transaction);
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

async function obtenirHistorique(call, callback) {
  const { compte_id, limite } = call.request;

  if (!compte_id)
    return callback({ code: 3, message: 'compte_id est requis' });

  try {
    const limit = limite && limite > 0 ? limite : 20;

    const docs = await getCollection().find({
      selector: {
        $or: [
          { compte_source: compte_id },
          { compte_destination: compte_id },
        ],
      },
      sort: [{ date: 'desc' }],
      limit,
    }).exec();

    callback(null, { transactions: docs.map(doc => doc.toJSON()) });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

module.exports = { deposer, retirer, virer, obtenirHistorique };
