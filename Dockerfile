# syntax=docker/dockerfile:1.7

# Community self-hosted production image (flat-repo layout).
#
# Build:   docker build -t wrkin-community .
# Run app: docker compose up

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- deps -------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM deps AS build
ARG SITE_ORIGIN=http://localhost:3000
COPY . .
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET=00000000000000000000000000000000 \
    ORIGIN=${SITE_ORIGIN}
RUN pnpm build

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    HOCUSPOCUS_PORT=1234

RUN apk add --no-cache tini

COPY --from=deps  /app/node_modules            ./node_modules
COPY --from=build /app/build                    ./build
COPY --from=build /app/package.json             ./package.json
COPY --from=build /app/drizzle                  ./drizzle
COPY --from=build /app/collab                   ./collab
COPY --from=build /app/scripts                  ./scripts
COPY --from=build /app/src/lib/server           ./src/lib/server
COPY --from=build /app/src/lib/shared           ./src/lib/shared
# tsx-run services (collab, migrate) resolve `$lib/*` imports via this tsconfig.
COPY --from=build /app/tsconfig.docker.json     ./tsconfig.json

EXPOSE 3000 1234

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/index.js"]
