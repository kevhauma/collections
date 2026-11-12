# Collections: one image, one /data volume. Deploy guide: docs/platform/deploy.md

# Build: install everything, build the three Vite environments, then drop dev dependencies.
FROM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 ships prebuilt binaries in its tarball; without --ignore-scripts npm 11 runs node-gyp and fails.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts

# Runtime: only what `node src/server.ts --prod` loads (server.ts runs as TypeScript via Node's type stripping).
FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/src/server.ts ./src/server.ts
COPY --from=build /app/src/lib/env.ts ./src/lib/env.ts
# Created before VOLUME so a new named volume inherits the node user's ownership.
RUN mkdir /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "src/server.ts", "--prod"]
