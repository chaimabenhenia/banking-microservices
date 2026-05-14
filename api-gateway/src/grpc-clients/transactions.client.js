const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

const PROTO_PATH = path.join(__dirname, '../../../ms-transactions/proto/transactions.proto');
const HOST = `${process.env.TRANSACTIONS_HOST || 'localhost'}:${process.env.GRPC_PORT_TRANSACTIONS || 50052}`;

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});

const stub = new (grpc.loadPackageDefinition(packageDef).transactions.TransactionService)(
  HOST,
  grpc.credentials.createInsecure()
);

module.exports = {
  deposer:           promisify(stub.Deposer.bind(stub)),
  retirer:           promisify(stub.Retirer.bind(stub)),
  virer:             promisify(stub.Virer.bind(stub)),
  obtenirHistorique: promisify(stub.ObtenirHistorique.bind(stub)),
};
