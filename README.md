# Banking Microservices

Projet bancaire en **Node.js** composé de 3 microservices qui communiquent via **gRPC** et **Apache Kafka 4**, orchestrés avec **Docker**.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Comment les services se parlent](#2-comment-les-services-se-parlent)
3. [Infrastructure Docker](#3-infrastructure-docker)
4. [ms-comptes — fichier par fichier](#4-ms-comptes--fichier-par-fichier)
5. [ms-transactions — fichier par fichier](#5-ms-transactions--fichier-par-fichier)
6. [ms-notifications — fichier par fichier](#6-ms-notifications--fichier-par-fichier)
7. [Démarrage](#7-démarrage)
8. [Variables d'environnement](#8-variables-denvironnement)

---

## 1. Vue d'ensemble

```
banking-microservices/
│
├── docker-compose.yml        ← orchestre tous les conteneurs
├── .env                      ← variables d'environnement partagées
├── .dockerignore             ← fichiers exclus du build Docker
│
├── ms-comptes/               ← microservice Comptes    (port 50051)
├── ms-transactions/          ← microservice Transactions (port 50052)
├── ms-notifications/         ← microservice Notifications (port 50053)
│
└── postman/                  ← collections de tests Postman
```

### Schéma général

```
 ┌─────────────────────────────────────────────────────────────┐
 │                     Postman / Client gRPC                   │
 └────────────┬──────────────────┬───────────────┬────────────┘
              │ gRPC             │ gRPC           │ gRPC
              ▼                  ▼                ▼
     ┌─────────────┐   ┌──────────────────┐   ┌──────────────────┐
     │ ms-comptes  │◄──│ ms-transactions  │   │ ms-notifications │
     │  port 50051 │   │   port 50052     │   │   port 50053     │
     │   SQLite    │   │     RxDB         │   │    SQLite        │
     └──────┬──────┘   └────────┬─────────┘   └────────▲─────────┘
            │                   │                       │
            │   Kafka Events    │                       │
            └──────────────┬────┘                       │
                           ▼                            │
                  ┌─────────────────┐                   │
                  │  Apache Kafka 4 │ ──────────────────┘
                  │   port 9092     │   (consumer)
                  │   (KRaft mode)  │
                  └─────────────────┘
```

---

## 2. Comment les services se parlent

### Communication gRPC (appels directs)

**ms-transactions → ms-comptes**

Avant de faire un dépôt, retrait ou virement, ms-transactions a besoin de :
- Lire le solde actuel du compte → appelle `ObtenirCompte` sur ms-comptes
- Modifier le solde → appelle `MettreAJourSolde` sur ms-comptes

```
ms-transactions                          ms-comptes
      │                                       │
      │── ObtenirCompte({ id }) ─────────────►│
      │◄─ { id, titulaire, solde, ... } ──────│
      │                                       │
      │── MettreAJourSolde({ id, solde }) ───►│
      │◄─ { success: true } ──────────────────│
```

### Communication Kafka (événements asynchrones)

Quand ms-comptes fait une opération, il publie un message dans Kafka.
ms-notifications écoute ces messages et crée automatiquement une notification en base.

```
ms-comptes publie          Kafka topic              ms-notifications consomme
─────────────────          ──────────────           ────────────────────────
CreerCompte()       ──►    compte.cree          ──►  notif "Bienvenue !"
MettreAJourSolde()  ──►    compte.solde_mis_a_jour ► notif "Solde mis à jour"
SupprimerCompte()   ──►    compte.supprime      ──►  notif "Compte clôturé"

ms-transactions publie
─────────────────────
Deposer()           ──►    transaction.depot        (extensible)
Retirer()           ──►    transaction.retrait       (extensible)
Virer()             ──►    transaction.virement      (extensible)
```

### Réseau Docker interne

Dans Docker, les services ne s'appellent pas via `localhost` mais via leur **nom de conteneur** :

| Depuis          | Pour joindre    | Adresse à utiliser       |
|-----------------|-----------------|--------------------------|
| ms-transactions | ms-comptes gRPC | `ms-comptes:50051`       |
| n'importe qui   | Kafka           | `kafka:29092`            |
| Postman (hôte)  | ms-comptes gRPC | `localhost:50051`        |
| Postman (hôte)  | Kafka UI        | `http://localhost:8080`  |

---

## 3. Infrastructure Docker

### `docker-compose.yml`

Démarre tous les services dans le bon ordre :

```
kafka (KRaft, port 9092)
  └── kafka-ui (port 8080)          ← interface web pour visualiser les topics
  └── ms-comptes (port 50051)
  └── ms-notifications (port 50053)
  └── ms-transactions (port 50052)
        └── attend aussi ms-comptes
```

**Volumes persistants :**
- `kafka_data` → logs internes de Kafka
- `comptes_data` → base SQLite de ms-comptes (`/app/db/`)
- `notifications_data` → base SQLite de ms-notifications (`/app/db/`)

**Pourquoi ms-transactions a un `context: .` (racine) ?**

Le fichier `ms-transactions/src/grpc-clients/comptes.client.js` charge le fichier
`ms-comptes/proto/comptes.proto`. Ce fichier est dans un autre dossier.
Pour que Docker puisse le copier dans l'image, il faut que le contexte de build
soit la racine du projet (et non `./ms-transactions`).

### `.dockerignore`

Exclut du contexte Docker : `node_modules`, `.env`, les fichiers `.db`, les logs.
Cela évite de copier des centaines de Mo inutiles dans l'image.

---

## 4. ms-comptes — fichier par fichier

### Rôle
Gère les comptes bancaires. Expose 5 opérations gRPC. Publie des événements Kafka.
Stocke les données dans SQLite.

### Arborescence complète

```
ms-comptes/
│
├── Dockerfile                ← image Docker du service
├── package.json              ← dépendances Node.js
│
├── proto/
│   └── comptes.proto         ← contrat gRPC : définit les messages et les RPCs
│
├── db/
│   ├── schema.sql            ← définition de la table SQLite
│   └── comptes.db            ← base de données SQLite (générée au démarrage)
│
└── src/
    ├── index.js              ← point d'entrée : démarre le serveur gRPC
    ├── server.js             ← crée le serveur gRPC et enregistre le service
    │
    ├── db/
    │   └── database.js       ← ouvre la connexion SQLite, exécute le schema
    │
    ├── kafka/
    │   └── producer.js       ← connexion à Kafka, fonction publish()
    │
    └── services/
        └── comptes.service.js ← logique métier des 5 RPCs
```

### Liaisons entre fichiers

```
index.js
  ├── importe server.js          → pour créer et démarrer le serveur gRPC
  └── importe kafka/producer.js  → pour couper la connexion Kafka à l'arrêt (SIGINT)

server.js
  ├── lit proto/comptes.proto    → pour connaître les messages et méthodes gRPC
  └── importe services/comptes.service.js → pour brancher les fonctions aux RPCs

services/comptes.service.js
  ├── importe db/database.js     → pour lire/écrire dans SQLite
  └── importe kafka/producer.js  → pour publier un événement après chaque opération

db/database.js
  └── lit db/schema.sql          → pour créer la table si elle n'existe pas

kafka/producer.js
  └── lit KAFKA_BROKER (env)     → adresse du broker Kafka
```

### Explication de chaque fichier

**`proto/comptes.proto`**
Fichier de contrat écrit en Protobuf. Il définit :
- Les 5 RPCs disponibles : `CreerCompte`, `ObtenirCompte`, `ListerComptes`, `MettreAJourSolde`, `SupprimerCompte`
- Les messages de requête et réponse pour chaque RPC
- Ce fichier est lu par `server.js` au démarrage pour configurer le serveur gRPC
- Il est aussi copié dans l'image Docker de ms-transactions pour que ce service puisse appeler ms-comptes

**`db/schema.sql`**
```sql
CREATE TABLE IF NOT EXISTS comptes (
  id         TEXT PRIMARY KEY,
  titulaire  TEXT NOT NULL,
  solde      REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```
Exécuté une seule fois au démarrage par `db/database.js`.

**`db/database.js`**
Ouvre la base SQLite, active le mode WAL (écritures plus rapides),
puis exécute `schema.sql`. Exporte l'objet `db` utilisé dans `comptes.service.js`.

**`kafka/producer.js`**
Crée un producer KafkaJS. La connexion est lazy (ne se connecte que lors du premier `publish()`).
Exporte `publish(topic, message)` et `disconnect()`.

**`services/comptes.service.js`**
Contient les 5 fonctions gRPC. Chaque fonction :
1. Lit les données de `call.request`
2. Exécute une requête SQL via `db`
3. Publie un événement Kafka (`.catch(() => {})` pour ne pas bloquer si Kafka est down)
4. Appelle `callback(null, result)` pour répondre au client

**`server.js`**
Charge le proto avec `@grpc/proto-loader`, crée un `grpc.Server`,
associe chaque RPC à sa fonction dans `comptes.service.js`, retourne `{ server, port }`.

**`index.js`**
Point d'entrée. Reçoit `{ server, port }` de `server.js`, bind le serveur sur `0.0.0.0:50051`,
gère l'arrêt propre avec `SIGINT`.

---

## 5. ms-transactions — fichier par fichier

### Rôle
Traite les opérations financières (dépôt, retrait, virement).
Appelle ms-comptes via gRPC pour lire/modifier les soldes.
Stocke les transactions dans RxDB (in-memory).
Publie des événements Kafka.

### Arborescence complète

```
ms-transactions/
│
├── Dockerfile                ← context racine (accès à ms-comptes/proto/)
├── package.json
│
├── proto/
│   └── transactions.proto    ← contrat gRPC : 4 RPCs
│
└── src/
    ├── index.js              ← point d'entrée : init RxDB PUIS démarre gRPC
    ├── server.js             ← crée le serveur gRPC
    │
    ├── db/
    │   └── database.js       ← initialise la base RxDB in-memory + schema
    │
    ├── kafka/
    │   └── producer.js       ← même pattern que ms-comptes
    │
    ├── grpc-clients/
    │   └── comptes.client.js ← client gRPC qui appelle ms-comptes
    │
    └── services/
        └── transactions.service.js ← logique métier des 4 RPCs
```

### Liaisons entre fichiers

```
index.js
  ├── importe db/database.js         → attend initDatabase() avant tout
  ├── importe server.js              → crée le serveur gRPC après l'init DB
  └── importe kafka/producer.js      → disconnect() à l'arrêt

server.js
  ├── lit proto/transactions.proto   → configure le serveur gRPC
  └── importe services/transactions.service.js

services/transactions.service.js
  ├── importe db/database.js         → getCollection() pour lire/écrire RxDB
  ├── importe kafka/producer.js      → publie après chaque transaction
  └── importe grpc-clients/comptes.client.js → appelle ms-comptes

grpc-clients/comptes.client.js
  ├── lit ms-comptes/proto/comptes.proto  → pour construire le client gRPC
  ├── lit GRPC_HOST_COMPTES (env)         → hôte de ms-comptes (localhost ou ms-comptes dans Docker)
  └── lit GRPC_PORT_COMPTES (env)         → port de ms-comptes (50051)
```

### Explication de chaque fichier

**`proto/transactions.proto`**
Définit 4 RPCs : `Deposer`, `Retirer`, `Virer`, `ObtenirHistorique`.
Et le message `TransactionResponse` commun à toutes les réponses.

**`db/database.js`**
Initialise une base RxDB avec le storage **in-memory** (les données sont perdues au redémarrage).
Définit le schéma d'une transaction : `id`, `type`, `montant`, `compte_source`,
`compte_destination`, `description`, `date`, `succes`, `message_erreur`.
Exporte `initDatabase()` (async, appelée dans `index.js`) et `getCollection()`.

**Pourquoi RxDB et pas SQLite ?**
ms-transactions utilise RxDB (base réactive) pour démontrer une technologie différente
dans un contexte microservices. SQLite aurait aussi fonctionné.

**`grpc-clients/comptes.client.js`**
Crée un **client gRPC** qui se connecte à ms-comptes.
Exporte deux fonctions sous forme de Promises :
- `obtenirCompte(id)` → lit le solde actuel
- `mettreAJourSolde(id, solde)` → écrit le nouveau solde

La variable `GRPC_HOST_COMPTES` vaut `localhost` en local et `ms-comptes` dans Docker.

**`services/transactions.service.js`**

| Fonction | Ce qu'elle fait |
|----------|----------------|
| `deposer` | Lit le solde via ms-comptes → ajoute le montant → sauvegarde dans RxDB → Kafka |
| `retirer` | Vérifie le solde → si insuffisant : enregistre avec `succes:false` → sinon déduit → RxDB → Kafka |
| `virer` | Charge les 2 comptes en parallèle → vérifie solde source → met à jour les 2 soldes en parallèle → RxDB → Kafka |
| `obtenirHistorique` | Requête RxDB : transactions où le compte est source OU destination, triées par date |

**`index.js`**
L'ordre d'initialisation est important :
```
1. await initDatabase()   → RxDB doit être prêt avant les RPCs
2. createServer()          → crée le serveur gRPC
3. server.bindAsync()      → démarre l'écoute sur le port
```

---

## 6. ms-notifications — fichier par fichier

### Rôle
Génère automatiquement des notifications en écoutant Kafka.
Expose 3 RPCs gRPC pour consulter ces notifications.
Stocke tout dans SQLite.

### Arborescence complète

```
ms-notifications/
│
├── Dockerfile
├── package.json
│
├── proto/
│   └── notifications.proto   ← contrat gRPC : 3 RPCs
│
├── db/
│   ├── schema.sql            ← définition de la table notifications
│   └── notifications.db      ← base SQLite (générée au démarrage)
│
└── src/
    ├── index.js              ← point d'entrée : démarre gRPC PUIS Kafka consumer
    ├── server.js             ← crée le serveur gRPC
    │
    ├── db/
    │   └── database.js       ← ouvre SQLite, exécute le schema
    │
    ├── kafka/
    │   └── consumer.js       ← s'abonne aux topics, crée les notifications
    │
    └── services/
        └── notifications.service.js ← logique métier des 3 RPCs
```

### Liaisons entre fichiers

```
index.js
  ├── importe server.js             → démarre le serveur gRPC
  └── importe kafka/consumer.js     → startConsumer() après que gRPC soit prêt
                                       stopConsumer() à l'arrêt (SIGINT)

server.js
  ├── lit proto/notifications.proto → configure le serveur gRPC
  └── importe services/notifications.service.js

kafka/consumer.js
  └── importe db/database.js        → insère directement en SQLite à chaque message reçu

services/notifications.service.js
  └── importe db/database.js        → lit SQLite pour répondre aux RPCs gRPC
```

### Explication de chaque fichier

**`proto/notifications.proto`**
Définit 3 RPCs :
- `ObtenirNotifications(compte_id)` → liste toutes les notifs d'un compte
- `MarquerCommeLue(notif_id)` → passe `lue = true`
- `CompterNonLues(compte_id)` → retourne un entier

**`db/schema.sql`**
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  compte_id  TEXT NOT NULL,
  type       TEXT NOT NULL,     -- CREATION | MISE_A_JOUR_SOLDE | SUPPRESSION | TRANSACTION
  titre      TEXT NOT NULL,
  message    TEXT NOT NULL,
  lue        INTEGER NOT NULL DEFAULT 0,   -- 0 = non lue, 1 = lue
  created_at TEXT NOT NULL
);
```

**`kafka/consumer.js`**
C'est le cœur de ms-notifications. Il :
1. Se connecte à Kafka avec le groupe `ms-notifications-group`
2. S'abonne à 4 topics : `compte.cree`, `compte.solde_mis_a_jour`, `compte.supprime`, `transaction.effectuee`
3. Pour chaque message reçu → construit une notification avec `buildNotification(topic, data)`
4. Insère directement en SQLite

| Topic reçu                  | Notification générée              |
|-----------------------------|------------------------------------|
| `compte.cree`               | "Bienvenue ! Votre compte a été ouvert..." |
| `compte.solde_mis_a_jour`   | "Votre nouveau solde est de X €"   |
| `compte.supprime`           | "Votre compte a été clôturé"       |
| `transaction.effectuee`     | "Une transaction de type X..."     |

**`services/notifications.service.js`**
Trois fonctions simples qui lisent SQLite :
- `obtenirNotifications` → `SELECT * WHERE compte_id = ?`
- `marquerCommeLue` → `UPDATE SET lue = 1 WHERE id = ?`
- `compterNonLues` → `SELECT COUNT(*) WHERE compte_id = ? AND lue = 0`

**`index.js`**
L'ordre est important :
```
1. createServer() + server.bindAsync()  → gRPC prêt à recevoir des requêtes
2. await startConsumer()                → Kafka consumer démarre DANS le callback de bindAsync
```
Le consumer démarre après gRPC pour éviter de traiter des messages avant que le serveur soit prêt.

---

## 7. Démarrage

### En local (sans Docker)

```bash
# Terminal 1 — Kafka seulement
docker-compose up kafka -d

# Terminal 2
cd ms-comptes && npm install && npm run dev

# Terminal 3
cd ms-transactions && npm install && npm run dev

# Terminal 4
cd ms-notifications && npm install && npm run dev
```

### Avec Docker (tout en un)

```bash
# Premier lancement (build des images)
docker-compose up --build

# Relancer sans rebuild
docker-compose up

# Arrêter tout
docker-compose down

# Arrêter et supprimer les volumes (repart de zéro)
docker-compose down -v
```

### Vérifier que tout fonctionne

```bash
docker-compose ps
```

```
banking-kafka              running (healthy)
banking-kafka-ui           running   → http://localhost:8080
banking-ms-comptes         running   → grpc://localhost:50051
banking-ms-transactions    running   → grpc://localhost:50052
banking-ms-notifications   running   → grpc://localhost:50053
```

---

## 8. Variables d'environnement

Fichier `.env` (utilisé en local) :

```env
KAFKA_BROKER=localhost:9092

GRPC_PORT_COMPTES=50051
GRPC_PORT_TRANSACTIONS=50052
GRPC_PORT_NOTIFICATIONS=50053

GATEWAY_PORT=3000
```

Variables injectées par `docker-compose.yml` dans chaque conteneur :

| Variable           | Valeur Docker      | Utilisée par                          |
|--------------------|--------------------|---------------------------------------|
| `KAFKA_BROKER`     | `kafka:29092`      | tous les services                     |
| `GRPC_HOST_COMPTES`| `ms-comptes`       | ms-transactions (client gRPC comptes) |
| `GRPC_PORT_COMPTES`| `50051`            | ms-transactions                       |

> **Pourquoi `kafka:29092` dans Docker et `localhost:9092` en local ?**
> Kafka expose deux listeners : un interne (`kafka:29092`) pour les communications
> entre conteneurs, et un externe (`localhost:9092`) pour les connexions depuis l'hôte (Postman, terminal).
