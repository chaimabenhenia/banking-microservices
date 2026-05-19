FROM node:18-alpine

WORKDIR /app

# Copier les proto des 3 microservices (référencés par les grpc-clients)
COPY ms-comptes/proto/       /ms-comptes/proto/
COPY ms-transactions/proto/  /ms-transactions/proto/
COPY ms-notifications/proto/ /ms-notifications/proto/

COPY api-gateway/package*.json ./
RUN npm install --omit=dev

COPY api-gateway/src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]
