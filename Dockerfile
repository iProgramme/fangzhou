# Stage 1: Build Frontend
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build React frontend
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-slim

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend source code
COPY --from=builder /app/server ./server
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/styles ./styles
COPY --from=builder /app/seed.ts ./
COPY --from=builder /app/types.ts ./
COPY --from=builder /app/services ./services

# Expose the port
EXPOSE 3001

# Create volumes for persistence
VOLUME ["/app/data", "/app/uploads"]

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/app/data/local.db

# Start the server
CMD ["npx", "tsx", "server/index.ts"]