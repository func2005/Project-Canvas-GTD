FROM node:20-alpine

# Set timezone
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# Copy root package files
COPY package.json turbo.json ./

# Copy workspace package files (assuming they are needed for dependency resolution)
# For simplicity in this monorepo context without prune, we copy the source
COPY . .

# Install dependencies
RUN npm install

# Build server
RUN npm run build --workspace=apps/server

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "apps/server/dist/src/main"]
