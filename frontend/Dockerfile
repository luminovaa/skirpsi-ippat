FROM node:22-alpine AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN yarn install && yarn build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 4050

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 4050

CMD ["yarn", "start"]