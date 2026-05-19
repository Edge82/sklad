# ========== STAGE 1: Build frontend ==========
FROM node:22-alpine AS build-frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build-only

# ========== STAGE 2: Backend image ==========
FROM node:22-alpine AS backend

WORKDIR /app

# Утилиты
RUN apk add --no-cache curl

# Копируем backend
COPY server.js ./
COPY server/ ./server/

# Production-зависимости
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Директория данных
RUN mkdir -p .data

COPY .env.example .env

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/sklad/api/health || exit 1

VOLUME [ "/app/.data" ]

CMD ["node", "server.js"]

# ========== STAGE 3: Nginx с фронтендом ==========
FROM nginx:alpine AS frontend

COPY --from=build-frontend /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
