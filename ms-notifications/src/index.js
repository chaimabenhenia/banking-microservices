const grpc = require('@grpc/grpc-js');
const { createServer } = require('./server');
const { startConsumer, stopConsumer } = require('./kafka/consumer');

const { server, port } = createServer();

server.bindAsync(
  `0.0.0.0:${port}`,
  grpc.ServerCredentials.createInsecure(),
  async (err, boundPort) => {
    if (err) {
      console.error('Erreur démarrage gRPC:', err);
      process.exit(1);
    }
    console.log(`ms-notifications gRPC démarré sur le port ${boundPort}`);
    await startConsumer();
  }
);

process.on('SIGINT', async () => {
  await stopConsumer();
  server.forceShutdown();
  process.exit(0);
});
