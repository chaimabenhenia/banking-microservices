const db = require('../db/database');

function obtenirNotifications(call, callback) {
  const { compte_id } = call.request;

  try {
    const rows = db
      .prepare('SELECT * FROM notifications WHERE compte_id = ? ORDER BY created_at DESC')
      .all(compte_id);

    callback(null, {
      notifications: rows.map(r => ({ ...r, lue: r.lue === 1 })),
    });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

function marquerCommeLue(call, callback) {
  const { notif_id } = call.request;

  try {
    const result = db
      .prepare('UPDATE notifications SET lue = 1 WHERE id = ?')
      .run(notif_id);

    if (result.changes === 0) {
      return callback({ code: 5, message: `Notification ${notif_id} introuvable` });
    }

    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notif_id);
    callback(null, { ...notif, lue: true });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

function compterNonLues(call, callback) {
  const { compte_id } = call.request;

  try {
    const row = db
      .prepare('SELECT COUNT(*) as nombre FROM notifications WHERE compte_id = ? AND lue = 0')
      .get(compte_id);

    callback(null, { nombre: row.nombre });
  } catch (err) {
    callback({ code: 13, message: err.message });
  }
}

module.exports = { obtenirNotifications, marquerCommeLue, compterNonLues };
