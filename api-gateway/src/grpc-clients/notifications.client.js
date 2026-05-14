const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { promisify } = require('util');

const PROTO_PATH = path.join(__dirname, '../../../ms-notifications/proto/notifications.proto');
const HOST = `${process.env.NOTIFICATIONS_HOST || 'localhost'}:${process.env.GRPC_PORT_NOTIFICATIONS || 50053}`;

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});

const stub = new (grpc.loadPackageDefinition(packageDef).notifications.NotificationService)(
  HOST,
  grpc.credentials.createInsecure()
);

module.exports = {
  obtenirNotifications: promisify(stub.ObtenirNotifications.bind(stub)),
  marquerCommeLue:      promisify(stub.MarquerCommeLue.bind(stub)),
  compterNonLues:       promisify(stub.CompterNonLues.bind(stub)),
};
