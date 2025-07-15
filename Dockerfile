# 📦 Base stage: Set up Node, pnpm and workspace files
FROM node:20-alpine AS base

# Enable corepack and activate a specific pnpm version
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifest files (for install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 🔨 Build stage
FROM base AS builder

# Install all dependencies including devDependencies
RUN pnpm install --frozen-lockfile

# Copy the full source code into the container
COPY . .

# Build the application
RUN pnpm build

# # Remove devDependencies
# RUN pnpm prune --prod

# 🏁 Production stage
FROM base AS production

COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose your app port
EXPOSE 3001

# Default command to run the application
CMD ["node", "dist/main"]
