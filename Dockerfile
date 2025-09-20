# Use Node.js base image (Alpine for smaller size)
FROM node:22.14.0-alpine

# Install required system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Set Node.js memory limits to prevent heap out of memory
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the application code (now tsconfig.json and sources are available)
COPY . .

# Generate Prisma client before building (types needed at compile time)
ENV PRISMA_SKIP_DATABASE_URL_VALIDATION=true
RUN npx prisma generate

# Build the application (compile TypeScript)
RUN pnpm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the compiled application
CMD ["sh", "-c", "NODE_OPTIONS='--max-old-space-size=4096' pnpm start:prod"]
