# Use official Node.js alpine image for a minimal footprint
FROM node:20-alpine AS base

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Start the bot
CMD ["node", "src/index.js"]
