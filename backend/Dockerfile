# Build context is the repo root (not backend/) because this is an npm
# workspaces monorepo — backend depends on @expense-tracker/shared, and
# `npm install` needs to see every workspace's package.json to link it.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

COPY packages/shared packages/shared
COPY backend backend

WORKDIR /app/backend

EXPOSE 3000

# Apply pending migrations, then start the dev server (tsx watch).
CMD ["sh", "-c", "npm run migrate:up && npm run dev"]
