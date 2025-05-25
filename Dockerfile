# 📦 Base stage: Set up Node, pnpm and workspace files
FROM node:20-alpine AS base

# Enable corepack and activate a specific pnpm version
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifest files (for install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 🔨 Build stage: Install full dependencies and build the app
FROM base AS builder

# Install all dependencies including devDependencies
RUN pnpm install --frozen-lockfile

# Copy the full source code into the container
COPY . .

# Build the application (e.g., NestJS or NextJS)
RUN pnpm build

# 🏁 Production stage: Install only production dependencies
FROM base AS production

# Install only production dependencies (no dev dependencies)
RUN pnpm install --prod --frozen-lockfile

# Copy the built application output from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port your app runs on (adjust as needed)
EXPOSE 3001

# Default command to run the application
CMD ["node", "dist/main"]
