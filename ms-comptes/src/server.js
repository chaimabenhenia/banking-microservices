const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const service = require('./services/comptes.service');

const PROTO_PATH = path.join(__dirname, '../proto/comptes.proto');
const PORT = process.env.GRPC_PORT_COMPTES || 50051;

function createServer() {
  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const { comptes } = grpc.loadPackageDefinition(packageDef);

  const server = new grpc.Server();

  server.addService(comptes.ComptesService.service, {
    CreerCompte: service.creerCompte,
    ObtenirCompte: service.obtenirCompte,
    ListerComptes: service.listerComptes,
    MettreAJourSolde: service.mettreAJourSolde,
    SupprimerCompte: service.supprimerCompte,
  });

  return { server, port: PORT };
}

module.exports = { createServer };
