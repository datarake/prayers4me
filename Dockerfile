# Stillflame API. Build from the repository root:  docker build -t stillflame-api .
# One image serves the API (default command) and runs migrations (see docs/deployment.md).

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@prayers4me/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @prayers4me/shared build && pnpm --filter @prayers4me/api build

FROM node:22-slim
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter "@prayers4me/api..."
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY infra/sql infra/sql
USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
