FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
WORKDIR /build

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

COPY packages/physic/package.json   packages/physic/package.json
COPY packages/common/package.json   packages/common/package.json
COPY packages/client/package.json   packages/client/package.json
COPY packages/server/package.json   packages/server/package.json
COPY packages/vite/package.json     packages/vite/package.json
COPY packages/testing/package.json  packages/testing/package.json
COPY packages/tiledmap/package.json packages/tiledmap/package.json
COPY packages/action-battle/package.json packages/action-battle/package.json
COPY packages/studio/package.json   packages/studio/package.json
COPY packages/vue/package.json      packages/vue/package.json
COPY packages/ui-css/package.json   packages/ui-css/package.json

COPY samples/sample-dev/package.json samples/sample-dev/package.json
COPY samples/sample-tiled/package.json samples/sample-tiled/package.json
COPY samples/sample-studio/package.json samples/sample-studio/package.json

ENV NPM_AUTH_TOKEN=""
RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm build
RUN cd packages/vue && npm run build
RUN cd samples/sample-dev && RPG_TYPE=mmorpg npx vite build

# Move production artifacts to /app and remove build sources
RUN mkdir -p /app && \
    cp -r samples/sample-dev/dist /app/dist && \
    cp -r samples/sample-dev/world_data /app/world_data && \
    cp -r samples/sample-dev/node_modules /app/node_modules && \
    cp -r node_modules/.pnpm /app/node_modules/.pnpm

WORKDIR /app
RUN rm -rf /build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server/express.js"]
