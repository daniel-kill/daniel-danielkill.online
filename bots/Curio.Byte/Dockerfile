FROM node:22-alpine

WORKDIR /usr/src/app

# Install build dependencies for native modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

CMD ["node", "src/index.js"]
