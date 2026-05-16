# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npx tsc

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mythical -u 1001 -G nodejs

# Copy built assets and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy frontend static files
COPY index.html ./
COPY index.tsx ./

# Set ownership to non-root user
RUN chown -R mythical:nodejs /app

USER mythical

EXPOSE 3000

# Start the server
CMD ["node", "dist/backend/server.js"]
