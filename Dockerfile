# Node.js Alpine base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose default API port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/database/epia_crm.db

# Run the server
CMD ["npm", "start"]
