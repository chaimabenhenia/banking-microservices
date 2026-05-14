const { creerTopics } = require('./topics');

creerTopics()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));