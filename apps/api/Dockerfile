FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS build
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
WORKDIR /app/apps/api
RUN pnpm exec nest build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/packages/shared ./packages/shared
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/api/dist/main.js"]
