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

## Docker (Production)

Run everything with a single command — app, collab server, database, storage, and HTTPS reverse proxy:

### 1. Configure

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set at minimum:
- `DOMAIN` — your domain (e.g. `wrkin.example.com`)
- `ORIGIN` — `https://<your-domain>`
- `POSTGRES_PASSWORD` — a strong password
- `MINIO_ROOT_PASSWORD` — a strong password
- `BETTER_AUTH_SECRET` — `openssl rand -hex 32`
- `COLLAB_JWT_SECRET` — `openssl rand -hex 32`
- `PUBLIC_COLLAB_WS_URL` — `wss://<your-domain>/collab`

### 2. Start

```bash
docker compose --env-file .env.production up -d --build
```

This starts:
- **Caddy** on ports 80/443 with automatic HTTPS (Let's Encrypt)
- **SvelteKit app** behind Caddy
- **Hocuspocus collab server** at `/collab`
- **Postgres** with persistent volume
- **MinIO** with persistent volume
- **One-shot migration** runner

### 3. Manage

```bash
docker compose --env-file .env.production logs -f       # view logs
docker compose --env-file .env.production restart app    # restart app
docker compose --env-file .env.production down           # stop everything
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
