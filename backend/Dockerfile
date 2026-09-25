# Contexto de build = raiz do projeto (frontend + backend numa imagem só).
# ---- frontend build ----
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

# ---- deps & build ----
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build

# ---- production runtime ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY --from=web /web/dist ./public
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3283

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
