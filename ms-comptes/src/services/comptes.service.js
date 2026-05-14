const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const kafka = require('../kafka/producer');

function creerCompte(call, callback) {
  const { titulaire, solde_initial } = call.request;

  if (!titulaire) {
    return callback({ code: 3, message: 'Le titulaire est requis' });
  }

  const id = uuidv4();
  const created_at = new Date().toISOString();
  const solde = solde_initial || 0;

  try {
    db.prepare(
      'INSERT INTO comptes (id, titulaire, solde, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, titulaire, solde, created_at);

    kafka.publish('compte.cree', { id, titulaire, solde, created_at }).catch(() => {});

    callback(null, { id, titulaire, solde, created_at, success: true, message: 'Compte créé avec succès' });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

function obtenirCompte(call, callback) {
  const { id } = call.request;

  try {
    const compte = db.prepare('SELECT * FROM comptes WHERE id = ?').get(id);
    if (!compte) {
      return callback({ code: 5, message: `Compte ${id} introuvable` });
    }
    callback(null, { ...compte, success: true, message: '' });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

function listerComptes(call, callback) {
  try {
    const comptes = db.prepare('SELECT * FROM comptes ORDER BY created_at DESC').all();
    callback(null, {
      comptes: comptes.map(c => ({ ...c, success: true, message: '' })),
    });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

function mettreAJourSolde(call, callback) {
  const { id, solde } = call.request;

  try {
    const result = db.prepare('UPDATE comptes SET solde = ? WHERE id = ?').run(solde, id);
    if (result.changes === 0) {
      return callback({ code: 5, message: `Compte ${id} introuvable` });
    }
    const compte = db.prepare('SELECT * FROM comptes WHERE id = ?').get(id);

    kafka.publish('compte.solde_mis_a_jour', { id, solde }).catch(() => {});

    callback(null, { ...compte, success: true, message: 'Solde mis à jour' });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

function supprimerCompte(call, callback) {
  const { id } = call.request;

  try {
    const result = db.prepare('DELETE FROM comptes WHERE id = ?').run(id);
    if (result.changes === 0) {
      return callback(null, { success: false, message: `Compte ${id} introuvable` });
    }

    kafka.publish('compte.supprime', { id }).catch(() => {});

    callback(null, { success: true, message: 'Compte supprimé avec succès' });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

module.exports = { creerCompte, obtenirCompte, listerComptes, mettreAJourSolde, supprimerCompte };
