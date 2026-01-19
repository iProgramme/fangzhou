# Stage 1: Build Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build React frontend
RUN npm run build

# Remove node_modules to clear cache for next stage (optional but good practice)
# RUN rm -rf node_modules

# Stage 2: Production Runtime
FROM node:20-slim

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
# Convert devDependencies (like tsx) to dependencies or install all
# For simplicity in this setup, we install everything to ensure tsx works
RUN npm install

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend source code
COPY --from=builder /app/server ./server
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/styles ./styles
COPY --from=builder /app/public ./public

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
