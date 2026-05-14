const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const { typeDefs, resolvers } = require('./graphql');
const comptesRoutes       = require('./rest/comptes.routes');
const transactionsRoutes  = require('./rest/transactions.routes');
const notificationsRoutes = require('./rest/notifications.routes');

const PORT = process.env.GATEWAY_PORT || 3000;

async function bootstrap() {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  // REST
  app.use('/api/comptes',       comptesRoutes);
  app.use('/api/transactions',  transactionsRoutes);
  app.use('/api/notifications', notificationsRoutes);

  // GraphQL
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo));

  app.listen(PORT, () => {
    console.log(`API Gateway démarré sur http://localhost:${PORT}`);
    console.log(`GraphQL Playground : http://localhost:${PORT}/graphql`);
  });
}

bootstrap().catch(err => {
  console.error('Erreur démarrage:', err);
  process.exit(1);
});
