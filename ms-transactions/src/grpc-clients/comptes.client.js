const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '..', '..', '..', 'ms-comptes', 'proto', 'comptes.proto');
const HOST = process.env.GRPC_HOST_COMPTES || 'localhost';
const PORT = process.env.GRPC_PORT_COMPTES || 50051;

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { comptes } = grpc.loadPackageDefinition(packageDef);
const client = new comptes.ComptesService(
  `${HOST}:${PORT}`,
  grpc.credentials.createInsecure()
);

function obtenirCompte(id) {
  return new Promise((resolve, reject) => {
    client.ObtenirCompte({ id }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

function mettreAJourSolde(id, solde) {
  return new Promise((resolve, reject) => {
    client.MettreAJourSolde({ id, solde }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

module.exports = { obtenirCompte, mettreAJourSolde };
