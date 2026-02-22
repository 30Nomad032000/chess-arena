# ---------- builder ----------
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

# ---------- production ----------
FROM node:20-alpine

RUN addgroup -S arena && adduser -S arena -G arena

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /build/dist dist/

RUN chown -R arena:arena /app
USER arena

EXPOSE 3001

CMD ["node", "dist/index.js"]
