const comptes       = require('../grpc-clients/comptes.client');
const transactions  = require('../grpc-clients/transactions.client');
const notifications = require('../grpc-clients/notifications.client');

const resolvers = {
  Query: {
    compte: (_, { id }) =>
      comptes.obtenirCompte({ id }),

    comptes: async () => {
      const { comptes: list } = await comptes.listerComptes({});
      return list;
    },

    historique: async (_, { compte_id, limite = 50 }) => {
      const { transactions: list } = await transactions.obtenirHistorique({ compte_id, limite });
      return list;
    },

    notifications: async (_, { compte_id }) => {
      const { notifications: list } = await notifications.obtenirNotifications({ compte_id });
      return list;
    },

    nonLues: (_, { compte_id }) =>
      notifications.compterNonLues({ compte_id }),
  },

  Mutation: {
    creerCompte: (_, args) =>
      comptes.creerCompte(args),

    mettreAJourSolde: (_, { id, solde }) =>
      comptes.mettreAJourSolde({ id, solde }),

    supprimerCompte: (_, { id }) =>
      comptes.supprimerCompte({ id }),

    deposer: (_, args) =>
      transactions.deposer(args),

    retirer: (_, args) =>
      transactions.retirer(args),

    virer: (_, args) =>
      transactions.virer(args),

    marquerNotificationLue: (_, { notif_id }) =>
      notifications.marquerCommeLue({ notif_id }),
  },
};

module.exports = { resolvers };
