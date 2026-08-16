FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/artifacts/api-server/dist ./dist

USER node
EXPOSE 5000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
