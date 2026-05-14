const grpc = require('@grpc/grpc-js');
const { createServer } = require('./server');
const { disconnect } = require('./kafka/producer');

const { server, port } = createServer();

server.bindAsync(
  `0.0.0.0:${port}`,
  grpc.ServerCredentials.createInsecure(),
  (err, boundPort) => {
    if (err) {
      console.error('Erreur démarrage gRPC:', err);
      process.exit(1);
    }
    console.log(`ms-comptes gRPC démarré sur le port ${boundPort}`);
  }
);

process.on('SIGINT', async () => {
  await disconnect();
  server.forceShutdown();
  process.exit(0);
});
