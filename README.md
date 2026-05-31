# Wrkin Community Edition

Self-hosted project management with docs, tasks, chat, and calendar.

## Quick Start

1. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

2. Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
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
| `COLLAB_JWT_SECRET` | No | JWT secret for collab server |
| `HOCUSPOCUS_PORT` | No | Port for the Hocuspocus collab server |

## License

[Elastic License 2.0](./LICENSE)
