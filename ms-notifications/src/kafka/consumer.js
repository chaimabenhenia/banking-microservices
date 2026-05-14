const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const kafka = new Kafka({
  clientId: 'ms-notifications',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'ms-notifications-group' });

const TOPICS = [
  'compte.cree',
  'compte.solde_mis_a_jour',
  'compte.supprime',
  'transaction.effectuee',
];

const insertNotif = db.prepare(
  'INSERT INTO notifications (id, compte_id, type, titre, message, lue, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
);

function buildNotification(topic, data) {
  const id = uuidv4();
  const created_at = new Date().toISOString();

  switch (topic) {
    case 'compte.cree':
      return {
        id, created_at,
        compte_id: data.id,
        type: 'CREATION',
        titre: 'Compte créé',
        message: `Bienvenue ${data.titulaire} ! Votre compte a été ouvert avec un solde initial de ${data.solde} €.`,
      };

    case 'compte.solde_mis_a_jour':
      return {
        id, created_at,
        compte_id: data.id,
        type: 'MISE_A_JOUR_SOLDE',
        titre: 'Solde mis à jour',
        message: `Votre nouveau solde est de ${data.solde} €.`,
      };

    case 'compte.supprime':
      return {
        id, created_at,
        compte_id: data.id,
        type: 'SUPPRESSION',
        titre: 'Compte supprimé',
        message: `Votre compte a été clôturé avec succès.`,
      };

    case 'transaction.effectuee':
      return {
        id, created_at,
        compte_id: data.compte_id,
        type: 'TRANSACTION',
        titre: 'Transaction effectuée',
        message: `Une transaction de type "${data.type}" d'un montant de ${data.montant} € a été enregistrée.`,
      };

    default:
      return null;
  }
}

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: TOPICS, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        const notif = buildNotification(topic, data);
        if (notif) {
          insertNotif.run(notif.id, notif.compte_id, notif.type, notif.titre, notif.message, notif.created_at);
        }
      } catch (err) {
        console.error(`[Kafka] Erreur traitement [${topic}]:`, err.message);
      }
    },
  });

  console.log('Kafka consumer démarré — topics :', TOPICS.join(', '));
}

async function stopConsumer() {
  await consumer.disconnect();
}

module.exports = { startConsumer, stopConsumer };
