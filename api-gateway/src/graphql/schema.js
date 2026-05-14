const typeDefs = `
  type Compte {
    id: ID!
    titulaire: String!
    solde: Float!
    created_at: String!
    success: Boolean
    message: String
  }

  type Transaction {
    id: ID!
    type: String!
    montant: Float!
    compte_source: String
    compte_destination: String
    description: String
    date: String!
    succes: Boolean!
    message_erreur: String
  }

  type Notification {
    id: ID!
    compte_id: String!
    type: String!
    titre: String!
    message: String!
    lue: Boolean!
    created_at: String!
  }

  type SupprimerResult {
    success: Boolean!
    message: String!
  }

  type CompterResult {
    nombre: Int!
  }

  type Query {
    compte(id: ID!): Compte
    comptes: [Compte!]!
    historique(compte_id: ID!, limite: Int): [Transaction!]!
    notifications(compte_id: ID!): [Notification!]!
    nonLues(compte_id: ID!): CompterResult!
  }

  type Mutation {
    creerCompte(titulaire: String!, solde_initial: Float): Compte
    mettreAJourSolde(id: ID!, solde: Float!): Compte
    supprimerCompte(id: ID!): SupprimerResult

    deposer(compte_id: ID!, montant: Float!, description: String): Transaction
    retirer(compte_id: ID!, montant: Float!, description: String): Transaction
    virer(compte_source: ID!, compte_destination: ID!, montant: Float!, description: String): Transaction

    marquerNotificationLue(notif_id: ID!): Notification
  }
`;

module.exports = { typeDefs };
