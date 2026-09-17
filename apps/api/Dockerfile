FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
RUN npm install --workspace=@casino/api --include-workspace-root

COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api
EXPOSE 3001

# Sandbox only: push schema then seed mock events, then start API
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && node dist/main.js"]
