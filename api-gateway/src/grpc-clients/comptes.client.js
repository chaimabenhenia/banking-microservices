const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

const PROTO_PATH = path.join(__dirname, '../../../ms-comptes/proto/comptes.proto');
const HOST = `${process.env.COMPTES_HOST || 'localhost'}:${process.env.GRPC_PORT_COMPTES || 50051}`;

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});

const stub = new (grpc.loadPackageDefinition(packageDef).comptes.ComptesService)(
  HOST,
  grpc.credentials.createInsecure()
);

module.exports = {
  creerCompte:      promisify(stub.CreerCompte.bind(stub)),
  obtenirCompte:    promisify(stub.ObtenirCompte.bind(stub)),
  listerComptes:    promisify(stub.ListerComptes.bind(stub)),
  mettreAJourSolde: promisify(stub.MettreAJourSolde.bind(stub)),
  supprimerCompte:  promisify(stub.SupprimerCompte.bind(stub)),
};
