# Tahap 1: Build TypeScript
FROM node:22-alpine AS builder

WORKDIR /src

COPY package.json yarn.lock ./
RUN yarn install
RUN yarn global add ts-node

COPY prisma ./prisma
COPY .env .      

RUN npx prisma generate
# RUN npx prisma db push

COPY . .

EXPOSE 9056
CMD ["ts-node", "index.ts"]
