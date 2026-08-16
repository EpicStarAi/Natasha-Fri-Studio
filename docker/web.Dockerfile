FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY attached_assets ./attached_assets

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/natasha-fri build

FROM nginx:1.29-alpine
COPY docker/web-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/natasha-fri/dist/public /usr/share/nginx/html

EXPOSE 80
