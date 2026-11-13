# Stage 1: Build Angular application
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application source and build
COPY . .
RUN pnpm build


# Stage 2: Nginx runtime
FROM nginxinc/nginx-unprivileged:1.31-alpine3.24 AS runtime

# Copy Angular production build
COPY --from=builder /app/dist/pixora-frontend/browser/ /usr/share/nginx/html/

# Copy custom Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
