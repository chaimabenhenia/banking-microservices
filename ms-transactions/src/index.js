const grpc = require('@grpc/grpc-js');
const { initDatabase } = require('./db/database');
const { createServer } = require('./server');
const { disconnect } = require('./kafka/producer');

async function main() {
  await initDatabase();

  const { server, port } = createServer();

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Erreur démarrage gRPC:', err);
        process.exit(1);
      }
      console.log(`ms-transactions gRPC démarré sur le port ${boundPort}`);
    }
  );
}

main().catch(err => {
  console.error('Erreur fatale au démarrage:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});
