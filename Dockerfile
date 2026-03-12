# Stage 1: base
FROM node:22-alpine AS base
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Stage 2: deps
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 3: build
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 4: production
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=build /app/build ./build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "build"]
