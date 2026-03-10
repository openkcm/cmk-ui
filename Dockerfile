# Stage 1: Build environment
ARG NODE_VERSION=22.2.0
FROM node:${NODE_VERSION}-alpine AS build

# Pass the NPM version as a build argument from the Taskfile
ARG NPM_VERSION=10.8.0

WORKDIR /app

# Install specific NPM version via curl/npm before installing dependencies
RUN npm install -g npm@${NPM_VERSION}

# Copy dependency files first to leverage Docker layer caching
COPY package*.json ./

# Use 'npm ci' for faster, more reliable builds in CI/CD environments
RUN npm ci

# Copy the rest of the source code
COPY . .

# Generate the static assets (dist folder)
RUN npm run build

# Remove development dependencies to keep the build stage clean
RUN npm prune --production

# Stage 2: Production environment
FROM nginx:1.29.3-alpine3.22-slim AS production

# Clean default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy only the compiled assets from the build stage
# Note: Ensure your framework outputs to /app/dist (standard for Vite/Vue/React)
COPY --from=build /app/dist /usr/share/nginx/html

# Update Nginx to listen on 8080 (standard for non-root/containerized environments)
RUN sed -i 's/listen\s\+80;/listen 8080;/' /etc/nginx/conf.d/default.conf

# Expose the new port
EXPOSE 8080