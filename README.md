# Wrkin Community Edition

Self-hosted project management with docs, tasks, chat, and calendar.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+
- [Docker](https://www.docker.com/) (for running Postgres and S3 storage)

## Quick Start (Development)

### 1. Start infrastructure services

Start Postgres and MinIO (S3-compatible storage):

```bash
docker compose -f compose.dev.yaml up -d
```

This starts:
- **Postgres** on `localhost:5432` (user: `postgres`, password: `postgres`, db: `wrkin`)
- **MinIO** on `localhost:9000` (console: `localhost:9001`, user: `minioadmin`, password: `minioadmin`)

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` match the dev services above. Generate an auth secret:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" >> .env
```

### 3. Install dependencies and push database schema

```bash
pnpm install
pnpm db:push
```

### 4. Start the app

```bash
pnpm dev
```

The app runs at **http://localhost:5173**.

### 5. (Optional) Start the collaborative docs server

To enable real-time collaborative editing in documents:

```bash
# In a separate terminal
pnpm collab:dev
```

Uncomment the collab variables in `.env` to connect the frontend:

```
PUBLIC_COLLAB_WS_URL=ws://localhost:1234
COLLAB_JWT_SECRET=  # generate with: openssl rand -hex 32
```

## Docker (All-in-One)

Run everything — app, collab server, database, and storage — with a single command:

```bash
docker compose up -d --build
```

Set `BETTER_AUTH_SECRET` first:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" > .env
docker compose --env-file .env up -d --build
```

The app is available at **http://localhost:3000**. The collab WebSocket server runs on port `1234`.

To access from other machines on your network, use your machine's IP (e.g. `http://192.168.1.x:3000`) and set `ORIGIN` accordingly:

```bash
echo "ORIGIN=http://192.168.1.x:3000" >> .env
```

### Manage

```bash
docker compose logs -f         # view logs
docker compose restart app     # restart app
docker compose down            # stop everything
```

## Environment Variables

See [`.env.example`](./.env.example) for all available variables.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `S3_ENDPOINT` | Yes | S3-compatible storage endpoint |
| `S3_ACCESS_KEY` | Yes | S3 access key |
| `S3_SECRET_KEY` | Yes | S3 secret key |
| `S3_BUCKET` | Yes | S3 bucket name |
| `ORIGIN` | Yes | Public URL of this instance |
| `BETTER_AUTH_SECRET` | Yes | Generate with `openssl rand -hex 32` |
| `PUBLIC_COLLAB_WS_URL` | No | WebSocket URL for collaborative editing |
| `COLLAB_JWT_SECRET` | No | JWT secret for collab server (defaults to `BETTER_AUTH_SECRET`) |
| `HOCUSPOCUS_PORT` | No | Port for the collab server (default `1234`) |

## License

[Elastic License 2.0](./LICENSE)
