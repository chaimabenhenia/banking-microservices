const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'ms-transactions',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let connected = false;

async function connect() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

async function publish(topic, message) {
  await connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}

async function disconnect() {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}

module.exports = { publish, disconnect };
