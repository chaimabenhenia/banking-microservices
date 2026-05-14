const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const service = require('./services/transactions.service');

const PROTO_PATH = path.join(__dirname, '../proto/transactions.proto');
const PORT = process.env.GRPC_PORT_TRANSACTIONS || 50052;

function createServer() {
  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const { transactions } = grpc.loadPackageDefinition(packageDef);

  const server = new grpc.Server();

  server.addService(transactions.TransactionService.service, {
    Deposer:           service.deposer,
    Retirer:           service.retirer,
    Virer:             service.virer,
    ObtenirHistorique: service.obtenirHistorique,
  });

  return { server, port: PORT };
}

module.exports = { createServer };
