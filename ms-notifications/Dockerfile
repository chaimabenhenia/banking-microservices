FROM node:18-alpine

# Dépendances de compilation pour better-sqlite3 (module natif)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY proto/ ./proto/
COPY src/ ./src/

EXPOSE 50053

CMD ["node", "src/index.js"]
