# Tahap 1: Build TypeScript
FROM node:22-alpine AS builder

WORKDIR /src

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Install ts-node globally
RUN yarn global add ts-node

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

EXPOSE 9056

CMD ["ts-node", "index.ts"]