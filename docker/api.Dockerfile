FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/email/package.json ./packages/email/
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=packages/email
RUN npm run build --workspace=apps/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/email ./packages/email

COPY docker/api-entrypoint.sh /app/api-entrypoint.sh
RUN chmod +x /app/api-entrypoint.sh

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["/app/api-entrypoint.sh"]
