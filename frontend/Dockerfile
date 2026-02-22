# ---------- builder ----------
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json* ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY src/ src/
COPY public/ public/
RUN npm run build

# ---------- production ----------
FROM nginx:alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
