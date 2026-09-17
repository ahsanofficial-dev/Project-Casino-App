FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
RUN npm install --workspace=@casino/web --include-workspace-root

COPY apps/web apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/apps/web/next.config.js ./next.config.js
COPY --from=build /app/apps/web/public ./public

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
