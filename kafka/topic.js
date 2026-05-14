const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'banking-admin',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const admin = kafka.admin();

const TOPICS = [
  {
    topic: 'transaction.created',
    numPartitions: 1,
    replicationFactor: 1
  },
  {
    topic: 'account.updated',
    numPartitions: 1,
    replicationFactor: 1
  }
];

async function creerTopics() {
  await admin.connect();

  const topicsExistants = await admin.listTopics();

  const topicsACreer = TOPICS.filter(
    t => !topicsExistants.includes(t.topic)
  );

  if (topicsACreer.length === 0) {
    await admin.disconnect();
    return;
  }

  await admin.createTopics({ topics: topicsACreer });
  await admin.disconnect();
}

module.exports = { creerTopics };