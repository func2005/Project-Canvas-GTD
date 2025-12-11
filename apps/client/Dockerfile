FROM node:18-alpine AS builder

WORKDIR /app

# Copy entire monorepo (relies on .dockerignore to exclude node_modules)
COPY . .

# Install dependencies using root package-lock.json
RUN npm install

# Build the client
# Accept VITE_API_URL as a build argument
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=apps/client

# Production Stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
