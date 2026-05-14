const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const service = require('./services/notifications.service');

const PROTO_PATH = path.join(__dirname, '../proto/notifications.proto');
const PORT = process.env.GRPC_PORT_NOTIFICATIONS || 50053;

function createServer() {
  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const { notifications } = grpc.loadPackageDefinition(packageDef);

  const server = new grpc.Server();

  server.addService(notifications.NotificationService.service, {
    ObtenirNotifications: service.obtenirNotifications,
    MarquerCommeLue: service.marquerCommeLue,
    CompterNonLues: service.compterNonLues,
  });

  return { server, port: PORT };
}

module.exports = { createServer };
