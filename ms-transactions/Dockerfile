FROM node:18-alpine

WORKDIR /app

# Copier le proto de ms-comptes au chemin attendu par comptes.client.js
COPY ms-comptes/proto/ /ms-comptes/proto/

COPY ms-transactions/package*.json ./
RUN npm install --omit=dev

COPY ms-transactions/proto/ ./proto/
COPY ms-transactions/src/ ./src/

EXPOSE 50052

CMD ["node", "src/index.js"]
